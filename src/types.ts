interface IFilter<Fields> {
    value: string;
    operator: string;
    field: Fields;
}

// The shape of input args for filters
export type FilterArgs<Fields> = Array<IFilter<Fields>>;

export interface IAttributeMap {
    [nodeField: string]: string;
}
export interface IFilterMap {
    [nodeField: string]: string;
}

// QueryBuilder
export interface IQueryBuilder<Builder> {
    applyQuery: (queryBuilder: Builder) => Builder;
}
