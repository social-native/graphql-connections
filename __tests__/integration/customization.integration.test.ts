import {ConnectionManager} from '../../src';
import knex from 'knex';
import {test as testConfig} from '../../knexfile';
import {KnexQueryResult} from '../types';
import {validateNodesHaveAttributes} from '../utils';

const knexClient = knex(testConfig);

interface ITransformedNode {
    id: string;
    color: string;
}

const attributeMap = {
    id: 'id',
    username: 'username',
    firstname: 'firstname',
    age: 'age',
    haircolor: 'haircolor',
    lastname: 'lastname',
    bio: 'bio'
};

describe('Customizing the ConnectionManager', () => {
    describe('Node transformer', () => {
        it('Can transform a node', async () => {
            // PAGE 2
            const page = {first: 300};
            const transformer = (node: typeof attributeMap) => {
                return {
                    // ...node,
                    id: node.id,
                    color: 'blue'
                };
            };
            const nodeConnection = new ConnectionManager<ITransformedNode>(
                {page},
                attributeMap,
                attributeMap,
                {
                    resultOptions: {nodeTransformer: transformer}
                }
            );

            const queryBuilder = knexClient.queryBuilder().from('mock');
            nodeConnection.createQuery(queryBuilder);
            const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
            nodeConnection.addResult(result);
            const pageInfo = nodeConnection.pageInfo;
            const edges = nodeConnection.edges;

            expect(pageInfo.hasNextPage).toBe(true);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(300);
            expect(validateNodesHaveAttributes(edges, {color: 'blue'})).toBe(true);
        });
    });
});
