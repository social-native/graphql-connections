import { IQueryContext, IAttributeMap, ICursorEncoder, ICursorObj, IQueryResult, INode, NodeTransformer } from 'types';
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
interface IQueryResultConfig<CursorObj, Node> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    nodeTransformer?: NodeTransformer<Node>;
}
export default class QueryResult<Result extends Array<{
    [field: string]: any;
}>, QueryContext extends IQueryContext, Node extends INode> implements IQueryResult<Node> {
    nodes: Node[];
    edges: Array<IEdge<Node>>;
    private result;
    private queryContext;
    private attributeMap;
    private cursorEncoder;
    private nodeTansformer?;
    constructor(result: Result, queryContext: QueryContext, attributeMap: IAttributeMap, config?: IQueryResultConfig<ICursorObj<string>, Node>);
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
    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
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
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    private createNodes;
    private createEdgesFromNodes;
}
export {};
