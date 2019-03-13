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
interface IConfig<CursorObj> {
    defaultLimit?: number;
    cursorEncoder?: ICursorEncoder<CursorObj>;
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
export default class QueryContext<SpecificFilterArgs extends FilterArgs<any>> {
    limit: number;
    orderDirection: 'asc' | 'desc';
    orderBy: string;
    filters: string[][];
    offset: number;
    cursorArgs: ICursorArgs;
    filterArgs: SpecificFilterArgs;
    previousCursor?: string;
    indexPosition: number;
    private defaultLimit;
    private cursorEncoder;
    constructor(cursorArgs: ICursorArgs, filterArgs: SpecificFilterArgs, config?: IConfig<ICursorObj<string>>);
    /**
     * Compares the current paging direction (as indicated `first` and `last` args)
     * and compares to what the original sort direction was (as found in the cursor)
     */
    readonly isPagingBackwards: boolean;
    /**
     * Sets the limit for the desired query result
     */
    private calcLimit;
    /**
     * Sets the orderDirection and orderBy for the desired query result
     */
    private calcOrder;
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    private calcPreviousCursor;
    private calcFilters;
    /**
     * Gets the index position of the cursor in the total result set
     */
    private calcIndexPosition;
    /**
     * Gets the offset the current query should start at in the current result set
     */
    private calcOffset;
    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and `after` together
     *    or
     *   `last` and `before` together
     */
    private validateArgs;
}
export {};
