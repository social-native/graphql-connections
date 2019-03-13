import QueryContext from './QueryContext';
import {QueryBuilder as Knex} from 'knex';
import {FilterArgs, IFilterMap, IAttributeMap, IQueryBuilder} from './types';

export default class KnexQueryBuilder<SpecificFilterArgs extends FilterArgs<any>>
    implements IQueryBuilder<Knex> {
    private queryContext: QueryContext<SpecificFilterArgs>;
    private attributeMap: IAttributeMap;
    private filterMap: IFilterMap;

    constructor(
        queryContext: QueryContext<SpecificFilterArgs>,
        attributeMap: IAttributeMap,
        filterMap: IFilterMap
    ) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.filterMap = filterMap;
    }

    public applyQuery(queryBuilder: Knex) {
        this.applyLimit(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyOffset(queryBuilder);
        this.applyFilter(queryBuilder);

        console.log(queryBuilder.clone().toString());
        return queryBuilder;
    }
    /**
     * Adds the limit to the query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    private applyLimit(queryBuilder: Knex) {
        queryBuilder.limit(this.queryContext.limit + 1); // add one to figure out if there are more results
    }

    /**
     * Changes the order to descending if the we are paginating backwards
     * The fact that we are paginating backwards is indicated by the presence
     * of either a `last` limit or `before` cursor
     *
     */
    private applyOrder(queryBuilder: Knex) {
        // map from node attribute names to sql column names
        const orderBy = this.attributeMap[this.queryContext.orderBy] || 'id';
        const direction = this.queryContext.orderDirection;

        queryBuilder.orderBy(orderBy, direction);
    }

    private applyOffset(queryBuilder: Knex) {
        const offset = this.queryContext.offset;
        queryBuilder.offset(offset);
    }

    /**
     * Adds filters to the sql query builder
     */
    private applyFilter(queryBuilder: Knex) {
        this.queryContext.filters.forEach(filter => {
            queryBuilder.andWhere(
                this.attributeMap[filter[0]], // map attribute name to sql attribute name
                this.filterMap[filter[1]], // map operator to sql attribute
                filter[2]
            );
        });
    }
}
