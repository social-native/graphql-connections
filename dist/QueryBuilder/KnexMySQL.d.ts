import KnexBaseQueryBuilder from './Knex';
import { QueryBuilder as Knex } from 'knex';
import { QueryContext } from 'index';
import { IInAttributeMap, QueryBuilderOptions } from 'types';
export default class KnexMySQLFullTextQueryBuilder extends KnexBaseQueryBuilder {
    private exactMatchColumns;
    private searchColumns;
    private searchModifier?;
    private hasSearchOptions;
    constructor(queryContext: QueryContext, attributeMap: IInAttributeMap, options?: QueryBuilderOptions);
    createQuery(queryBuilder: Knex): Knex;
    protected applySearch(queryBuilder: Knex): Knex | undefined;
    private isKnexMySQLBuilderOptions;
}
