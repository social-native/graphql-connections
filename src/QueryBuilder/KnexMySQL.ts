import KnexBaseQueryBuilder from './Knex';
import * as Knex from 'knex';
import {QueryContext} from 'index';
import {IInAttributeMap, IKnexMySQLQueryBuilderOptions, QueryBuilderOptions} from 'types';

export default class KnexMySQLFullTextQueryBuilder extends KnexBaseQueryBuilder {
    private exactMatchColumns: IKnexMySQLQueryBuilderOptions['exactMatchColumns'];
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
            this.exactMatchColumns = options.exactMatchColumns;
            this.searchColumns = options.searchColumns;
            this.searchModifier = options.searchModifier;
        } else if (!this.hasSearchOptions && this.queryContext.search) {
            throw Error('Using search but search is not configured via query builder options');
        } else {
            this.exactMatchColumns = [];
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

        this.applyOrder(queryBuilder);
        this.applyLimit(queryBuilder);
        this.applyOffset(queryBuilder);

        return queryBuilder;
    }

    /**
     * Adds a select for relevance so that the results can be ordered by search score.
     * Exact matches have their relevance overriden to be 1.
     */
    public applyRelevanceSelect(queryBuilder: Knex.QueryBuilder, connection: Knex) {
        if (!this.searchColumns.length) {
            throw new Error(
                'Cannot add "relevance" to query selects: no searchColumns were provided.'
            );
        }

        if (!this.queryContext.search) {
            throw new Error('Cannot add "relevance" to query selects: no search term was provided');
        }

        if (this.exactMatchColumns && this.exactMatchColumns.length) {
            const exactMatchClauses = this.exactMatchColumns
                .map(columnName => `${columnName} = ?`)
                .join(' or ');

            const {search} = this.queryContext;
            const queryBindings = this.exactMatchColumns.map(() => search);
            const fullTextMatchClause = this.createFullTextMatchClause();

            return queryBuilder.select(
                connection.raw(
                    `if (
                        ${exactMatchClauses},
                        1,
                        ${fullTextMatchClause}
                    ) as relevance`,
                    /** Add one additional binding since the `fullTextMatchClause` needs one as well */
                    [...queryBindings, search]
                )
            );
        } else {
            return queryBuilder.select(
                connection.raw(`(${this.createFullTextMatchClause()}) as relevance`, [
                    this.queryContext.search
                ])
            );
        }
    }

    protected applySearch(queryBuilder: Knex.QueryBuilder) {
        const {search} = this.queryContext;

        if (!search || this.searchColumns.length === 0) {
            return;
        }

        /*
         * using the callback `where` encapsulates the wheres
         * done inside of it in a parenthesis in the final query
         */
        // tslint:disable-next-line cyclomatic-complexity
        queryBuilder.where(parenBuilder => {
            const fullTextClause = this.createFullTextMatchClause();

            /**
             * When given exact match columns, we should check for an exact match OR search match.
             * This will place exact matches at the top of the results list.
             */
            if (this.exactMatchColumns && this.exactMatchColumns.length) {
                this.exactMatchColumns.forEach(exactMatchColumn => {
                    parenBuilder.orWhere(exactMatchColumn, search);
                });

                parenBuilder.orWhereRaw(fullTextClause, [search]);
            } else {
                /**
                 * Otherwise, use only full text search
                 */
                parenBuilder.where(fullTextClause, [search]);
            }
        });

        return queryBuilder;
    }

    private createFullTextMatchClause() {
        // create comma separated list of columns to search over
        const columns = this.searchColumns.reduce((acc, columnName, index) => {
            return index === 0 ? acc + columnName : acc + ', ' + columnName;
        }, '');

        return `MATCH(${columns}) AGAINST (? ${this.searchModifier || ''})`;
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
