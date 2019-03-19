import QueryContext from './QueryContext';
import { QueryBuilder as Knex } from 'knex';
import { IInAttributeMap, IQueryBuilder, IQueryBuilderOptions } from './types';
export default class KnexQueryBuilder implements IQueryBuilder<Knex> {
    private queryContext;
    private attributeMap;
    private filterMap;
    constructor(queryContext: QueryContext, attributeMap: IInAttributeMap, options?: IQueryBuilderOptions);
    createQuery(queryBuilder: Knex): Knex;
    /**
     * Adds the limit to the sql query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    private applyLimit;
    /**
     * Adds the order to the sql query builder.
     */
    private applyOrder;
    private applyOffset;
    /**
     * Adds filters to the sql query builder
     */
    private applyFilter;
}
