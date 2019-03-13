import {QueryBuilder as Knex} from 'knex';
import CursorEncoder from './CursorEncoder';
import QueryContext from './QueryContext';
import KnexQueryBuilder from './KnexQueryBuilder';
import {
    IQueryBuilder,
    IQueryContext,
    ICursorEncoder,
    IQueryResult,
    ICursorObj,
    IAttributeMap,
    IFilterMap,
    INode,
    IInputArgs,
    NodeTransformer
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

interface IConnectionManagerConfig<CursorObj, Node> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    filterMap?: IFilterMap; // maps an input operator to a sql where operator
    nodeTransformer?: (node: any) => any;
}

const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<=',
    '<>': '<>'
};

// tslint:disable:max-classes-per-file
export default class ConnectionManager<Node extends INode> {
    private queryContext: QueryContext;
    private queryBuilder: IQueryBuilder<Knex>;
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;
    private queryResult?: IQueryResult<Node>;

    private attributeMap: IAttributeMap;
    private filterMap: IFilterMap;
    private nodeTransformer?: NodeTransformer<Node>;

    constructor(
        inputArgs: IInputArgs,
        attributeMap: IAttributeMap,
        config: IConnectionManagerConfig<ICursorObj<string>, Node> = {}
    ) {
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.nodeTransformer = config.nodeTransformer;

        // 1. Create QueryContext
        this.queryContext = new QueryContext(inputArgs, {
            cursorEncoder: this.cursorEncoder
        });
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
        // 2. Create QueryBuilder
        this.queryBuilder = new KnexQueryBuilder(
            this.queryContext,
            this.attributeMap,
            this.filterMap
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
            this.attributeMap,
            {cursorEncoder: this.cursorEncoder, nodeTransformer: this.nodeTransformer}
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
