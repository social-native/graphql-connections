import knex from 'knex';
import {ConnectionManager, IInputArgs} from '../../src';
import {IUserNode, KnexQueryResult} from '../types';
import {validateNodesHaveAttributes, validateFieldIsOrderedAlphabetically} from '../utils';
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

describe('Cursor from', () => {
    describe('Ascending initial query', () => {
        describe('Using page size and filter query', () => {
            let lastCursor: string;

            it('Can be used to forward paginate to end of results, using different page sizes', async () => {
                // 1200 people match this query

                // PAGE 1
                const pageOnePageArgs = {first: 600};
                const pageOneOrderArgs = {orderBy: 'lastname'};

                const pageOneFilterArgs = {
                    and: [
                        {field: 'haircolor', operator: '=', value: 'brown'},
                        {field: 'age', operator: '<=', value: '30'}
                    ]
                };
                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection({
                    ...pageOnePageArgs,
                    ...pageOneOrderArgs,
                    filter: pageOneFilterArgs
                });

                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(false);
                expect(pageOneEdges.length).toBe(600);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first <= second
                    )
                ).toBe(true);

                // PAGE 2
                const pageTwoPageArgs = {first: 300};
                const pageTwoCursorArgs = {after: pageOneEdges.slice(-1)[0].cursor};

                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection({
                    ...pageTwoPageArgs,
                    ...pageTwoCursorArgs
                });

                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(300);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageTwoEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first <= second
                    )
                ).toBe(true);

                // PAGE 3
                const pageThreePageArgs = {first: 500};
                const pageThreeCursorArgs = {after: pageTwoEdges.slice(-1)[0].cursor};

                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    {
                        ...pageThreePageArgs,
                        ...pageThreeCursorArgs
                    }
                );

                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                expect(pageThreeEdges.length).toBe(300);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageThreeEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first <= second
                    )
                ).toBe(true);

                lastCursor = pageThreeEdges.slice(-1)[0].cursor;
            });

            it('Can be used to reverse paginate, using different page sizes', async () => {
                // PAGE 1
                const pageOnePageArgs = {last: 600};
                const pageOneCursorArgs = {before: lastCursor};

                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection({
                    ...pageOnePageArgs,
                    ...pageOneCursorArgs
                });

                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(true);
                expect(pageOneEdges.length).toBe(600);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first <= second
                    )
                ).toBe(true);

                // PAGE 2
                const pageTwoPageArgs = {last: 100};
                const pageTwoCursorArgs = {before: pageOneEdges[0].cursor};

                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection({
                    ...pageTwoPageArgs,
                    ...pageTwoCursorArgs
                });

                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(100);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageTwoEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first <= second
                    )
                ).toBe(true);

                // PAGE 3
                const pageThreePageArgs = {last: 600};
                const pageThreeCursorArgs = {before: pageTwoEdges[0].cursor};

                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    {
                        ...pageThreePageArgs,
                        ...pageThreeCursorArgs
                    }
                );

                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                // we lose one result b/c we are paginating away from the last item
                expect(pageThreeEdges.length).toBe(499);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageTwoEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first <= second
                    )
                ).toBe(true);
            });
        });
    });
    describe('Descending initial query', () => {
        describe('Using page size and filter query', () => {
            let lastCursor: string;
            it('Can be used to forward paginate to end of results, using different page sizes', async () => {
                // 1200 people match this query
                // PAGE 1
                const pageOnePageArgs = {first: 500};
                const pageOneOrderArgs = {orderBy: 'lastname'};

                const pageOneFilterArgs = {
                    and: [
                        {field: 'haircolor', operator: '=', value: 'brown'},
                        {field: 'age', operator: '<=', value: '30'}
                    ]
                };
                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection({
                    ...pageOnePageArgs,
                    ...pageOneOrderArgs,
                    orderDir: 'desc',
                    filter: pageOneFilterArgs
                });

                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(false);
                expect(pageOneEdges.length).toBe(500);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first >= second
                    )
                ).toBe(true);

                // PAGE 2
                const pageTwoPageArgs = {first: 400};
                const pageTwoCursorArgs = {after: pageOneEdges.slice(-1)[0].cursor};

                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection({
                    ...pageTwoPageArgs,
                    ...pageTwoCursorArgs
                });

                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(400);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first >= second
                    )
                ).toBe(true);

                // PAGE 3
                const pageThreePageArgs = {first: 300};
                const pageThreeCursorArgs = {after: pageTwoEdges.slice(-1)[0].cursor};

                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    {
                        ...pageThreePageArgs,
                        ...pageThreeCursorArgs
                    }
                );

                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                expect(pageThreeEdges.length).toBe(300);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first >= second
                    )
                ).toBe(true);
                lastCursor = pageThreeEdges.slice(-1)[0].cursor;
            });
            it('Can be used to reverse paginate, using different page sizes', async () => {
                // PAGE 1
                const pageOnePageArgs = {last: 600};
                const pageOneCursorArgs = {before: lastCursor};

                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection({
                    ...pageOnePageArgs,
                    ...pageOneCursorArgs
                });

                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(true);
                expect(pageOneEdges.length).toBe(600);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first >= second
                    )
                ).toBe(true);
                // PAGE 2
                const pageTwoPageArgs = {last: 100};
                const pageTwoCursorArgs = {before: pageOneEdges[0].cursor};

                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection({
                    ...pageTwoPageArgs,
                    ...pageTwoCursorArgs
                });

                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(100);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first >= second
                    )
                ).toBe(true);

                // PAGE 3
                const pageThreePageArgs = {last: 900};
                const pageThreeCursorArgs = {before: pageTwoEdges[0].cursor};

                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    {
                        ...pageThreePageArgs,
                        ...pageThreeCursorArgs
                    }
                );

                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                // we lose one result b/c we are paginating away from the last item
                expect(pageThreeEdges.length).toBe(499);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );
                expect(
                    validateFieldIsOrderedAlphabetically(
                        (pageOneEdges as any) as Array<{node: {[field: string]: string}}>,
                        'lastname',
                        (first, second) => first >= second
                    )
                ).toBe(true);
            });
        });
    });
});
