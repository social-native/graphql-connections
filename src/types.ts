import {ORDER_DIRECTION} from './enums';

export interface IFilter {
    value: string;
    operator: string;
    field: string | number | null;
}

export interface ICompoundFilter {
    and?: IInputFilter[];
    or?: IInputFilter[];
    not?: IInputFilter[];
}

export type IInputFilter = IFilter | ICompoundFilter;

export interface ICursorObj<PublicAttributes> {
    orderDir: keyof typeof ORDER_DIRECTION;
    orderBy: PublicAttributes;
    // The position of the cursor item from the beginning of the query
    position: number;
    filters: IInputFilter;
    search?: string;
}

export interface IInputArgs {
    before?: string;
    after?: string;
    first?: number;
    last?: number;
    orderBy?: string;
    orderDir?: keyof typeof ORDER_DIRECTION;
    filter?: IInputFilter;
    search?: string;
}

export interface IInAttributeMap {
    [nodeField: string]: string;
}

export interface IFilterMap {
    [nodeField: string]: string;
}

// QueryContext
export interface IQueryContext {
    limit: number;
    orderDir: keyof typeof ORDER_DIRECTION;
    orderBy: string;
    filters: IInputFilter;
    offset: number;
    search?: string;
    inputArgs: IInputArgs;
    previousCursor?: string;
    indexPosition: number;

    isPagingBackwards: boolean;
}

export interface IQueryContextOptions<CursorObj> {
    defaultLimit?: number;
    cursorEncoder?: ICursorEncoder<CursorObj>;
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

export type QueryBuilderOptions = IKnexQueryBuilderOptions | IKnexMySQLQueryBuilderOptions;

export interface IKnexQueryBuilderOptions {
    filterMap?: {[operator: string]: string};
    filterTransformer?: (filter: IFilter) => IFilter;
    useSuggestedValueLiteralTransforms?: boolean;
}

export interface IKnexMySQLQueryBuilderOptions extends IKnexQueryBuilderOptions {
    filterMap?: {[operator: string]: string};
    filterTransformer?: (filter: IFilter) => IFilter;
    useSuggestedValueLiteralTransforms?: boolean;
    searchColumns?: string[];
    searchModifier?:
        | 'IN NATURAL LANGUAGE MODE'
        | 'IN NATURAL LANGUAGE MODE WITH QUERY EXPANSION'
        | 'IN BOOLEAN MODE'
        | 'WITH QUERY EXPANSION'
        | string;
}

// QueryResult
export interface IQueryResult<Node> {
    edges: Array<{cursor: string; node: Node}>;
    pageInfo: {
        hasNextPage: boolean;
        hasPreviousPage: boolean;
        startCursor: string;
        endCursor: string;
    };
}

export type NodeTransformer<Node> = (node: any) => Node;

export interface IQueryResultOptions<CursorObj, Node> {
    cursorEncoder?: ICursorEncoder<CursorObj>;
    nodeTransformer?: NodeTransformer<Node>;
}
