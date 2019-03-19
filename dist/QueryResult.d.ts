import { IQueryContext, ICursorObj, IQueryResult, IQueryResultOptions } from 'types';
/**
 * QueryResult
 *
 * Handles building pageInfo and edges using data from a returned query
 *
 */
interface IEdge<Node> {
    cursor: string;
    node: Node;
}
export default class QueryResult<Result extends Array<{
    [field: string]: any;
}>, QueryContext extends IQueryContext, Node = {}> implements IQueryResult<Node> {
    nodes: Node[];
    edges: Array<IEdge<Node>>;
    private result;
    private queryContext;
    private cursorEncoder;
    private nodeTansformer?;
    constructor(result: Result, queryContext: QueryContext, options?: IQueryResultOptions<ICursorObj<string>, Node>);
    readonly pageInfo: {
        hasPreviousPage: boolean;
        hasNextPage: boolean;
        startCursor: string;
        endCursor: string;
    };
    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    readonly hasNextPage: boolean;
    readonly hasPrevPage: boolean;
    /**
     * The first cursor in the nodes list
     */
    readonly startCursor: string;
    /**
     * The last cursor in the nodes list
     */
    readonly endCursor: string;
    /**
     * It is very likely the results we get back from the data store
     * have additional fields than what the GQL type node supports.
     * We trim down the result set to be within the limit size and we
     * apply an optional transform to the result data as we iterate through it
     * to make the Nodes.
     */
    private createNodes;
    private createEdgesFromNodes;
}
export {};
