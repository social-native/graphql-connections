import {QueryBuilder as Knex} from 'knex';
import QueryContext from './query_context';
import * as QUERY_BUILDERS from './query_builder';
import {
    IQueryBuilder,
    IQueryContext,
    IQueryResult,
    ICursorObj,
    IInAttributeMap,
    IInputArgs,
    QueryBuilderOptions,
    IQueryResultOptions,
    IQueryContextOptions
} from './types';
import QueryResult from './query_result';

/**
 * ConnectionManager
 *
 * A convenience class that helps orchestrate creation of the QueryContext, the building of the
 * connection query (QueryBuilder), and usage of the returned query to calculate the page info and
 * edges (QueryResult)
 *
 */

type KnexQueryResult = Array<{[attributeName: string]: any}>;

interface IConnectionManagerOptions<CursorObj, Node> {
    contextOptions?: IQueryContextOptions<CursorObj>;
    resultOptions?: IQueryResultOptions<CursorObj, Node>;
    builderOptions?: QueryBuilderOptions;
}

// tslint:disable:max-classes-per-file
export default class ConnectionManager<Node = {}> {
    private queryContext: QueryContext;
    private queryBuilder?: IQueryBuilder<Knex>;
    private queryResult?: IQueryResult<Node>;

    private inAttributeMap: IInAttributeMap;
    private options: IConnectionManagerOptions<ICursorObj<string>, Node>;

    constructor(
        inputArgs: IInputArgs,
        inAttributeMap: IInAttributeMap,
        options?: IConnectionManagerOptions<ICursorObj<string>, Node>
    ) {
        this.options = options || {};
        this.inAttributeMap = inAttributeMap;

        // 1. Create QueryContext
        this.queryContext = new QueryContext(inputArgs, this.options.contextOptions);
    }

    public createQuery(queryBuilder: Knex) {
        // 2. Create QueryBuilder
        if (!this.queryBuilder) {
            this.initializeQueryBuilder(queryBuilder);
        }

        if (!this.queryBuilder) {
            throw Error('Query builder could not be correctly initialized');
        }

        return this.queryBuilder.createQuery(queryBuilder);
    }

    public addResult(result: KnexQueryResult) {
        // 3. Create QueryResult
        this.queryResult = new QueryResult<KnexQueryResult, IQueryContext, Node>(
            result,
            this.queryContext,
            this.options.resultOptions
        );

        return this;
    }

    public get pageInfo() {
        if (!this.queryResult) {
            throw Error('Result must be added before page info can be calculated');
        }
        return this.queryResult.pageInfo;
    }

    public get edges() {
        if (!this.queryResult) {
            throw Error('Result must be added before edges can be calculated');
        }
        return this.queryResult.edges;
    }

    private initializeQueryBuilder(queryBuilder: Knex) {
        // 2. Create QueryBuilder
        const MYSQL_CLIENTS = ['mysql', 'mysql2'];
        const {client: clientName} = (queryBuilder as any).client.config;

        type valueof<T> = T[keyof T];

        let builder: valueof<typeof QUERY_BUILDERS>;
        if (MYSQL_CLIENTS.includes(clientName)) {
            builder = QUERY_BUILDERS.KnexMySQL;
        } else {
            builder = QUERY_BUILDERS.Knex;
        }

        this.queryBuilder = new builder(
            this.queryContext,
            this.inAttributeMap,
            this.options.builderOptions
        );
    }
}
