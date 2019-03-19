import {QueryBuilder as Knex} from 'knex';
import QueryContext from './QueryContext';
import KnexQueryBuilder from './KnexQueryBuilder';
import {
    IQueryBuilder,
    IQueryContext,
    IQueryResult,
    ICursorObj,
    IInAttributeMap,
    IInputArgs,
    IQueryBuilderOptions,
    IQueryResultOptions,
    IQueryContextOptions
} from './types';
import QueryResult from 'QueryResult';

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
    builderOptions?: IQueryBuilderOptions;
}

// tslint:disable:max-classes-per-file
export default class ConnectionManager<Node = {}> {
    private queryContext: QueryContext;
    private queryBuilder: IQueryBuilder<Knex>;
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

        // 2. Create QueryBuilder
        this.queryBuilder = new KnexQueryBuilder(
            this.queryContext,
            this.inAttributeMap,
            this.options.builderOptions
        );
    }

    public createQuery(queryBuilder: Knex) {
        return this.queryBuilder.createQuery(queryBuilder);
    }

    public addResult(result: KnexQueryResult) {
        // 3. Create QueryResult
        this.queryResult = new QueryResult<KnexQueryResult, IQueryContext, Node>(
            result,
            this.queryContext,
            this.options.resultOptions
        );
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
}
