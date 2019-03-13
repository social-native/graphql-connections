import {QueryBuilder as Knex} from 'knex';
import CursorEncoder from './CursorEncoder';
import QueryContext from './QueryContext';
import KnexQueryBuilder from './KnexQueryBuilder';
import {
    IQueryBuilder,
    ICursorEncoder,
    ICursorArgs,
    FilterArgs,
    ICursorObj,
    IAttributeMap,
    IFilterMap,
    INode
} from './types';

type KnexQueryResult = Array<{[attributeName: string]: any}>;

interface IConnectionManagerConfig<CursorObj> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    filterMap?: IFilterMap; // maps an input operator to a sql where operator
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
export default class ConnectionManager<
    Node extends INode,
    SpecificFilterArgs extends FilterArgs<any>
> {
    private queryContext: QueryContext<SpecificFilterArgs>;
    private queryBuilder: IQueryBuilder<Knex>;
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;

    private attributeMap: IAttributeMap;
    private filterMap: IFilterMap;

    constructor(
        cursorArgs: ICursorArgs,
        filterArgs: SpecificFilterArgs,
        attributeMap: IAttributeMap,
        config: IConnectionManagerConfig<ICursorObj<string>> = {}
    ) {
        this.queryContext = new QueryContext<SpecificFilterArgs>(cursorArgs, filterArgs);
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
        this.queryBuilder = new KnexQueryBuilder<SpecificFilterArgs>(
            this.queryContext,
            this.attributeMap,
            this.filterMap
        );
    }

    public createQuery(queryBuilder: Knex) {
        return this.queryBuilder.applyQuery(queryBuilder);
    }

    public createPageInfo(queryResult: KnexQueryResult) {
        return {
            hasPreviousPage: this.hasPrevPage(),
            hasNextPage: this.hasNextPage(queryResult)
        };
    }

    public createEdges(queryResult: KnexQueryResult) {
        if (queryResult.length < 1) {
            return [];
        }
        const nodes = this.createNodes(queryResult) as Node[];
        return this.createEdgesFromNodes(nodes);
    }

    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    private hasNextPage(result: KnexQueryResult) {
        // If you are paging backwards, you only have another page if the
        // offset (aka the limit) is less then the result set size (aka: index position - 1)
        if (this.queryContext.isPagingBackwards) {
            return this.queryContext.indexPosition - (this.queryContext.limit + 1) > 0;
        }

        // Otherwise, if you aren't paging backwards, you will have another page
        // if more results were fetched than what was asked for.
        // This is possible b/c we over extend the limit size by 1
        // in the QueryBuilder
        return result.length > this.queryContext.limit;
    }

    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    private hasPrevPage() {
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
     * It is very likely the results we get back from the data store
     * have additional fields than what the GQL type node supports.
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    private createNodes(result: KnexQueryResult) {
        return result
            .map(node => {
                const attributes = Object.keys(node);
                attributes.forEach(attr => {
                    if (!Object.keys(this.attributeMap).includes(attr)) {
                        delete node[attr];
                    }
                });
                return {...node};
            })
            .slice(0, this.queryContext.limit);
    }

    private createEdgesFromNodes(nodes: Node[]) {
        const initialSort = this.queryContext.orderDirection;
        const filters = this.queryContext.filters;
        const orderBy = this.queryContext.orderBy;

        const nodesLength = nodes.length;
        return nodes.map((node, index) => {
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
