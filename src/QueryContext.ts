import CursorEncoder from './CursorEncoder';
import {
    ICursorEncoder,
    ICursorObj,
    IQueryContext,
    IInputArgs,
    IQueryContextOptions,
    IOperationFilter
} from './types';

/**
 * QueryContext
 *
 * Sets the context for the current connection based on input resolver args
 *
 */

interface IQueryContextInputArgs extends IInputArgs {
    cursor: {
        before?: string;
        after?: string;
    };
    page: {
        first?: number;
        last?: number;
    };
    order: {
        orderBy?: string;
    };
    filter: IOperationFilter;
}

const ORDER_DIRECTION = {
    asc: 'asc',
    desc: 'desc'
};

export default class QueryContext implements IQueryContext {
    public limit: number;
    public orderDirection: 'asc' | 'desc';
    public orderBy: string;
    // [['username', '=', 'haxor1'], ['created_at', '>=', '90002012']]
    public filters: IOperationFilter | {};
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
        this.inputArgs = {page: {}, cursor: {}, filter: {}, order: {}, ...inputArgs};
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
        this.orderDirection = this.calcOrderDirection();
        this.filters = this.calcFilters();
        this.offset = this.calcOffset();
    }

    /**
     * Compares the current paging direction (as indicated `first` and `last` args)
     * and compares to what the original sort direction was (as found in the cursor)
     */
    public get isPagingBackwards() {
        if (!this.previousCursor) {
            return false;
        }

        const {first, last} = this.inputArgs.page;
        const {before, after} = this.inputArgs.cursor;
        const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);

        // tslint:disable-line
        return !!(
            (prevCursorObj.initialSort === ORDER_DIRECTION.asc && (last || before)) ||
            (prevCursorObj.initialSort === ORDER_DIRECTION.desc && (first || after))
        );
    }

    /**
     * Sets the limit for the desired query result
     */
    private calcLimit() {
        const {first, last} = this.inputArgs.page;

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
        } else {
            return this.inputArgs.order.orderBy || 'id';
        }
    }

    /**
     * Sets the orderDirection for the desired query result
     */
    private calcOrderDirection() {
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            return prevCursorObj.initialSort;
        } else {
            const dir =
                this.inputArgs.page.last || this.inputArgs.cursor.before
                    ? ORDER_DIRECTION.desc
                    : ORDER_DIRECTION.asc;
            return (dir as any) as 'asc' | 'desc';
        }
    }

    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    private calcPreviousCursor() {
        const {before, after} = this.inputArgs.cursor;
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
        const {first, last} = this.inputArgs.page;
        const {before, after} = this.inputArgs.cursor;
        const {orderBy} = this.inputArgs.order;

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
        } else if ((after || before) && (this.inputArgs.filter.and || this.inputArgs.filter.or)) {
            throw Error('Can not use filters with a cursor');
        } else if ((first != null && first <= 0) || (last != null && last <= 0)) {
            throw Error('Page size must be greater than 0');
        }
        // tslint:enable
    }
}
