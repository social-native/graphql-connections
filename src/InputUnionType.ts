import {
    GraphQLInputObjectType,
    GraphQLScalarType,
    isValidLiteralValue,
    valueFromAST,
    GraphQLError
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

export default (typeName: string, inputTypes: GraphQLInputObjectType[]) => {
    return new GraphQLScalarType({
        name: typeName,
        serialize: (value: any) => value,
        parseValue: () => {
            return 2;
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
            } else {
                const validTypes = inputTypes
                    .map(t => `${t.name} ${printInputType(t)}`)
                    .map((t, i) => `${i > 0 ? ' or ' : ''}${t}`);
                throw new GraphQLError(`${typeName} should be composed of either: ${validTypes}`);
            }
        }
    }) as GraphQLScalarType;
};
