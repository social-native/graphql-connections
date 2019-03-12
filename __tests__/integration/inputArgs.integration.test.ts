import knex from 'knex';
import {ConnectionManager} from '../../src';
import {IUserNode, IUserCursorArgs, IUserFilterArgs, KnexQueryResult} from '../types';
import {rejectionOf, validateFieldIsOrderedAlphabetically} from '../utils';

const knexClient = knex({
    client: 'sqlite3',
    connection: {
        filename: './db/test.sqlite3'
    }
});

const attributeMap = {
    id: 'id',
    username: 'username',
    firstname: 'firstname',
    age: 'age',
    haircolor: 'haircolor',
    lastname: 'lastname',
    bio: 'bio'
};

const createConnection = async (cursorArgs: IUserCursorArgs, filterArgs: IUserFilterArgs) => {
    const queryBuilder = knexClient.queryBuilder().from('mock');

    const connection = new ConnectionManager<IUserNode, IUserCursorArgs, IUserFilterArgs>(
        cursorArgs,
        filterArgs,
        attributeMap
    );
    connection.createQuery(queryBuilder);
    const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
    const pageInfo = connection.createPageInfo(result);
    const edges = connection.createEdges(result);
    return {pageInfo, edges};
};

describe('Input args with', () => {
    describe('OrderBy', () => {
        it('Can order results by a given field', async () => {
            const cursorArgs = {first: 200, orderBy: 'firstname'};
            const filterArgs = [{field: 'haircolor', operator: '=', value: 'gray'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

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
    describe('Page size', () => {
        it('Can be set to get the first 10 edges', async () => {
            const cursorArgs = {first: 10};
            const filterArgs = [] as Array<{}>;
            const {pageInfo, edges} = await createConnection(
                cursorArgs,
                (filterArgs as any) as IUserFilterArgs
            );

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(10);
            expect(edges[0].node.id).toBe(1); // first item
        });

        it('Can be set to get the last 100 edges', async () => {
            const cursorArgs = {last: 100};
            const filterArgs = [] as Array<{}>;
            const {pageInfo, edges} = await createConnection(
                cursorArgs,
                (filterArgs as any) as IUserFilterArgs
            );

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(100);
            expect(edges[0].node.id).toBe(10000); // last item
        });

        it('Cant work with both first and last size args', async () => {
            const cursorArgs = {first: 10, last: 87};
            const filterArgs = [] as Array<{}>;

            const e = await rejectionOf(
                createConnection(cursorArgs, (filterArgs as any) as IUserFilterArgs)
            );
            expect(e.message).toEqual('Can not mix `first` and `last`');
        });

        it("Can handle cases where page size doesn't make sense", async () => {
            const cursorArgs = {first: 0};
            const filterArgs = [] as Array<{}>;

            const e = await rejectionOf(
                createConnection(cursorArgs, (filterArgs as any) as IUserFilterArgs)
            );
            expect(e.message).toEqual('Page size must be greater than 0');
        });
    });

    describe('Single Filters', () => {
        it('Can filter for equality', async () => {
            const cursorArgs = {};
            const filterArgs = [{field: 'haircolor', operator: '=', value: 'red'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(500); // 500 people have red hair. See db/seeds/README.md
            expect(edges[0].node.id).toBe(8761); // first person with red hair in the db
        });

        it('Can filter for "greater than" range', async () => {
            const cursorArgs = {};
            const filterArgs = [{field: 'age', operator: '>', value: '100'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are older than 100. See db/seeds/README.md
            expect(edges[0].node.id).toBe(5185); // first person older than 100 (age 110) in the db
        });

        it('Can filter for "less than" range', async () => {
            const cursorArgs = {};
            const filterArgs = [{field: 'age', operator: '<', value: '30'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are younger than 30. See db/seeds/README.md
            expect(edges[0].node.id).toBe(1); // first person younger than 30 (age 20) in the db
        });

        it('Can filter for "greater than inclusive" range', async () => {
            const cursorArgs = {};
            const filterArgs = [{field: 'age', operator: '>=', value: '100'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 2000 people are age 100 or older. See db/seeds/README.md
            expect(edges[0].node.id).toBe(4609);
        });

        it('Can filter for "less than inclusive" range', async () => {
            const cursorArgs = {};
            const filterArgs = [{field: 'age', operator: '<=', value: '30'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(1000); // 1000 people are age 20 or 30. See db/seeds/README.md
            expect(edges[0].node.id).toBe(1);
        });
    });

    describe('Multiple filters', () => {
        it('Can filter for age, hair and first name', async () => {
            // 8 people `age` N have brown `hair` and the `first name` Nerissa (80 people total across all `ages`)
            // Thus, there will be 24 people that match this query.
            // See db/seeds/README.md case B for more info.
            const cursorArgs = {};
            const filterArgs = [
                {field: 'haircolor', operator: '=', value: 'brown'},
                {field: 'age', operator: '>', value: '80'},
                {field: 'firstname', operator: '=', value: 'Nerissa'}
            ];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

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
            const cursorArgs = {};
            const filterArgs = [
                {field: 'haircolor', operator: '=', value: 'brown'},
                {field: 'age', operator: '<=', value: '80'},
                {field: 'firstname', operator: '=', value: 'Kenyon'},
                {field: 'lastname', operator: '=', value: 'Summa'}
            ];

            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(7);
            expect(edges[0].node.id).toBe(9591);
        });
    });

    describe('Filters, page size, orderBy', () => {
        it('Can get the last 100 people with gray hair', async () => {
            const cursorArgs = {last: 98, orderBy: 'lastname'};
            const filterArgs = [{field: 'haircolor', operator: '=', value: 'gray'}];
            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);

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
            const cursorArgs = {last: 98};
            const filterArgs = [
                {field: 'haircolor', operator: '=', value: 'gray'},
                {field: 'age', operator: '>', value: '120'}
            ];

            const {pageInfo, edges} = await createConnection(cursorArgs, filterArgs as any);
            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(0);
        });
    });
});
