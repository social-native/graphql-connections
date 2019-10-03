import CursorEncoder from './cursor_encoder';
import {
    ICursorEncoder,
    ICursorObj,
    IQueryContext,
    IInputArgs,
    IQueryContextOptions,
    IInputFilter,
    ICompoundFilter
} from './types';
import {ORDER_DIRECTION} from './enums';

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
    orderDir?: keyof typeof ORDER_DIRECTION;
    filter: IInputFilter;
    search?: string;
}

export default class QueryContext implements IQueryContext {
    public limit: number;
    public orderDir: keyof typeof ORDER_DIRECTION;
    public orderBy: string;
    public search?: string;
    /**
     * { or: [
     *     { field: 'username', operator: '=', value: 'haxor1'},
     *     { field: 'created_at', operator: '>=', value: '90002012'}
     * ]}
     */
    public filters: IInputFilter;
    public offset: number;
    public inputArgs: IQueryContextInputArgs;
    public previousCursor?: string;
    public indexPosition: number;

    private defaultLimit: number; // actual limit value used
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;

    constructor(
        inputArgs: IInputArgs = {},
        options: IQueryContextOptions<ICursorObj<string>> = {}
    ) {
        this.inputArgs = {
            filter: {},
            ...inputArgs
        } as IQueryContextInputArgs;
        this.validateArgs();

        // private
        this.cursorEncoder = options.cursorEncoder || CursorEncoder;
        this.defaultLimit = options.defaultLimit || 1000;

        // public
        this.previousCursor = this.calcPreviousCursor();
        // the index position of the cursor in the total result set
        this.indexPosition = this.calcIndexPosition();
        this.limit = this.calcLimit();
        this.orderBy = this.calcOrderBy();
        this.orderDir = this.calcOrderDirection();
        this.filters = this.calcFilters();
        this.offset = this.calcOffset();
        this.search = this.calcSearch();
    }

    /**
     * Checks if there is a 'before or 'last' arg which is used to reverse paginate
     */
    public get isPagingBackwards() {
        if (!this.previousCursor) {
            return false;
        }

        const {before, last} = this.inputArgs;
        return !!(last || before);
    }

    /**
     * Sets the limit for the desired query result
     */
    private calcLimit() {
        const {first, last} = this.inputArgs;

        const limit = first || last || this.defaultLimit;
        // If you are paging backwards, you need to make sure that the limit
        // isn't greater or equal to the index position.
        // This is because the limit is used to calculate the offset.
        // You don't want to offset larger than the set size.
        if (this.isPagingBackwards) {
            return limit < this.indexPosition ? limit : this.indexPosition - 1;
        }
        return limit;
    }

    /**
     * Sets the orderBy for the desired query result
     */
    private calcOrderBy() {
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            return prevCursorObj.orderBy;
        } else if (this.inputArgs.search && !this.inputArgs.orderBy) {
            return '_relevance';
        } else {
            return this.inputArgs.orderBy || 'id';
        }
    }

    /**
     * Sets the orderDirection for the desired query result
     */
    private calcOrderDirection() {
        // tslint:disable-next-line
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            return prevCursorObj.orderDir;
        } else if (
            this.inputArgs.orderDir &&
            Object.keys(ORDER_DIRECTION).includes(this.inputArgs.orderDir)
        ) {
            return this.inputArgs.orderDir;
        } else {
            const dir =
                this.inputArgs.last || this.inputArgs.before || this.inputArgs.search
                    ? ORDER_DIRECTION.desc
                    : ORDER_DIRECTION.asc;
            return (dir as any) as keyof typeof ORDER_DIRECTION;
        }
    }

    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    private calcPreviousCursor() {
        const {before, after} = this.inputArgs;
        return before || after;
    }

    /**
     * Extracts the filters from the resolver filterArgs
     */
    private calcFilters() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).filters;
        }

        if (!this.inputArgs.filter) {
            return {};
        }

        return this.inputArgs.filter;
    }

    /**
     * Extracts the search string from the resolver cursorArgs
     */
    private calcSearch() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).search;
        }
        const {search} = this.inputArgs;
        return search;
    }

    /**
     * Gets the index position of the cursor in the total possible result set
     */
    private calcIndexPosition() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).position;
        }

        return 0;
    }

    /**
     * Gets the offset that the current query should start at in the total possible result set
     */
    private calcOffset() {
        if (this.isPagingBackwards) {
            const offset = this.indexPosition - (this.limit + 1);
            return offset < 0 ? 0 : offset;
        }
        return this.indexPosition;
    }

    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and/or `after` together
     *    or
     *   `last` and/or `before` together
     */
    private validateArgs() {
        if (!this.inputArgs) {
            throw Error('Input args are required');
        }
        const {first, last, before, after, orderBy, orderDir, search} = this.inputArgs;

        // tslint:disable
        if (first && last) {
            throw Error('Can not mix `first` and `last`');
        } else if (before && after) {
            throw Error('Can not mix `before` and `after`');
        } else if (before && first) {
            throw Error('Can not mix `before` and `first`');
        } else if (after && last) {
            throw Error('Can not mix `after` and `last`');
        } else if ((after || before) && orderBy) {
            throw Error('Can not use orderBy with a cursor');
        } else if ((after || before) && orderDir) {
            throw Error('Can not use orderDir with a cursor');
        } else if (
            (after || before) &&
            ((this.inputArgs.filter as ICompoundFilter).and ||
                (this.inputArgs.filter as ICompoundFilter).or)
        ) {
            throw Error('Can not use filters with a cursor');
        } else if (last && !before) {
            throw Error(
                'Can not use `last` without a cursor. Use `first` to set page size on the initial query'
            );
        } else if ((first != null && first <= 0) || (last != null && last <= 0)) {
            throw Error('Page size must be greater than 0');
        } else if (search && orderDir && orderBy) {
            throw Error(
                'Search order is implicitly descending. OrderDir should only be provided with an orderBy.'
            );
        }
        // tslint:enable
    }
}
