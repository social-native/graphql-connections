import { QueryBuilder } from 'knex';
import { ICursorManager } from './CursorManager';
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
declare type FilterArgs<Fields> = Array<IFilter<Fields>>;
declare type KnexQueryResult = Array<{
    [attributeName: string]: any;
}>;
interface INode {
    id: number;
}
interface IFilterMap {
    [inputOperator: string]: string;
}
interface IConfig<CursorObj> {
    defaultLimit?: number;
    cursorManager?: ICursorManager<CursorObj>;
    filterMap?: IFilterMap;
}
interface IIntermediateCursorObj<PublicAttributes> {
    id?: number;
    firstResultId: number;
    lastResultId?: number;
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    filters: string[][];
}
interface ICursorObj<PublicAttributes> extends IIntermediateCursorObj<PublicAttributes> {
    id: number;
    firstResultId: number;
    lastResultId?: number;
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
}
interface IAttributeMap {
    [nodeAttribute: string]: string;
}
declare class ConnectionManager<Node extends INode, CursorArgs extends ICursorArgs, SpecificFilterArgs extends FilterArgs<any>> {
    defaultLimit: number;
    limit: number;
    private cursorArgs;
    private filterArgs;
    private cursorManager;
    private previousCursor?;
    private attributeMap;
    private filterMap;
    private orderBy;
    private orderDirection;
    private filters;
    constructor(cursorArgs: CursorArgs, filterArgs: SpecificFilterArgs, attributeMap: IAttributeMap, config?: IConfig<ICursorObj<string>>);
    createQuery(queryBuilder: QueryBuilder): void;
    createPageInfo(queryResult: KnexQueryResult): {
        hasPreviousPage: boolean;
        hasNextPage: boolean;
    };
    createEdges(queryResult: KnexQueryResult): {
        cursor: string;
        node: Node;
    }[];
    /**
     * Sets the limit for the NodeConnectionMaestro instance
     */
    private calcLimit;
    /**
     * Sets the orderDirection and orderBy for the NodeConnectionMaestro instance
     */
    private calcOrder;
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    private calcPreviousCursor;
    private calcFilters;
    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and `after` together
     *    or
     *   `last` and `before` together
     */
    private validateArgs;
    /**
     * Adds the limit to the query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    private setLimit;
    /**
     * Changes the order to descending if the we are paginating backwards
     * The fact that we are paginating backwards is indicated by the presence
     * of either a `last` limit or `before` cursor
     *
     */
    private setOrder;
    /**
     * Adds filters to the sql query builder
     */
    private setFilter;
    /**
     * If a previous cursor is present, this allows the new query to
     * pick up from where the old cursor left off
     */
    private setStartingId;
    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    private hasNextPage;
    /**
     * Compares the current pageing direction (as indicated `first` and `last` args)
     * and compares to what the original sort direction was (as found in the cursor)
     */
    private isPagingBackwards;
    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    private hasPrevPage;
    /**
     * It is very likely the results we get back from the datastore
     * have additional fields than what the GQL type node supports.
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    private createNodes;
    private createCursorObj;
    private createEdgesFromNodes;
}
export { ConnectionManager, INode, ICursorArgs, FilterArgs };
