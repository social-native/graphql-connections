export interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}
export declare type FilterArgs<Fields> = Array<IFilter<Fields>>;
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
export interface INode {
    id: number;
}
export interface IAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}
export interface IQueryContext<F> {
    limit: number;
    orderDirection: 'asc' | 'desc';
    orderBy: string;
    filters: string[][];
    offset: number;
    cursorArgs: ICursorArgs;
    filterArgs: F;
    previousCursor?: string;
    indexPosition: number;
}
export interface ICursorEncoder<CursorObj> {
    encodeToCursor: (cursorObj: CursorObj) => string;
    decodeFromCursor: (cursor: string) => CursorObj;
}
export interface IQueryBuilder<Builder> {
    applyQuery: (queryBuilder: Builder) => Builder;
}
