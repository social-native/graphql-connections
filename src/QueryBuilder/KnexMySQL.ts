import KnexBaseQueryBuilder from './Knex';
import {QueryBuilder as Knex} from 'knex';
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

    public createQuery(queryBuilder: Knex) {
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

    protected applySearch(queryBuilder: Knex) {
        const {search} = this.queryContext;

        if (!search || this.searchColumns.length === 0) {
            return;
        }
        // create comma separated list of columns to search over
        const columns = this.searchColumns.reduce((acc, columnName, index) => {
            return index === 0 ? acc + columnName : acc + ', ' + columnName;
        }, '');

        /*
         * using the callback `where` encapsulates the wheres
         * done inside of it in a parenthesis in the final query
         */
        // tslint:disable-next-line cyclomatic-complexity
        queryBuilder.where(parenBuilder => {
            const fullTextClause = `MATCH(${columns}) AGAINST (? ${this.searchModifier || ''})`;

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
