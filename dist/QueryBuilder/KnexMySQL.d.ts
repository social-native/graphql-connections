import KnexBaseQueryBuilder from './Knex';
import Knex from 'knex';
import { QueryContext } from 'index';
import { IInAttributeMap, QueryBuilderOptions } from 'types';
export default class KnexMySQLFullTextQueryBuilder extends KnexBaseQueryBuilder {
    private searchColumns;
    private searchModifier?;
    private hasSearchOptions;
    constructor(queryContext: QueryContext, attributeMap: IInAttributeMap, options?: QueryBuilderOptions);
    createQuery(queryBuilder: Knex.QueryBuilder): Knex.QueryBuilder;
    applyRelevanceSelect(queryBuilder: Knex.QueryBuilder): Knex.QueryBuilder;
    protected applySearch(queryBuilder: Knex.QueryBuilder): Knex.QueryBuilder | undefined;
    private createFullTextMatchClause;
    private isKnexMySQLBuilderOptions;
}
