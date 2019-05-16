import KnexBaseQueryBuilder from './Knex';
import {QueryBuilder as Knex} from 'knex';
import {QueryContext} from 'index';
import {IInAttributeMap, IKnexMySQLQueryBuilderOptions, QueryBuilderOptions} from 'types';

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
            throw Error('Using search but search is not configured via query builder options');
        } else {
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
        if (!this.queryContext.search) {
            return;
        }
        // create comma separated list of columns to search over
        const columns = this.searchColumns.reduce((acc, columnName, index) => {
            return index === 0 ? acc + columnName : acc + ', ' + columnName;
        }, '');

        if (this.searchModifier) {
            queryBuilder.andWhereRaw(
                `
                MATCH(${columns}) AGAINST (? ${this.searchModifier})
            `,
                this.queryContext.search
            );
        } else {
            queryBuilder.andWhereRaw(`MATCH(${columns}) AGAINST (?)`, this.queryContext.search);
        }
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
