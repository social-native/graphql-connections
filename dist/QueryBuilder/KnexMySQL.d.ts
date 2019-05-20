import KnexBaseQueryBuilder from './Knex';
import * as Knex from 'knex';
import { QueryContext } from 'index';
import { IInAttributeMap, QueryBuilderOptions } from 'types';
export default class KnexMySQLFullTextQueryBuilder extends KnexBaseQueryBuilder {
    private exactMatchColumns;
    private searchColumns;
    private searchModifier?;
    private hasSearchOptions;
    constructor(queryContext: QueryContext, attributeMap: IInAttributeMap, options?: QueryBuilderOptions);
    createQuery(queryBuilder: Knex.QueryBuilder): Knex.QueryBuilder;
    /**
     * Adds a select for relevance so that the results can be ordered by search score.
     * Exact matches have their relevance overriden to be 1.
     */
    applyRelevanceSelect(queryBuilder: Knex.QueryBuilder, connection: Knex): Knex.QueryBuilder;
    protected applySearch(queryBuilder: Knex.QueryBuilder): Knex.QueryBuilder | undefined;
    private createFullTextMatchClause;
    private isKnexMySQLBuilderOptions;
}
