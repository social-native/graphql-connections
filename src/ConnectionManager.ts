import {QueryBuilder as Knex} from 'knex';
import {CursorEncoder, ICursorEncoder} from './CursorEncoder';
import QueryContext from './QueryContext';
import KnexQueryBuilder from './KnexQueryBuilder';
import {IQueryBuilder} from './types';

// The shape of input args for a cursor
interface ICursorArgs {
    first?: number;
    last?: number;
    before?: string;
    after?: string;
    orderBy?: string;
}

interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}

// The shape of input args for filters
type FilterArgs<Fields> = Array<IFilter<Fields>>;

type KnexQueryResult = Array<{[attributeName: string]: any}>;

// The shape of a connection node
interface INode {
    id: number;
}

interface IFilterMap {
    [inputOperator: string]: string;
}

interface IConfig<CursorObj> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    filterMap?: IFilterMap; // maps an input operator to a sql where operator
}

interface IIntermediateCursorObj<PublicAttributes> {
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    filters: string[][];
}

interface ICursorObj<PublicAttributes> extends IIntermediateCursorObj<PublicAttributes> {
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    // The position of the cursor item from the beginning of the query
    position: number;
    filters: string[][];
}

interface IAttributeMap {
    [nodeAttribute: string]: string;
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
class ConnectionManager<Node extends INode, SpecificFilterArgs extends FilterArgs<any>> {
    private queryContext: QueryContext<SpecificFilterArgs>;
    private queryBuilder: IQueryBuilder<Knex>;
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;

    private attributeMap: IAttributeMap;
    private filterMap: IFilterMap;

    constructor(
        cursorArgs: ICursorArgs,
        filterArgs: SpecificFilterArgs,
        attributeMap: IAttributeMap,
        config: IConfig<ICursorObj<string>> = {}
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
        if (this.queryContext.isPagingBackwards) {
            // If you are paging backwards, you only have another page if the
            // offset (aka the limit) is less then the set size (the index position - 1)
            return this.queryContext.indexPosition - (this.queryContext.limit + 1) > 0;
        }

        return result.length > this.queryContext.limit;
    }

    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    private hasPrevPage() {
        // if there is no cursor, than this is the first page
        // which means there is no previous page
        if (!this.queryContext.previousCursor) {
            return false;
        }

        if (this.queryContext.isPagingBackwards) {
            // return this.queryContext.limit < result.length;
            // If you are paging backwards, you have to be paging from
            // somewhere. Thus you always have a previous page.
            return true;
        } else {
            return this.queryContext.indexPosition > 0;
        }
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
            let position: number;
            if (this.queryContext.isPagingBackwards) {
                const distFromEnd = nodesLength - index;
                console.log(nodesLength, index, distFromEnd, this.queryContext.indexPosition);
                position = this.queryContext.indexPosition - distFromEnd;
            } else {
                position = this.queryContext.indexPosition + index + 1;
            }

            // TODO remove index
            return {
                cursor: this.cursorEncoder.encodeToCursor({
                    initialSort,
                    filters,
                    orderBy,
                    // id: node.id,
                    position
                }),
                node: {...node, id: position}
            };
        });
    }
}

export {ConnectionManager, INode, ICursorArgs, FilterArgs};
