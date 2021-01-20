import QueryContext from '../query_context';
import {QueryBuilder as Knex, Where, QueryBuilder} from 'knex';
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
    protected useSuggestedValueLiteralTransforms: boolean;
    protected filterTransformer: NonNullable<IKnexQueryBuilderOptions['filterTransformer']>;

    constructor(
        queryContext: QueryContext,
        attributeMap: IInAttributeMap,
        options: IKnexQueryBuilderOptions = {}
    ) {
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        /** Default to true */
        this.useSuggestedValueLiteralTransforms = !(
            options.useSuggestedValueLiteralTransforms === false
        );
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
        const orderBy = this.attributeMap[this.queryContext.orderBy] || this.queryContext.orderBy;
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
        queryBuilder.andWhere(k => this.addFilterRecursively(this.queryContext.filters, k));
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
        const mappedField = this.filterMap[operator.toLowerCase()];
        if (mappedField) {
            return mappedField;
        }

        throw new Error(
            `Filter operator '${operator}' either does not exist or is not accessible. Check the filter map`
        );
    }

    // [string, string, string | number | null]
    // tslint:disable-next-line: cyclomatic-complexity
    private filterArgs(filter: IFilter) {
        const transformedFilter = this.filterTransformer(filter);

        const filterIsNullComparison =
            transformedFilter.value === null ||
            (typeof transformedFilter.value === 'string' &&
                transformedFilter.value.toLowerCase() === 'null');

        if (
            this.useSuggestedValueLiteralTransforms &&
            filterIsNullComparison &&
            transformedFilter.operator.toLowerCase() === '='
        ) {
            return [
                (builder: QueryBuilder) => {
                    builder.whereNull(this.computeFilterField(transformedFilter.field));
                }
            ];
        }

        if (
            this.useSuggestedValueLiteralTransforms &&
            filterIsNullComparison &&
            transformedFilter.operator.toLowerCase() === '<>'
        ) {
            return [
                (builder: QueryBuilder) => {
                    builder.whereNotNull(this.computeFilterField(transformedFilter.field));
                }
            ];
        }

        return [
            this.computeFilterField(transformedFilter.field),
            this.computeFilterOperator(transformedFilter.operator),
            transformedFilter.value
        ];
    }

    private addFilterRecursively(filter: IInputFilter, queryBuilder: Knex) {
        if (isFilter(filter)) {
            queryBuilder.where(...(this.filterArgs(filter) as Parameters<Where>));
            return queryBuilder;
        }

        // tslint:disable-next-line
        if (filter.and && filter.and.length > 0) {
            filter.and.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhere(...(this.filterArgs(f) as Parameters<Where>));
                } else {
                    queryBuilder.andWhere(k => this.addFilterRecursively(f, k));
                }
            });
        }

        if (filter.or && filter.or.length > 0) {
            filter.or.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.orWhere(...(this.filterArgs(f) as Parameters<Where>));
                } else {
                    queryBuilder.orWhere(k => this.addFilterRecursively(f, k));
                }
            });
        }

        if (filter.not && filter.not.length > 0) {
            filter.not.forEach(f => {
                if (isFilter(f)) {
                    queryBuilder.andWhereNot(...(this.filterArgs(f) as Parameters<Where>));
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
