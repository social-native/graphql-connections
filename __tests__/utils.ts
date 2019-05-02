import {SuperAgentRequest} from 'superagent';

export const validateNodesHaveAttributes = (
    edges: Array<{node: {[attr: string]: any}}>,
    attributes: {[attr: string]: any}
) => {
    const attributesToValidate = Object.keys(attributes);
    return edges.reduce((acc: boolean, {node}) => {
        return (
            acc &&
            attributesToValidate.reduce((exist: boolean, attr) => {
                return exist && node[attr] === attributes[attr];
            }, true)
        );
    }, true);
};

export const rejectionOf = (promise: Promise<any>) =>
    promise.then(
        value => {
            throw value;
        },
        reason => reason
    );

export const validateFieldIsOrderedAlphabetically = (
    edges: Array<{node: {[attr: string]: string}}>,
    field: string,
    compareFn: (stringOne: string, stringTwo: string) => boolean
) => {
    return edges.reduce((acc: boolean, {node}, index, arr) => {
        if (arr.length > index + 1) {
            const first = node[field];
            const second = arr[index + 1].node[field];
            return acc && compareFn(first, second);
        } else {
            return acc;
        }
    }, true);
};

export const createGQLRequest = (query: string, variables?: any) => {
    return (request: SuperAgentRequest) => {
        return request.set('Content-Type', 'application/json').send({query, variables});
    };
};
