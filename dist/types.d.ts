export interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}
export interface ICursorArgs {
    first?: number;
    last?: number;
    before?: string;
    after?: string;
    orderBy?: string;
}
export interface ICursorObj<PublicAttributes> {
    initialSort: 'asc' | 'desc';
    orderBy: PublicAttributes;
    position: number;
    filters: string[][];
}
export interface IInputArgs {
    cursor?: {
        before?: string;
        after?: string;
    };
    page?: {
        first?: number;
        last?: number;
    };
    order?: {
        orderBy?: string;
    };
    filter?: Array<IFilter<string>>;
}
export interface INode extends Array<{
    [field: string]: any;
}> {
}
export interface IAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}
export interface IQueryContext {
    limit: number;
    orderDirection: 'asc' | 'desc';
    orderBy: string;
    filters: string[][];
    offset: number;
    inputArgs: IInputArgs;
    previousCursor?: string;
    indexPosition: number;
    isPagingBackwards: boolean;
}
export interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
export interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}
export interface IQueryResult<Node> {
    nodes: Node[];
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
    hasNextPage: boolean;
    hasPrevPage: boolean;
    startCursor: string;
    endCursor: string;
}
