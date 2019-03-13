import { QueryBuilder as Knex } from 'knex';
import { ICursorEncoder } from './CursorEncoder';
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
    cursorEncoder?: ICursorEncoder<CursorObj>;
    filterMap?: IFilterMap;
}
interface IIntermediateCursorObj<PublicAttributes> {
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    filters: string[][];
}
interface ICursorObj<PublicAttributes> extends IIntermediateCursorObj<PublicAttributes> {
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    position: number;
    filters: string[][];
}
interface IAttributeMap {
    [nodeAttribute: string]: string;
}
declare class ConnectionManager<Node extends INode, SpecificFilterArgs extends FilterArgs<any>> {
    private queryContext;
    private queryBuilder;
    private cursorEncoder;
    private attributeMap;
    private filterMap;
    constructor(cursorArgs: ICursorArgs, filterArgs: SpecificFilterArgs, attributeMap: IAttributeMap, config?: IConfig<ICursorObj<string>>);
    createQuery(queryBuilder: Knex): Knex;
    createPageInfo(queryResult: KnexQueryResult): {
        hasPreviousPage: boolean;
        hasNextPage: boolean;
    };
    createEdges(queryResult: KnexQueryResult): {
        cursor: string;
        node: Node;
    }[];
    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    private hasNextPage;
    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    private hasPrevPage;
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
export { ConnectionManager, INode, ICursorArgs, FilterArgs };
