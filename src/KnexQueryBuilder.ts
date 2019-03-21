import QueryContext from './QueryContext';
import {QueryBuilder as Knex} from 'knex';
import {IFilterMap, IInAttributeMap, IQueryBuilder, IQueryBuilderOptions, IOperationFilter, IFilter} from './types';

/**
 * KnexQueryBuilder
 *
 * A QueryBuilder that creates a query from the QueryContext using Knex
 *
 */

const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<=',
    '<>': '<>'
};

export default class KnexQueryBuilder implements IQueryBuilder<Knex> {
    private queryContext: QueryContext;
    private attributeMap: IInAttributeMap;
    private filterMap: IFilterMap;

    constructor(
        queryContext: QueryContext,
        attributeMap: IInAttributeMap,
        options: IQueryBuilderOptions = {}
    ) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.filterMap = options.filterMap || defaultFilterMap;
    }

    public createQuery(queryBuilder: Knex) {
        this.applyLimit(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyOffset(queryBuilder);
        this.applyFilter(queryBuilder);

        return queryBuilder;
    }
    /**
     * Adds the limit to the sql query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    private applyLimit(queryBuilder: Knex) {
        queryBuilder.limit(this.queryContext.limit + 1); // add one to figure out if there are more results
    }

    /**
     * Adds the order to the sql query builder.
     */
    private applyOrder(queryBuilder: Knex) {
        // map from node attribute names to sql column names
        const orderBy = this.attributeMap[this.queryContext.orderBy] || this.attributeMap.id;
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
        this.addFilterRecursively(this.queryContext.filters, queryBuilder);
    }

    private computeFilterField(field: string) {
        const mapedField = this.attributeMap[field];
        if (mapedField) {
            return mapedField;
        }

        throw new Error(`Filter field ${field} either does not exist or is not accessible. Check the filter map`)
    }

    private computeFilterOperator(operator: string) {
        const mapedField = this.filterMap[operator];
        if (mapedField) {
            return mapedField;
        }

        throw new Error(`Filter operator ${operator} either does not exist or is not accessible. Check the filter map`)
    }

    private addFilterRecursively(filter: IOperationFilter, queryBuilder: Knex) {
        // tslint:disable-next-line
        if (filter.and && filter.and.length > 0) {
            filter.and.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhere({
                        this.computeFilterField(f.field),
                        this.computeFilterOperator(f.operator),
                        f.value
                    })
                } else {
                    queryBuilder.andWhere(this.addFilterRecursively(f, queryBuilder.clone()));
                }
            });
        }
    
        if (filter.or && filter.or.length > 0) {
            filter.or.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.orWhere({
                        this.computeFilterField(f.field),
                        this.computeFilterOperator(f.operator),
                        f.value
                    })
                } else {
                    queryBuilder.orWhere(this.addFilterRecursively(f, queryBuilder.clone()));
                }
            });
        }
    
        if (filter.not && filter.not.length > 0) {
            filter.not.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.orWhere({
                        this.computeFilterField(f.field),
                        this.computeFilterOperator(f.operator),
                        f.value
                    })
                } else {
                    queryBuilder.whereNot(this.addFilterRecursively(f, queryBuilder.clone()));
                }
            });
        }
    
        return queryBuilder;
    }
}

const isFilter = (filter: IOperationFilter & IFilter) => {
    return !!filter && !!filter.field && !!filter.operator && !!filter.value;
}

