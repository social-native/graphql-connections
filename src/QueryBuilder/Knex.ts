import QueryContext from '../QueryContext';
import {QueryBuilder as Knex} from 'knex';
import {
    IFilterMap,
    IInAttributeMap,
    IQueryBuilder,
    IKnexQueryBuilderOptions,
    IInputFilter,
    IFilter
} from '../types';

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

const defaultFilterTransformer = (filter: IFilter) => filter;

export default class KnexQueryBuilder implements IQueryBuilder<Knex> {
    protected queryContext: QueryContext;
    protected attributeMap: IInAttributeMap;
    protected filterMap: IFilterMap;
    protected filterTransformer: NonNullable<IKnexQueryBuilderOptions['filterTransformer']>;

    constructor(
        queryContext: QueryContext,
        attributeMap: IInAttributeMap,
        options: IKnexQueryBuilderOptions = {}
    ) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.filterMap = options.filterMap || defaultFilterMap;
        this.filterTransformer = options.filterTransformer || defaultFilterTransformer;

        this.addFilterRecursively = this.addFilterRecursively.bind(this);
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
    protected applyLimit(queryBuilder: Knex) {
        queryBuilder.limit(this.queryContext.limit + 1); // add one to figure out if there are more results
    }

    /**
     * Adds the order to the sql query builder.
     */
    protected applyOrder(queryBuilder: Knex) {
        // map from node attribute names to sql column names
        const orderBy = this.attributeMap[this.queryContext.orderBy] || this.attributeMap.id;
        const direction = this.queryContext.orderDir;

        queryBuilder.orderBy(orderBy, direction);
    }

    protected applyOffset(queryBuilder: Knex) {
        const offset = this.queryContext.offset;
        queryBuilder.offset(offset);
    }

    /**
     * Adds filters to the sql query builder
     */
    protected applyFilter(queryBuilder: Knex) {
        this.addFilterRecursively(this.queryContext.filters, queryBuilder);
    }

    private computeFilterField(field: string) {
        const mappedField = this.attributeMap[field];
        if (mappedField) {
            return mappedField;
        }

        throw new Error(
            `Filter field '${field}' either does not exist or is not accessible. Check the attribute map`
        );
    }

    private computeFilterOperator(operator: string) {
        const mappedField = this.filterMap[operator];
        if (mappedField) {
            return mappedField;
        }

        throw new Error(
            `Filter operator '${operator}' either does not exist or is not accessible. Check the filter map`
        );
    }

    private filterArgs(filter: IFilter): [string, string, string] {
        const f = this.filterTransformer(filter);
        return [this.computeFilterField(f.field), this.computeFilterOperator(f.operator), f.value];
    }

    private addFilterRecursively(filter: IInputFilter, queryBuilder: Knex) {
        if (isFilter(filter)) {
            queryBuilder.where(...this.filterArgs(filter as IFilter));
            return queryBuilder;
        }

        // tslint:disable-next-line
        if (filter.and && filter.and.length > 0) {
            filter.and.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhere(...this.filterArgs(f));
                } else {
                    queryBuilder.andWhere(k => this.addFilterRecursively(f, k));
                }
            });
        }

        if (filter.or && filter.or.length > 0) {
            filter.or.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.orWhere(...this.filterArgs(f));
                } else {
                    queryBuilder.orWhere(k => this.addFilterRecursively(f, k));
                }
            });
        }

        if (filter.not && filter.not.length > 0) {
            filter.not.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhereNot(...this.filterArgs(f));
                } else {
                    queryBuilder.andWhereNot(k => this.addFilterRecursively(f, k));
                }
            });
        }

        return queryBuilder;
    }
}

const isFilter = (filter: IInputFilter): filter is IFilter => {
    return (
        !!filter &&
        !!(filter as IFilter).field &&
        !!(filter as IFilter).operator &&
        !!(filter as IFilter).value
    );
};
