import knex from 'knex';
import {ConnectionManager, IInputArgs} from '../../src';
import {IUserNode, KnexQueryResult} from '../types';
import {rejectionOf, validateFieldIsOrderedAlphabetically} from '../utils';
import {test as testConfig} from '../../knexfile.sqlite';
const knexClient = knex(testConfig);

const attributeMap = {
    id: 'id',
    username: 'username',
    firstname: 'firstname',
    age: 'age',
    haircolor: 'haircolor',
    lastname: 'lastname',
    bio: 'bio'
};

const createConnection = async (inputArgs: IInputArgs) => {
    const queryBuilder = knexClient.queryBuilder().from('mock');
    const connection = new ConnectionManager<IUserNode>(inputArgs, attributeMap);
    connection.createQuery(queryBuilder);
    const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
    connection.addResult(result);
    const pageInfo = connection.pageInfo;
    const edges = connection.edges;
    return {pageInfo, edges};
};

describe('Input args with', () => {
    describe('OrderBy', () => {
        it('Can order results by a given field', async () => {
            const page = {first: 200};
            const order = {orderBy: 'firstname'};
            const filter = {field: 'haircolor', operator: '=', value: 'gray'};
            const {pageInfo, edges} = await createConnection({...page, ...order, filter});

            expect(pageInfo.hasNextPage).toBe(false); // there are 100 people with gray hair
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(100); // 100 people have gray hair. See db/seeds/README.md
            expect(
                validateFieldIsOrderedAlphabetically(
                    (edges as any) as Array<{node: {[field: string]: string}}>,
                    'firstname',
                    (first, second) => first <= second
                )
            ).toBe(true);
        });
    });
    describe('OrderDir', () => {
        it('Can set the order direction for the results', async () => {
            const filter = {field: 'haircolor', operator: '=', value: 'gray'};
            const {pageInfo, edges} = await createConnection({
                first: 200,
                orderDir: 'desc',
                orderBy: 'firstname',
                filter
            });

            expect(pageInfo.hasNextPage).toBe(false); // there are 100 people with gray hair
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(100); // 100 people have gray hair. See db/seeds/README.md
            expect(
                validateFieldIsOrderedAlphabetically(
                    (edges as any) as Array<{node: {[field: string]: string}}>,
                    'firstname',
                    (first, second) => first >= second
                )
            ).toBe(true);
        });
        it('Can set the order direction and paginate the results', async () => {
            const filter = {field: 'haircolor', operator: '=', value: 'gray'};
            const {
                pageInfo: {endCursor}
            } = await createConnection({
                first: 10,
                orderDir: 'desc',
                orderBy: 'firstname',
                filter
            });

            const {pageInfo, edges} = await createConnection({after: endCursor});

            expect(pageInfo.hasNextPage).toBe(false); // there are 100 people with gray hair
            expect(pageInfo.hasPreviousPage).toBe(true);
            expect(edges.length).toBe(90); // 100 people have gray hair. See db/seeds/README.md
            expect(
                validateFieldIsOrderedAlphabetically(
                    (edges as any) as Array<{node: {[field: string]: string}}>,
                    'firstname',
                    (first, second) => first >= second
                )
            ).toBe(true);
        });
        it('Can set the order direction and paginate the results and then paginate backwards', async () => {
            const filter = {field: 'haircolor', operator: '=', value: 'gray'};
            const {
                pageInfo: {endCursor}
            } = await createConnection({
                first: 10,
                orderDir: 'desc',
                orderBy: 'firstname',
                filter
            });

            const {
                pageInfo: {endCursor: nextCursor}
            } = await createConnection({first: 20, after: endCursor});
            const {pageInfo, edges} = await createConnection({before: nextCursor});

            expect(pageInfo.hasNextPage).toBe(false); // there are 100 people with gray hair
            expect(pageInfo.hasPreviousPage).toBe(true);
            expect(edges.length).toBe(29); // 100 people have gray hair. See db/seeds/README.md
            expect(
                validateFieldIsOrderedAlphabetically(
                    (edges as any) as Array<{node: {[field: string]: string}}>,
                    'firstname',
                    (first, second) => first >= second
                )
            ).toBe(true);
        });
    });
    describe('Page size', () => {
        it('Can be set to get the first 10 edges', async () => {
            const page = {first: 10};
            const {pageInfo, edges} = await createConnection({...page});

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(10);
            expect(edges[0].node.id).toBe(1); // first item
        });

        it('Can be set to get the last 100 edges', async () => {
            const {pageInfo, edges} = await createConnection({first: 100, orderDir: 'desc'});

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(100);
            expect(edges.slice(-1)[0].node.id).toBe(9901); // last item
        });

        it('Cant work with both first and last size args', async () => {
            const page = {first: 10, last: 87};

            const e = await rejectionOf(createConnection({...page}));
            expect(e.message).toEqual('Can not mix `first` and `last`');
        });

        it("Can handle cases where page size doesn't make sense", async () => {
            const page = {first: 0};

            const e = await rejectionOf(createConnection({...page}));
            expect(e.message).toEqual('Page size must be greater than 0');
        });
    });

    describe('Single Filters', () => {
        it('Can filter for equality', async () => {
            const filter = {field: 'haircolor', operator: '=', value: 'red'};
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(500); // 500 people have red hair. See db/seeds/README.md
            expect(edges[0].node.id).toBe(8761); // first person with red hair in the db
        });

        it('Can filter for "not equal"', async () => {
            // filter out everyone by those who are age 110
            const filter = {
                and: [
                    {field: 'age', operator: '<>', value: '10'},
                    {field: 'age', operator: '<>', value: '20'},
                    {field: 'age', operator: '<>', value: '30'},
                    {field: 'age', operator: '<>', value: '40'},
                    {field: 'age', operator: '<>', value: '50'},
                    {field: 'age', operator: '<>', value: '60'},
                    {field: 'age', operator: '<>', value: '70'},
                    {field: 'age', operator: '<>', value: '80'},
                    {field: 'age', operator: '<>', value: '90'},
                    {field: 'age', operator: '<>', value: '100'}
                ]
            };
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are older than 100. See db/seeds/README.md
            expect(edges[0].node.id).toBe(5185); // first person older than 100 (age 110) in the db
        });

        it('Can filter for "greater than" range', async () => {
            const filter = {field: 'age', operator: '>', value: '100'};
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are older than 100. See db/seeds/README.md
            expect(edges[0].node.id).toBe(5185); // first person older than 100 (age 110) in the db
        });

        it('Can filter for "less than" range', async () => {
            const filter = {field: 'age', operator: '<', value: '30'};
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are younger than 30. See db/seeds/README.md
            expect(edges[0].node.id).toBe(1); // first person younger than 30 (age 20) in the db
        });

        it('Can filter for "greater than inclusive" range', async () => {
            const filter = {field: 'age', operator: '>=', value: '100'};
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 2000 people are age 100 or older. See db/seeds/README.md
            expect(edges[0].node.id).toBe(4609);
        });

        it('Can filter for "less than inclusive" range', async () => {
            const filter = {field: 'age', operator: '<=', value: '30'};
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are age 20 or 30. See db/seeds/README.md
            expect(edges[0].node.id).toBe(1);
        });
    });

    describe('Multiple `and` filters', () => {
        it('Can filter for age, hair and first name', async () => {
            // 8 people `age` N have brown `hair` and the `first name` Nerissa (80 people total across all `ages`)
            // Thus, there will be 24 people that match this query.
            // See db/seeds/README.md case B for more info.
            const filter = {
                and: [
                    {field: 'haircolor', operator: '=', value: 'brown'},
                    {field: 'age', operator: '>', value: '80'},
                    {field: 'firstname', operator: '=', value: 'Nerissa'}
                ]
            };
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(24);
            expect(edges[0].node.id).toBe(9567);
        });

        it('Can filter for age, hair, first name and last name', async () => {
            // 1 person `age` N has brown `hair`, the `first name` Kenyon and the `last name` Summa
            // (10 people total across all `ages`)
            // Thus, there will be 7 people that match this query.
            // See db/seeds/README.md case B for more info.
            const filter = {
                and: [
                    {field: 'haircolor', operator: '=', value: 'brown'},
                    {field: 'age', operator: '<=', value: '80'},
                    {field: 'firstname', operator: '=', value: 'Kenyon'},
                    {field: 'lastname', operator: '=', value: 'Summa'}
                ]
            };

            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(7);
            expect(edges[0].node.id).toBe(9591);
        });
    });

    describe('Multiple `or` filters', () => {
        it('Can filter for hair and first name', async () => {
            const filter = {
                or: [
                    {field: 'haircolor', operator: '=', value: 'gray'},
                    {field: 'firstname', operator: '=', value: 'Nerissa'}
                ]
            };
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(180);
            expect(edges[0].node.id).toBe(9261);
        });
    });

    describe('Multiple `not` filters', () => {
        it('Can filter for hair and first name', async () => {
            // The only haircolors left after filtering these out are 400 `null` and 100 `gray`
            const filter = {
                not: [
                    {field: 'haircolor', operator: '=', value: 'brown'},
                    {field: 'haircolor', operator: '=', value: 'black'},
                    {field: 'haircolor', operator: '=', value: 'blonde'},
                    {field: 'haircolor', operator: '=', value: 'red'}
                ]
            };
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(500);
            expect(edges[0].node.id).toBe(9261);
        });
    });

    describe('Compound filters', () => {
        it('`Or` filters with nested `and` and `not` filters', async () => {
            const filter = {
                or: [
                    {field: 'age', value: '41', operator: '='},
                    {field: 'age', value: '31', operator: '='},
                    {
                        and: [
                            {field: 'haircolor', value: 'gray', operator: '='},
                            {field: 'age', value: '70', operator: '>'},
                            {
                                not: [{field: 'age', value: '80', operator: '>'}]
                            }
                        ]
                    }
                ]
            };
            const {pageInfo, edges} = await createConnection({filter});

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(10);
            expect(edges[0].node.id).toBe(9321);
        });
    });

    describe('Filters, page size, orderBy', () => {
        it('Can get the last 100 people with gray hair', async () => {
            const filter = {field: 'haircolor', operator: '=', value: 'gray'};
            const {pageInfo, edges} = await createConnection({
                filter,
                first: 98,
                orderBy: 'lastname',
                orderDir: 'desc'
            });

            expect(pageInfo.hasNextPage).toBe(true); // there are 100 people with gray hair
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(98); // 100 people have gray hair. See db/seeds/README.md
            expect(
                validateFieldIsOrderedAlphabetically(
                    (edges as any) as Array<{node: {[field: string]: string}}>,
                    'lastname',
                    (first, second) => first >= second
                )
            ).toBe(true);
        });
    });

    describe('Filters that return no results', () => {
        it('Can be handled properly', async () => {
            const filter = {
                and: [
                    {field: 'haircolor', operator: '=', value: 'gray'},
                    {field: 'age', operator: '>', value: '120'}
                ]
            };

            const {pageInfo, edges} = await createConnection({filter, first: 98, orderDir: 'desc'});
            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(0);
        });
    });
});
