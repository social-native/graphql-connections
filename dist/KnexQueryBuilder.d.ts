import QueryContext from './QueryContext';
import { QueryBuilder as Knex } from 'knex';
import { FilterArgs, IFilterMap, IAttributeMap, IQueryBuilder } from './types';
export default class KnexQueryBuilder<SpecificFilterArgs extends FilterArgs<any>> implements IQueryBuilder<Knex> {
    private queryContext;
    private attributeMap;
    private filterMap;
    constructor(queryContext: QueryContext<SpecificFilterArgs>, attributeMap: IAttributeMap, filterMap: IFilterMap);
    applyQuery(queryBuilder: Knex): Knex;
    /**
     * Adds the limit to the query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    private applyLimit;
    /**
     * Changes the order to descending if the we are paginating backwards
     * The fact that we are paginating backwards is indicated by the presence
     * of either a `last` limit or `before` cursor
     *
     */
    private applyOrder;
    private applyOffset;
    /**
     * Adds filters to the sql query builder
     */
    private applyFilter;
}
