const hasDotRegexp = /\./gi;

// tslint:disable-next-line: cyclomatic-complexity
export function coerceStringValue(value: string) {
    /**
     * Only try casting to float if there's at least one `.`
     *
     * This MUST come before parseInt because parseInt will succeed to
     * parse a float but it will be lossy, e.g.
     * parseInt('1.24242', 10) === 1
     */
    if (hasDotRegexp.test(value) && !isNaN(parseFloat(value))) {
        return parseFloat(value);
    }

    if (!isNaN(parseInt(value, 10))) {
        const parsed = parseInt(value, 10);

        return parsed;
    }

    if (['true', 'false'].includes(value.toLowerCase())) {
        return value.toLowerCase() === 'true';
    }

    if (value.toLowerCase() === 'null') {
        return null;
    }

    return value;
}
