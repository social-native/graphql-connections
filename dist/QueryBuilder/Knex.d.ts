import QueryContext from '../QueryContext';
import { QueryBuilder as Knex } from 'knex';
import { IInAttributeMap, IQueryBuilder, IKnexQueryBuilderOptions } from '../types';
export default class KnexQueryBuilder implements IQueryBuilder<Knex> {
    protected queryContext: QueryContext;
    private attributeMap;
    private filterMap;
    private filterTransformer;
    constructor(queryContext: QueryContext, attributeMap: IInAttributeMap, options?: IKnexQueryBuilderOptions);
    createQuery(queryBuilder: Knex): Knex;
    /**
     * Adds the limit to the sql query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    protected applyLimit(queryBuilder: Knex): void;
    /**
     * Adds the order to the sql query builder.
     */
    protected applyOrder(queryBuilder: Knex): void;
    protected applyOffset(queryBuilder: Knex): void;
    /**
     * Adds filters to the sql query builder
     */
    protected applyFilter(queryBuilder: Knex): void;
    private computeFilterField;
    private computeFilterOperator;
    private filterArgs;
    private addFilterRecursively;
}
