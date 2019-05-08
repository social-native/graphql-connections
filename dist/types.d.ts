import { ORDER_DIRECTION } from './enums';
export interface IFilter {
    value: string;
    operator: string;
    field: string;
}
export interface ICompoundFilter {
    and?: IInputFilter[];
    or?: IInputFilter[];
    not?: IInputFilter[];
}
export declare type IInputFilter = IFilter | ICompoundFilter;
export interface ICursorObj<PublicAttributes> {
    orderDir: keyof typeof ORDER_DIRECTION;
    orderBy: PublicAttributes;
    position: number;
    filters: IInputFilter;
}
export interface IInputArgs {
    before?: string;
    after?: string;
    first?: number;
    last?: number;
    orderBy?: string;
    orderDir?: keyof typeof ORDER_DIRECTION;
    filter?: IInputFilter;
}
export interface IInAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}
export interface IQueryContext {
    limit: number;
    orderDir: keyof typeof ORDER_DIRECTION;
    orderBy: string;
    filters: IInputFilter;
    offset: number;
    inputArgs: IInputArgs;
    previousCursor?: string;
    indexPosition: number;
    isPagingBackwards: boolean;
}
export interface IQueryContextOptions<CursorObj> {
    defaultLimit?: number;
    cursorEncoder?: ICursorEncoder<CursorObj>;
}
export interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
export interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
export interface IQueryBuilderOptions {
    filterMap?: {
        [operator: string]: string;
    };
    filterTransformer?: (filter: IFilter) => IFilter;
}
export interface IQueryResult<Node> {
    edges: Array<{
        cursor: string;
        node: Node;
    }>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
        endCursor: string;
    };
}
export declare type NodeTransformer<Node> = (node: any) => Node;
export interface IQueryResultOptions<CursorObj, Node> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    nodeTransformer?: NodeTransformer<Node>;
}
