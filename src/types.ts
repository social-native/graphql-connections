interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}

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

// The shape of input args for filters
export type FilterArgs<Fields> = Array<IFilter<Fields>>;

export interface IAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}

// CursorEncoder
export interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}

// QueryBuilder
export interface IQueryBuilder<Builder> {
    applyQuery: (queryBuilder: Builder) => Builder;
}
