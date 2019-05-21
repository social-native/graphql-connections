import KnexBaseQueryBuilder from './Knex';
import Knex from 'knex';
import {QueryContext} from '../index';
import {IInAttributeMap, IKnexMySQLQueryBuilderOptions, QueryBuilderOptions} from '../types';
import createRawFromQueryBuilder from './createRawFromQueryBuilder';

export default class KnexMySQLFullTextQueryBuilder extends KnexBaseQueryBuilder {
    private searchColumns: IKnexMySQLQueryBuilderOptions['searchColumns'];
    private searchModifier?: IKnexMySQLQueryBuilderOptions['searchModifier'];
    private hasSearchOptions: boolean;

    constructor(
        queryContext: QueryContext,
        attributeMap: IInAttributeMap,
        options?: QueryBuilderOptions
    ) {
        super(queryContext, attributeMap, options);

        this.hasSearchOptions = this.isKnexMySQLBuilderOptions(options);

        // calling type guard twice b/c of weird typescript thing...
        if (this.isKnexMySQLBuilderOptions(options)) {
            this.searchColumns = options.searchColumns;
            this.searchModifier = options.searchModifier;
        } else if (!this.hasSearchOptions && this.queryContext.search) {
            throw new Error('Using search but search is not configured via query builder options');
        } else {
            this.searchColumns = [];
        }
    }

    public createQuery(queryBuilder: Knex.QueryBuilder) {
        if (!this.hasSearchOptions) {
            return super.createQuery(queryBuilder);
        }

        // apply filter first
        this.applyFilter(queryBuilder);

        this.applySearch(queryBuilder);
        this.applyRelevanceSelect(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyLimit(queryBuilder);
        this.applyOffset(queryBuilder);

        return queryBuilder;
    }

    public applyRelevanceSelect(queryBuilder: Knex.QueryBuilder) {
        if (!this.queryContext.search) {
            return;
        }

        queryBuilder.select([
            ...Object.values(this.attributeMap),
            createRawFromQueryBuilder(
                queryBuilder,
                `(${this.createFullTextMatchClause()}) as _relevance`,
                {
                    term: this.queryContext.search
                }
            )
        ]);

        return;
    }

    protected applySearch(queryBuilder: Knex.QueryBuilder) {
        const {search} = this.queryContext;

        if (!search || this.searchColumns.length === 0) {
            return;
        }

        queryBuilder.whereRaw(this.createFullTextMatchClause(), {term: search});

        return;
    }

    private createFullTextMatchClause() {
        // create comma separated list of columns to search over
        const columns = this.searchColumns.reduce((acc, columnName, index) => {
            return index === 0 ? acc + columnName : acc + ', ' + columnName;
        }, '');

        return `MATCH(${columns}) AGAINST (:term ${this.searchModifier || ''})`;
    }

    // type guard
    private isKnexMySQLBuilderOptions(
        options?: QueryBuilderOptions
    ): options is IKnexMySQLQueryBuilderOptions {
        // tslint:disable-next-line
        if (options == null) {
            return false;
        }
        return (options as IKnexMySQLQueryBuilderOptions).searchColumns !== undefined;
    }
}
