import KnexBaseQueryBuilder from './Knex';
import {QueryBuilder as Knex} from 'knex';
import {QueryContext} from 'index';
import {IInAttributeMap, IKnexMySQLFullTextQueryBuilderOptions} from 'types';

export default class KnexMySQLFullTextQueryBuilder extends KnexBaseQueryBuilder {
    private searchColumns: IKnexMySQLFullTextQueryBuilderOptions['searchColumns'];
    private searchModifier?: IKnexMySQLFullTextQueryBuilderOptions['searchModifier'];

    constructor(
        queryContext: QueryContext,
        attributeMap: IInAttributeMap,
        options: IKnexMySQLFullTextQueryBuilderOptions
    ) {
        super(queryContext, attributeMap, options);

        this.searchColumns = options.searchColumns;
        this.searchModifier = options.searchModifier;
    }
    public createQuery(queryBuilder: Knex) {
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
        queryBuilder.as('score');
    }
}
