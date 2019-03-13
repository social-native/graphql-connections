import CursorEncoder from './CursorEncoder';
import {ICursorArgs, FilterArgs, ICursorEncoder, ICursorObj, IQueryContext} from './types';

interface IQueryContextConfig<CursorObj> {
    defaultLimit?: number;
    cursorEncoder?: ICursorEncoder<CursorObj>;
}

export default class QueryContext<SpecificFilterArgs extends FilterArgs<any>>
    implements IQueryContext<SpecificFilterArgs> {
    public limit: number;
    public orderDirection: 'asc' | 'desc';
    public orderBy: string;
    public filters: string[][]; // [['username', '=', 'haxor1'], ['created_at', '>=', '90002012']]
    public offset: number;
    public cursorArgs: ICursorArgs;
    public filterArgs: SpecificFilterArgs;
    public previousCursor?: string;
    public indexPosition: number;

    private defaultLimit: number; // actual limit value used
    private cursorEncoder: ICursorEncoder<ICursorObj<string>>;

    constructor(
        cursorArgs: ICursorArgs,
        filterArgs: SpecificFilterArgs,
        config: IQueryContextConfig<ICursorObj<string>> = {}
    ) {
        this.cursorArgs = cursorArgs;
        this.validateArgs();

        // private
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.defaultLimit = config.defaultLimit || 1000;

        // public
        this.filterArgs = filterArgs;
        this.previousCursor = this.calcPreviousCursor();
        // the index position of the cursor in the total result set
        this.indexPosition = this.calcIndexPosition();
        this.limit = this.calcLimit();
        const {orderBy, orderDirection} = this.calcOrder();
        this.orderBy = orderBy;
        this.orderDirection = orderDirection;
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

        const {first, last, before, after} = this.cursorArgs;
        const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);

        // tslint:disable-line
        return !!(
            (prevCursorObj.initialSort === 'asc' && (last || before)) ||
            (prevCursorObj.initialSort === 'desc' && (first || after))
        );
    }

    /**
     * Sets the limit for the desired query result
     */
    private calcLimit() {
        const {first, last} = this.cursorArgs;

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
     * Sets the orderDirection and orderBy for the desired query result
     */
    private calcOrder() {
        let orderDirection;
        let orderBy: string;

        // tslint:disable-line
        if (this.previousCursor) {
            const prevCursorObj = this.cursorEncoder.decodeFromCursor(this.previousCursor);
            orderBy = prevCursorObj.orderBy;
            orderDirection = prevCursorObj.initialSort;
        } else {
            orderBy = this.cursorArgs.orderBy || 'id';
            orderDirection = this.cursorArgs.last || this.cursorArgs.before ? 'desc' : 'asc';
        }

        return {orderBy, orderDirection: orderDirection as 'desc' | 'asc'};
    }

    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    private calcPreviousCursor() {
        const {before, after} = this.cursorArgs;
        return before || after;
    }

    /**
     * Extracts the filters from the resolver filterArgs
     */
    private calcFilters() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).filters;
        }

        if (!this.filterArgs) {
            return [];
        }

        return this.filterArgs.reduce(
            (builtFilters, {field, value, operator}) => {
                builtFilters.push([field, operator, value]);
                return builtFilters;
            },
            [] as string[][]
        );
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
        const {first, last, before, after, orderBy} = this.cursorArgs;

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
        } else if ((after || before) && this.filterArgs) {
            throw Error('Can not use filters with a cursor');
        } else if ((first != null && first <= 0) || (last != null && last <= 0)) {
            throw Error('Page size must be greater than 0');
        }
        // tslint:enable
    }
}
