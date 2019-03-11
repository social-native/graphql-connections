import knex from 'knex';
import {ConnectionManager} from '../../src';
import {IUserNode, IUserCursorArgs, IUserFilterArgs, KnexQueryResult} from '../types';

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

// const rejectionOf = (promise: Promise<any>) =>
//     promise.then(
//         value => {
//             throw value;
//         },
//         reason => reason
//     );

const validateNodesHaveAttributes = (
    edges: Array<{node: {[attr: string]: any}}>,
    attributes: {[attr: string]: any}
) => {
    const attributesToValidate = Object.keys(attributes);
    return edges.reduce((acc: boolean, {node}) => {
        return (
            acc &&
            attributesToValidate.reduce((exist: boolean, attr) => {
                return exist && node[attr] === attributes[attr];
            }, true)
        );
    }, true);
};

describe('Cursor from', () => {
    describe('Ascending initial query', () => {
        describe('Using page size and filter query', () => {
            let lastCursor: string;

            it('Can be used to forward paginate to end of results, using different page sizes', async () => {
                // 1200 people match this query

                // PAGE 1
                const pageOnecursorArgs = {first: 500};
                const pageOnefilterArgs = [
                    {field: 'haircolor', operator: '=', value: 'brown'},
                    {field: 'age', operator: '<=', value: '30'}
                ];
                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection(
                    pageOnecursorArgs,
                    pageOnefilterArgs as any
                );

                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(false);
                expect(pageOneEdges.length).toBe(500);
                expect(pageOneEdges[0].node.id).toBe(1);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 2
                const pageTwoCursorArgs = {first: 400, after: pageOneEdges.slice(-1)[0].cursor};
                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection(
                    pageTwoCursorArgs,
                    undefined as any
                );
                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(400);
                expect(pageTwoEdges[0].node.id).toBe(501);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 3
                const pageThreeCursorArgs = {first: 300, after: pageTwoEdges.slice(-1)[0].cursor};
                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    pageThreeCursorArgs,
                    undefined as any
                );
                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                expect(pageThreeEdges.length).toBe(300);
                expect(pageThreeEdges[0].node.id).toBe(901);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );

                lastCursor = pageThreeEdges.slice(-1)[0].cursor;
            });

            it('Can be used to reverse paginate, using different page sizes', async () => {
                // PAGE 1
                const pageOnecursorArgs = {last: 600, before: lastCursor};
                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection(
                    pageOnecursorArgs,
                    undefined as any
                );
                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(true);
                expect(pageOneEdges.length).toBe(600);
                expect(pageOneEdges.slice(-1)[0].node.id).toBe(600);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 2
                const pageTwoCursorArgs = {last: 100, before: pageOneEdges.slice(-1)[0].cursor};
                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection(
                    pageTwoCursorArgs,
                    undefined as any
                );
                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(100);
                expect(pageTwoEdges.slice(-1)[0].node.id).toBe(500);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 3
                const pageThreeCursorArgs = {last: 900, before: pageTwoEdges.slice(-1)[0].cursor};
                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    pageThreeCursorArgs,
                    undefined as any
                );
                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                // we lose one result b/c we are paginating away from the last item
                expect(pageThreeEdges.length).toBe(499);
                expect(pageThreeEdges.slice(-1)[0].node.id).toBe(1);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );
            });
        });
    });
    describe('Descending initial query', () => {
        describe('Using page size and filter query', () => {
            let lastCursor: string;

            it('Can be used to reverse paginate to end of results, using different page sizes', async () => {
                // 1200 people match this query

                // PAGE 1
                const pageOnecursorArgs = {last: 500};
                const pageOnefilterArgs = [
                    {field: 'haircolor', operator: '=', value: 'brown'},
                    {field: 'age', operator: '<=', value: '30'}
                ];
                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection(
                    pageOnecursorArgs,
                    pageOnefilterArgs as any
                );

                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(false);
                expect(pageOneEdges.length).toBe(500);
                expect(pageOneEdges.slice(-1)[0].node.id).toBe(701);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 2
                const pageTwoCursorArgs = {last: 400, before: pageOneEdges.slice(-1)[0].cursor};
                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection(
                    pageTwoCursorArgs,
                    undefined as any
                );
                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(400);
                expect(pageTwoEdges.slice(-1)[0].node.id).toBe(301);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 3
                const pageThreeCursorArgs = {last: 300, before: pageTwoEdges.slice(-1)[0].cursor};
                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    pageThreeCursorArgs,
                    undefined as any
                );
                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                expect(pageThreeEdges.length).toBe(300);
                expect(pageThreeEdges.slice(-1)[0].node.id).toBe(1);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );

                lastCursor = pageThreeEdges.slice(-1)[0].cursor;
            });

            it('Can be used to forward paginate, using different page sizes', async () => {
                // PAGE 1
                const pageOnecursorArgs = {first: 600, after: lastCursor};
                const {pageInfo: pageOnePageInfo, edges: pageOneEdges} = await createConnection(
                    pageOnecursorArgs,
                    undefined as any
                );
                expect(pageOnePageInfo.hasNextPage).toBe(true);
                expect(pageOnePageInfo.hasPreviousPage).toBe(true);
                expect(pageOneEdges.length).toBe(600);
                expect(pageOneEdges[0].node.id).toBe(2);
                expect(validateNodesHaveAttributes(pageOneEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 2
                const pageTwoCursorArgs = {first: 100, after: pageOneEdges.slice(-1)[0].cursor};
                const {pageInfo: pageTwoPageInfo, edges: pageTwoEdges} = await createConnection(
                    pageTwoCursorArgs,
                    undefined as any
                );
                expect(pageTwoPageInfo.hasNextPage).toBe(true);
                expect(pageTwoPageInfo.hasPreviousPage).toBe(true);
                expect(pageTwoEdges.length).toBe(100);
                expect(pageTwoEdges[0].node.id).toBe(602);
                expect(validateNodesHaveAttributes(pageTwoEdges, {haircolor: 'brown'})).toBe(true);

                // PAGE 3
                const pageThreeCursorArgs = {first: 900, after: pageTwoEdges.slice(-1)[0].cursor};
                const {pageInfo: pageThreePageInfo, edges: pageThreeEdges} = await createConnection(
                    pageThreeCursorArgs,
                    undefined as any
                );
                expect(pageThreePageInfo.hasNextPage).toBe(false);
                expect(pageThreePageInfo.hasPreviousPage).toBe(true);
                // we lose one result b/c we are paginating away from the last item
                expect(pageThreeEdges.length).toBe(499);
                expect(pageThreeEdges[0].node.id).toBe(702);
                expect(validateNodesHaveAttributes(pageThreeEdges, {haircolor: 'brown'})).toBe(
                    true
                );
            });
        });
    });
});
