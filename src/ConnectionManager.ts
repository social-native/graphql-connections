import {QueryBuilder} from 'knex';
import {CursorEncoder, ICursorEncoder} from './CursorEncoder';
import CurrentCursor from './CurrentCursor';

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
    private currentCursor: CurrentCursor<SpecificFilterArgs>;
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;
    private attributeMap: IAttributeMap;
    private filterMap: IFilterMap;

    constructor(
        cursorArgs: ICursorArgs,
        filterArgs: SpecificFilterArgs,
        attributeMap: IAttributeMap,
        config: IConfig<ICursorObj<string>> = {}
    ) {
        this.currentCursor = new CurrentCursor<SpecificFilterArgs>(cursorArgs, filterArgs);

        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
    }

    public createQuery(queryBuilder: QueryBuilder) {
        this.applyLimit(queryBuilder);
        this.applyOrder(queryBuilder);
        this.applyOffset(queryBuilder);
        this.applyFilter(queryBuilder);

        console.log(queryBuilder.clone().toString());
        return queryBuilder;
    }

    public createPageInfo(queryResult: KnexQueryResult) {
        return {
            hasPreviousPage: this.hasPrevPage(queryResult),
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
     * Adds the limit to the query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    private applyLimit(queryBuilder: QueryBuilder) {
        queryBuilder.limit(this.currentCursor.limit + 1); // add one to figure out if there are more results
    }

    /**
     * Changes the order to descending if the we are paginating backwards
     * The fact that we are paginating backwards is indicated by the presence
     * of either a `last` limit or `before` cursor
     *
     */
    private applyOrder(queryBuilder: QueryBuilder) {
        // map from node attribute names to sql column names
        const orderBy = this.attributeMap[this.currentCursor.orderBy] || 'id';
        const direction = this.currentCursor.orderDirection;

        queryBuilder.orderBy(orderBy, direction);
    }

    private applyOffset(queryBuilder: QueryBuilder) {
        const offset = this.currentCursor.offset;
        queryBuilder.offset(offset);
    }

    /**
     * Adds filters to the sql query builder
     */
    private applyFilter(queryBuilder: QueryBuilder) {
        this.currentCursor.filters.forEach(filter => {
            queryBuilder.andWhere(
                this.attributeMap[filter[0]], // map attribute name to sql attribute name
                this.filterMap[filter[1]], // map operator to sql attribute
                filter[2]
            );
        });
    }

    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    private hasNextPage(result: KnexQueryResult) {
        if (this.currentCursor.isPagingBackwards) {
            return this.currentCursor.indexPosition - this.currentCursor.limit > 0;
        }

        return result.length > this.currentCursor.limit;
    }

    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    private hasPrevPage(result: KnexQueryResult) {
        // if there is no cursor, than this is the first page
        // which means there is no previous page
        if (!this.currentCursor.previousCursor) {
            return false;
        }

        if (this.currentCursor.isPagingBackwards) {
            return this.currentCursor.limit < result.length;
        } else {
            return this.currentCursor.indexPosition > 0;
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
            .slice(0, this.currentCursor.limit);
    }

    private createEdgesFromNodes(nodes: Node[]) {
        const initialSort = this.currentCursor.orderDirection;
        const filters = this.currentCursor.filters;
        const orderBy = this.currentCursor.orderBy;

        return nodes.map((node, index) => {
            let position: number;
            if (this.currentCursor.isPagingBackwards) {
                position = this.currentCursor.indexPosition - (index + 1);
            } else {
                position = this.currentCursor.indexPosition + index + 1;
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
