import knex from 'knex';
import {test as testConfig} from '../../../knexfile.sqlite';
import createRawFromQueryBuilder from '../../../src/QueryBuilder/createRawFromQueryBuilder';
const knexClient = knex(testConfig);

describe('QueryBuilder', function() {
    describe('createRawFromQueryBuilder', function() {
        describe('given a raw query', function() {
            let result: knex.Raw;

            beforeAll(function() {
                result = createRawFromQueryBuilder(knexClient.queryBuilder(), '1');
            });

            it('produces a query segment', function() {
                expect(result.toString()).toMatchSnapshot();
            });

            it('can be used in a select', async function() {
                expect(
                    await knexClient
                        .from('mock')
                        .select(result)
                        .limit(1)
                ).toMatchSnapshot();
            });
        });

        describe('given a raw query and bindings', function() {
            let result: knex.Raw;

            beforeAll(function() {
                result = createRawFromQueryBuilder(
                    knexClient.queryBuilder(),
                    '(:sweet) as flavor',
                    {
                        sweet: 'sugar'
                    }
                );
            });

            it('produces an interpolated query segment', function() {
                expect(result.toString()).toMatchSnapshot();
            });

            it('can be used in a select', async function() {
                expect(
                    await knexClient
                        .from('mock')
                        .select(result)
                        .limit(1)
                ).toMatchSnapshot();
            });
        });
    });
});
