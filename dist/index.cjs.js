'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class CursorManager {
    static createCursor(cursorObj) {
        const buff = new Buffer(JSON.stringify(cursorObj));
        return buff.toString('base64');
    }
    static getCursorObj(cursor) {
        const buff = new Buffer(cursor, 'base64');
        const json = buff.toString('ascii');
        return JSON.parse(json);
    }
}

const defaultFilterMap = {
    '>': '>',
    '>=': '>=',
    '=': '=',
    '<': '<',
    '<=': '<='
};
// tslint:disable:max-classes-per-file
class ConnectionManager {
    constructor(cursorArgs, filterArgs, attributeMap, config = {}) {
        this.defaultLimit = config.defaultLimit || 1000;
        this.cursorArgs = cursorArgs;
        this.filterArgs = filterArgs;
        this.cursorManager = config.cursorManager || CursorManager;
        this.attributeMap = attributeMap;
        this.filterMap = config.filterMap || defaultFilterMap;
        this.limit = this.calcLimit();
        this.previousCursor = this.calcPreviousCursor();
        const { orderBy, orderDirection } = this.calcOrder();
        this.orderBy = orderBy;
        this.orderDirection = orderDirection;
        this.filters = this.calcFilters();
        this.validateArgs();
    }
    createQuery(queryBuilder) {
        this.setLimit(queryBuilder);
        this.setOrder(queryBuilder);
        this.setStartingId(queryBuilder);
        this.setFilter(queryBuilder);
    }
    createPageInfo(queryResult) {
        return {
            hasPreviousPage: this.hasPrevPage(queryResult),
            hasNextPage: this.hasNextPage(queryResult)
        };
    }
    createEdges(queryResult) {
        const nodes = this.createNodes(queryResult);
        const cursorObj = this.createCursorObj(queryResult, nodes);
        return this.createEdgesFromNodes(nodes, cursorObj);
    }
    /**
     * Sets the limit for the NodeConnectionMaestro instance
     */
    calcLimit() {
        const { first, last } = this.cursorArgs;
        return first || last || this.defaultLimit;
    }
    /**
     * Sets the orderDirection and orderBy for the NodeConnectionMaestro instance
     */
    calcOrder() {
        let orderDirection;
        let orderBy;
        // tslint:disable-line
        if (this.previousCursor) {
            const prevCursorObj = this.cursorManager.getCursorObj(this.previousCursor);
            orderBy = prevCursorObj.orderBy;
            orderDirection = prevCursorObj.initialSort;
        }
        else {
            orderBy = this.cursorArgs.orderBy || 'id';
            orderDirection = this.cursorArgs.last || this.cursorArgs.before ? 'desc' : 'asc';
        }
        return { orderBy, orderDirection: orderDirection };
    }
    /**
     * Extracts the previous cursor from the resolver cursorArgs
     */
    calcPreviousCursor() {
        const { before, after } = this.cursorArgs;
        return before || after;
    }
    calcFilters() {
        if (this.previousCursor) {
            return this.cursorManager.getCursorObj(this.previousCursor).filters;
        }
        if (!this.filterArgs) {
            return [];
        }
        return this.filterArgs.reduce((builtFilters, { field, value, operator }) => {
            builtFilters.push([field, operator, value]);
            return builtFilters;
        }, []);
    }
    /**
     * Validates that the user is using the connection query correctly
     * For the most part this means that they are either using
     *   `first` and `after` together
     *    or
     *   `last` and `before` together
     */
    validateArgs() {
        const { first, last, before, after, orderBy } = this.cursorArgs;
        // tslint:disable
        if (first && last) {
            throw Error('Can not mix `first` and `last`');
        }
        else if (before && after) {
            throw Error('Can not mix `before` and `after`');
        }
        else if (before && first) {
            throw Error('Can not mix `before` and `first`');
        }
        else if (after && last) {
            throw Error('Can not mix `after` and `last`');
        }
        else if ((after || before) && orderBy) {
            throw Error('Can not use orderBy with a cursor');
        }
        else if ((after || before) && this.filterArgs) {
            throw Error('Can not use filters with a cursor');
        }
        // tslint:enable
    }
    /**
     * Adds the limit to the query builder.
     *     Note: The limit added to the query builder is limit + 1
     *     to allow us to see if there would be additional pages
     */
    setLimit(queryBuilder) {
        queryBuilder.limit(this.limit + 1); // add one to figure out if there are more results
    }
    /**
     * Changes the order to descending if the we are paginating backwards
     * The fact that we are paginating backwards is indicated by the presence
     * of either a `last` limit or `before` cursor
     *
     */
    setOrder(queryBuilder) {
        // map from node attribute names to sql column names
        const orderBy = this.attributeMap[this.orderBy] || 'id';
        let direction;
        // set the reverse order if paging backwards
        if (this.isPagingBackwards()) {
            direction = this.orderDirection === 'asc' ? 'desc' : 'asc';
        }
        else {
            direction = this.orderDirection;
        }
        queryBuilder.orderBy(orderBy, direction);
    }
    /**
     * Adds filters to the sql query builder
     */
    setFilter(queryBuilder) {
        this.filters.forEach(filter => {
            queryBuilder.andWhere(this.attributeMap[filter[0]], // map attribute name to sql attribute name
            this.filterMap[filter[1]], // map operator to sql attribute
            filter[2]);
        });
    }
    /**
     * If a previous cursor is present, this allows the new query to
     * pick up from where the old cursor left off
     */
    setStartingId(queryBuilder) {
        const { before, after } = this.cursorArgs;
        if (before) {
            queryBuilder.where('id', '<', this.cursorManager.getCursorObj(before).id);
        }
        else if (after) {
            queryBuilder.where('id', '>', this.cursorManager.getCursorObj(after).id);
        }
    }
    /**
     * We over extend the limit size by 1.
     * If the results are larger in size than the limit
     * we can assume there are additional pages.
     */
    hasNextPage(result) {
        return result.length > this.limit;
    }
    /**
     * Compares the current pageing direction (as indicated `first` and `last` args)
     * and compares to what the original sort direction was (as found in the cursor)
     */
    isPagingBackwards() {
        if (!this.previousCursor) {
            return false;
        }
        const { first, last, before, after } = this.cursorArgs;
        const prevCursorObj = this.cursorManager.getCursorObj(this.previousCursor);
        // tslint:disable-line
        return !!((prevCursorObj.initialSort === 'asc' && (last || before)) ||
            (prevCursorObj.initialSort === 'desc' && (first || after)));
    }
    /**
     * We record the id of the last result on the last page, if we ever get to it.
     * If this id is in the result set and we are paging away from it, then we don't have a previous page.
     * Otherwise, we will always have a previous page unless we are on the first page.
     */
    hasPrevPage(result) {
        // if there is no cursor, than this is the first page
        // which means there is no previous page
        if (!this.previousCursor) {
            return false;
        }
        const prevCursorObj = this.cursorManager.getCursorObj(this.previousCursor);
        if (this.isPagingBackwards()) {
            // If we are going in the direction that is opposite from the initial query,
            // we always have a previous page unless the lastResultId is both: present and included in the current
            // search results
            const lastResultId = prevCursorObj.lastResultId;
            return lastResultId
                ? result.reduce((acc, r) => r.id !== lastResultId && acc, true)
                : true;
        }
        else {
            // If we are going in the direction of the original query
            // we only have a previous page if the first item in the first search isn't present in the current
            // search results
            const firstResultId = prevCursorObj.firstResultId;
            return result
                .slice(0, this.limit)
                .reduce((acc, r) => r.id !== firstResultId && acc, true);
        }
    }
    /**
     * It is very likely the results we get back from the datastore
     * have additional fields than what the GQL type node supports.
     * Here we remove all attributes from the result nodes that are not in
     * the `nodeAttrs` list (keys of the attribute map).
     * Furthermore, we also trim down the result set to be within the limit size;
     */
    createNodes(result) {
        return result
            .map(node => {
            const attributes = Object.keys(node);
            attributes.forEach(attr => {
                if (!Object.keys(this.attributeMap).includes(attr)) {
                    delete node[attr];
                }
            });
            return { ...node };
        })
            .slice(0, this.limit);
    }
    createCursorObj(result, nodes) {
        let firstResultId;
        // let initialSort: ICursorObj<string>['initialSort'];
        let lastResultId;
        const { before, after } = this.cursorArgs;
        const prevCursor = before || after;
        if (prevCursor) {
            const prevCursorObj = this.cursorManager.getCursorObj(prevCursor);
            firstResultId = prevCursorObj.firstResultId;
            // initialSort = prevCursorObj.initialSort;
            lastResultId = prevCursorObj.lastResultId;
        }
        else {
            firstResultId = nodes[0].id;
            // initialSort = before || last ? 'desc' : 'asc';
        }
        // tslint:disable-line
        if (!this.hasNextPage(result) && !this.isPagingBackwards() && nodes.length > 0) {
            lastResultId = nodes.slice(-1)[0].id;
        }
        return {
            firstResultId,
            lastResultId,
            initialSort: this.orderDirection,
            filters: this.filters,
            orderBy: this.orderBy
        };
    }
    createEdgesFromNodes(nodes, cursorObj) {
        return nodes.map(node => ({
            cursor: this.cursorManager.createCursor({ ...cursorObj, id: node.id }),
            node
        }));
    }
}

exports.ConnectionManager = ConnectionManager;
exports.CursorManager = CursorManager;
