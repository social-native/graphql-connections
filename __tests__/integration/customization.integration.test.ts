import {ConnectionManager, IFilter} from '../../src';
import knex from 'knex';
import {test as testConfig} from '../../knexfile.sqlite';
import {KnexQueryResult} from '../types';
import {validateNodesHaveAttributes} from '../utils';

const knexClient = knex(testConfig);

interface ITransformedNode {
    id: string | number;
    color: string;
}

const attributeMap = {
    id: 'id',
    username: 'username',
    firstname: 'firstname',
    age: 'age',
    haircolor: 'haircolor',
    lastname: 'lastname',
    bio: 'bio',
    updatedAt: 'updated_at'
};

describe('Customizing the ConnectionManager', () => {
    describe('Node transformer', () => {
        it('Can transform a node', async () => {
            const transformer = (node: typeof attributeMap) => {
                return {
                    id: node.id,
                    color: 'blue'
                };
            };
            const nodeConnection = new ConnectionManager<ITransformedNode>(
                {first: 300},
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

    describe('Filter transformer', () => {
        it('Can transform a filter', async () => {
            const TRANSFORM_FIELD = 'haircolor';
            const castUnixToDateTime = (filter: IFilter) => {
                if (filter.field === TRANSFORM_FIELD) {
                    return {
                        ...filter,
                        value: 'gray'
                    };
                }
                return filter;
            };

            const nodeConnection = new ConnectionManager<ITransformedNode>(
                {
                    first: 300,
                    filter: {
                        field: TRANSFORM_FIELD,
                        operator: '=',
                        value: 'gr'
                    }
                },
                attributeMap,
                {
                    builderOptions: {filterTransformer: castUnixToDateTime}
                }
            );

            const queryBuilder = knexClient.queryBuilder().from('mock');
            nodeConnection.createQuery(queryBuilder);
            const result = ((await queryBuilder.select()) || []) as KnexQueryResult;
            nodeConnection.addResult(result);
            const pageInfo = nodeConnection.pageInfo;
            const edges = nodeConnection.edges;

            expect(pageInfo.hasNextPage).toBe(false);
            expect(pageInfo.hasPreviousPage).toBe(false);
            expect(edges.length).toBe(100);
            expect(validateNodesHaveAttributes(edges, {haircolor: 'gray'})).toBe(true);
        });
    });

    describe('Order field mapping', function() {
        it.todo('Order can be a field in the provided attributeMap');
        it.todo('Order can be a field outside of the provided attributeMap');
    });
});
