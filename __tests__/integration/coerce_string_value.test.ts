import {coerceStringValue} from '../../src/coerce_string_value';

describe('coerceStringValue', function() {
    it('coerces boolean strings', function() {
        const tests: Array<[string, boolean]> = [
            ['true', true],
            ['TRUE', true],
            ['false', false],
            ['FALSE', false]
        ];

        for (const [input, expectedOutput] of tests) {
            expect(coerceStringValue(input)).toEqual(expectedOutput);
        }
    });

    it('does not use auto trimming to coerce string to number', function() {
        expect(coerceStringValue('1.24 cows')).toEqual('1.24 cows');
    });

    it('ignores empty strings', function() {
        expect(coerceStringValue('')).toEqual('');
    });

    it('coerces float strings', function() {
        expect(coerceStringValue('1.22334')).toEqual(1.22334);
    });

    it('coerces int strings', function() {
        expect(coerceStringValue('5')).toEqual(5);
    });

    it('coerces null strings', function() {
        for (const input of ['NULL', 'null', 'nUlL']) {
            expect(coerceStringValue(input)).toBeNull();
        }
    });

    it('preserves strings that are not coercible', function() {
        const preserved = 'This is a really long sentence.';

        expect(coerceStringValue(preserved)).toEqual(preserved);
    });
});
