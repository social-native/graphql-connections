import {CursorEncoder, ICursorEncoder} from './CursorEncoder';

// The shape of input args for a cursor
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

// The shape of input args for filters
type FilterArgs<Fields> = Array<IFilter<Fields>>;

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
    // The position of the cursor item from the beginning of the query
    position: number;
    filters: string[][];
}

export default class QueryContext<SpecificFilterArgs extends FilterArgs<any>> {
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
        config: IConfig<ICursorObj<string>> = {}
    ) {
        this.cursorArgs = cursorArgs;
        this.validateArgs();

        // private
        this.defaultLimit = config.defaultLimit || 1000;
        this.filterArgs = filterArgs;
        this.cursorEncoder = config.cursorEncoder || CursorEncoder;
        this.previousCursor = this.calcPreviousCursor();
        // the index position of the cursor in the total result set
        this.indexPosition = this.calcIndexPosition();

        // public
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
        return first || last || this.defaultLimit;
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
     * Gets the index position of the cursor in the total result set
     */
    private calcIndexPosition() {
        if (this.previousCursor) {
            return this.cursorEncoder.decodeFromCursor(this.previousCursor).position;
        }

        return 0;
    }

    /**
     * Gets the offset the current query should start at in the current result set
     */
    private calcOffset() {
        if (this.isPagingBackwards) {
            return this.indexPosition - this.limit;
        }
        return this.indexPosition;
    }

    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and `after` together
     *    or
     *   `last` and `before` together
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
            console.log(first);
            throw Error('Page size must be greater than 0');
        }
        // tslint:enable
    }
}
