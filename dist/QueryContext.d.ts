import { ICursorObj, IQueryContext, IInputArgs, IQueryContextOptions, IInputFilter } from './types';
/**
 * QueryContext
 *
 * Sets the context for the current connection based on input resolver args
 *
 */
interface IQueryContextInputArgs extends IInputArgs {
    before?: string;
    after?: string;
    first?: number;
    last?: number;
    orderBy?: string;
    filter: IInputFilter;
}
export default class QueryContext implements IQueryContext {
    limit: number;
    orderDirection: 'asc' | 'desc';
    orderBy: string;
    /**
     * { or: [
     *     { field: 'username', operator: '=', value: 'haxor1'},
     *     { field: 'created_at', operator: '>=', value: '90002012'}
     * ]}
     */
    filters: IInputFilter;
    offset: number;
    inputArgs: IQueryContextInputArgs;
    previousCursor?: string;
    indexPosition: number;
    private defaultLimit;
    private cursorEncoder;
    constructor(inputArgs?: IInputArgs, options?: IQueryContextOptions<ICursorObj<string>>);
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
     * Sets the orderBy for the desired query result
     */
    private calcOrderBy;
    /**
     * Sets the orderDirection for the desired query result
     */
    private calcOrderDirection;
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    private calcPreviousCursor;
    /**
     * Extracts the filters from the resolver filterArgs
     */
    private calcFilters;
    /**
     * Gets the index position of the cursor in the total possible result set
     */
    private calcIndexPosition;
    /**
     * Gets the offset that the current query should start at in the total possible result set
     */
    private calcOffset;
    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and/or `after` together
     *    or
     *   `last` and/or `before` together
     */
    private validateArgs;
}
export {};
