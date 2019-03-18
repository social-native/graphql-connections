import {
    IQueryContext,
    IOutAttributeMap,
    ICursorEncoder,
    ICursorObj,
    IQueryResult,
    NodeTransformer,
    IQueryResultOptions
} from 'types';
import {CursorEncoder} from 'index';

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

export default class QueryResult<
    Result extends Array<{[field: string]: any}>,
    QueryContext extends IQueryContext,
    Node = {}
> implements IQueryResult<Node> {
    public nodes: Node[];
    public edges: Array<IEdge<Node>>;
    private result: Result;
    private queryContext: QueryContext;
    private attributeMap: IOutAttributeMap;
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;
    private nodeTansformer?: NodeTransformer<Node>;

    constructor(
        result: Result,
        queryContext: QueryContext,
        attributeMap: IOutAttributeMap,
        options: IQueryResultOptions<ICursorObj<string>, Node> = {}
    ) {
        this.result = result;
        this.queryContext = queryContext;
        this.attributeMap = attributeMap;
        this.cursorEncoder = options.cursorEncoder || CursorEncoder;
        this.nodeTansformer = options.nodeTransformer;

        if (this.result.length < 1) {
            this.nodes = [];
            this.edges = [];
        } else {
            this.nodes = this.createNodes();
            this.edges = this.createEdgesFromNodes();
        }
    }

    public get pageInfo() {
        return {
            hasPreviousPage: this.hasPrevPage,
            hasNextPage: this.hasNextPage,
            startCursor: this.startCursor,
            endCursor: this.endCursor
        };
    }

    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    public get hasNextPage() {
        // If you are paging backwards, you only have another page if the
        // offset (aka the limit) is less then the result set size (aka: index position - 1)
        if (this.queryContext.isPagingBackwards) {
            return this.queryContext.indexPosition - (this.queryContext.limit + 1) > 0;
        }

        // Otherwise, if you aren't paging backwards, you will have another page
        // if more results were fetched than what was asked for.
        // This is possible b/c we over extend the limit size by 1
        // in the QueryBuilder
        return this.result.length > this.queryContext.limit;
    }

    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    public get hasPrevPage() {
        // If there is no cursor, then this is the first page
        // Which means there is no previous page
        if (!this.queryContext.previousCursor) {
            return false;
        }

        // If you are paging backwards, you have to be paging from
        // somewhere. Thus you always have a previous page.
        if (this.queryContext.isPagingBackwards) {
            return true;
        }

        // If you have a previous cursor and you are not paging backwards you have to be
        // on a page besides the first one. This means you have a previous page.
        return true;
    }

    /**
     * The first cursor in the nodes list
     */
    public get startCursor() {
        const firstEdge = this.edges[0];
        return firstEdge ? firstEdge.cursor : '';
    }

    /**
     * The last cursor in the nodes list
     */
    public get endCursor() {
        const endCursor = this.edges.slice(-1)[0];
        return endCursor ? endCursor.cursor : '';
    }

    /**
     * It is very likely the results we get back from the data store
     * have additional fields than what the GQL type node supports.
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    private createNodes() {
        let nodeTansformer: NodeTransformer<Node>;
        if (this.nodeTansformer) {
            nodeTansformer = this.nodeTansformer;
        } else {
            nodeTansformer = (node: any) => node;
        }

        return this.result
            .map(node => {
                const attributes = Object.keys(node);
                attributes.forEach(attr => {
                    if (!Object.keys(this.attributeMap).includes(attr)) {
                        delete node[attr];
                    }
                });
                const newNode = {...node};
                return nodeTansformer(newNode);
            })
            .slice(0, this.queryContext.limit);
    }

    private createEdgesFromNodes() {
        const initialSort = this.queryContext.orderDirection;
        const filters = this.queryContext.filters;
        const orderBy = this.queryContext.orderBy;

        const nodesLength = this.nodes.length;
        return this.nodes.map((node, index) => {
            const position = this.queryContext.isPagingBackwards
                ? this.queryContext.indexPosition - nodesLength - index
                : this.queryContext.indexPosition + index + 1;

            return {
                cursor: this.cursorEncoder.encodeToCursor({
                    initialSort,
                    filters,
                    orderBy,
                    position
                }),
                node: {...node}
            };
        });
    }
}
