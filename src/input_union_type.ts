import {
    GraphQLInputObjectType,
    GraphQLScalarType,
    isValidLiteralValue,
    valueFromAST,
    GraphQLError,
    coerceValue
} from 'graphql';

const printInputType = (type: GraphQLInputObjectType) => {
    const fields = type.getFields();
    const fieldNames = Object.keys(fields);
    const typeSig = fieldNames.reduce(
        (acc, name) => {
            acc[name] = fields[name].type.toString();
            return acc;
        },
        {} as {
            [field: string]: string;
        }
    );
    return JSON.stringify(typeSig)
        .replace(/[\\"]/gi, '')
        .replace(/[:]/gi, ': ')
        .replace(/[,]/gi, ', ');
};

const generateInputTypeError = (typeName: string, inputTypes: GraphQLInputObjectType[]) => {
    const validTypes = inputTypes
        .map(t => `${t.name} \`${printInputType(t)}\``)
        .map((t, i) => `${i > 0 ? ' or ' : ''}${t}`);
    return new GraphQLError(`${typeName} should be composed of either: ${validTypes}`);
};

export default (typeName: string, inputTypes: GraphQLInputObjectType[], description?: string) => {
    return new GraphQLScalarType({
        name: typeName,
        description,
        serialize: (value: any) => value,
        parseValue: (value: any) => {
            const hasType = inputTypes.reduce((acc, t) => {
                const result = coerceValue(value, t);
                return result.errors && result.errors.length > 0 ? acc : true;
            }, false);

            if (hasType) {
                return value;
            }
            throw generateInputTypeError(typeName, inputTypes);
        },
        parseLiteral: ast => {
            const inputType = inputTypes.reduce((acc: any, type) => {
                const astClone = JSON.parse(JSON.stringify(ast));
                try {
                    return isValidLiteralValue(type, astClone).length === 0 ? type : acc;
                } catch (e) {
                    return acc;
                }
            }, undefined);
            if (inputType) {
                return valueFromAST(ast, inputType);
            }
            throw generateInputTypeError(typeName, inputTypes);
        }
    }) as GraphQLScalarType;
};
