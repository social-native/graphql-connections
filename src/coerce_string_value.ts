const hasDotRegexp = /\./gi;

// tslint:disable-next-line: cyclomatic-complexity
export function coerceStringValue(value: string) {
    if (value === '') {
        return value;
    }

    /**
     * Only try casting to float if there's at least one `.`
     *
     * This MUST come before parseInt because parseInt will succeed to
     * parse a float but it will be lossy, e.g.
     * parseInt('1.24242', 10) === 1
     */
    if (hasDotRegexp.test(value) && !isNaN(Number(value))) {
        return Number(value);
    }

    if (!isNaN(Number(value))) {
        const parsed = Number(value);

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
