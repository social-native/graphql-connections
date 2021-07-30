import {DateTime} from 'luxon';
import {FilterTransformer, IFilter} from './types';

/** Given filter values in unix seconds, this will convert the filters to mysql timestamps. */
function castUnixSecondsFiltersToMysqlTimestamps<T extends Record<string, unknown>>(
    filterFieldsToCast: Array<keyof T>,
    includeOffset = false,
    includeZone = false
): FilterTransformer {
    // tslint:disable-next-line: cyclomatic-complexity
    return (filter: IFilter): IFilter => {
        if (filterFieldsToCast.includes(filter.field) && filter.value && filter.value !== 'null') {
            if (!isNumberOrString(filter.value)) {
                throw new Error(`Cannot parse timestamp filter: ${filter.field}`);
            }

            const filterValue =
                typeof filter.value === 'string' ? Number(filter.value) : filter.value;

            return {
                ...filter,
                value: DateTime.fromSeconds(filterValue).toSQL({
                    includeOffset,
                    includeZone
                })
            };
        }
        return filter;
    };
}

function isNumberOrString(value: string | number | boolean): value is string | number {
    return ['number', 'string'].includes(typeof value);
}

/**
 * Run a number of filter transformers from left to right on an IFilter.
 */
function compose(...transformers: FilterTransformer[]): FilterTransformer {
    return (filter: IFilter) =>
        transformers.reduce((accum, transformer) => {
            return transformer(accum);
        }, filter);
}

export default {castUnixSecondsFiltersToMysqlTimestamps, compose};
