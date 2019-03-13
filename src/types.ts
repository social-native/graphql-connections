export interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}

// The shape of input args for filters
// export type Filters<Fields = string> = Array<IFilter<Fields>>;

// The shape of input args for a cursor
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
    // The position of the cursor item from the beginning of the query
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

// The shape of a connection node
export interface INode extends Array<{[field: string]: any}> {}

export interface IAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}

// QueryContext
export interface IQueryContext {
    limit: number;
    orderDirection: 'asc' | 'desc';
    orderBy: string;
    filters: string[][]; // [['username', '=', 'haxor1'], ['created_at', '>=', '90002012']]
    offset: number;
    inputArgs: IInputArgs;
    previousCursor?: string;
    indexPosition: number;

    isPagingBackwards: boolean;
}

// CursorEncoder
export interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}

// QueryBuilder
export interface IQueryBuilder<Builder> {
    createQuery: (queryBuilder: Builder) => Builder;
}

// QueryResult
export interface IQueryResult<Node> {
    nodes: Node[];
    edges: Array<{cursor: string; node: Node}>;
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
