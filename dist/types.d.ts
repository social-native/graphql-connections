interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}
export declare type FilterArgs<Fields> = Array<IFilter<Fields>>;
export interface IAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}
export interface IQueryBuilder<Builder> {
    applyQuery: (queryBuilder: Builder) => Builder;
}
export {};
