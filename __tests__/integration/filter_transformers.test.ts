import FilterTransformers from '../../src/filter_transformers';

describe('Filter Transformers', function() {
    describe('castUnixSecondsFiltersToMysqlTimestamps', function() {
        it('converts the unix seconds filters to mySQL timestamps', function() {
            const transformer = FilterTransformers.castUnixSecondsFiltersToMysqlTimestamps<{
                createdAt: string;
            }>(['createdAt']);

            expect(
                transformer({
                    field: 'createdAt',
                    operator: '=',
                    value: 1627374646
                })
            ).toMatchInlineSnapshot(`
                Object {
                  "field": "createdAt",
                  "operator": "=",
                  "value": "2021-07-27 01:30:46.000",
                }
            `);
        });
    });

    describe('compose', function() {
        it('composes multiple transformers together from left to right', function() {
            const createdAtTransformer = FilterTransformers.castUnixSecondsFiltersToMysqlTimestamps(
                ['createdAt']
            );

            const updatedAtTransformer = FilterTransformers.castUnixSecondsFiltersToMysqlTimestamps(
                ['updatedAt']
            );

            const filterTransformer = FilterTransformers.compose(
                createdAtTransformer,
                updatedAtTransformer
            );

            expect(
                filterTransformer({
                    field: 'createdAt',
                    operator: '=',
                    value: 1627374646
                })
            ).toMatchInlineSnapshot(`
                Object {
                  "field": "createdAt",
                  "operator": "=",
                  "value": "2021-07-27 01:30:46.000",
                }
            `);

            expect(
                filterTransformer({
                    field: 'updatedAt',
                    operator: '=',
                    value: 1627374646
                })
            ).toMatchInlineSnapshot(`
                Object {
                  "field": "updatedAt",
                  "operator": "=",
                  "value": "2021-07-27 01:30:46.000",
                }
            `);
        });
    });
});
