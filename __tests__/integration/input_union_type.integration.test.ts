import appProvider from '../app_provider';
import request from 'supertest';
import {createGQLRequest} from '../utils';

describe('Input Union Type', () => {
    const app = appProvider();

    describe('works with all unions', () => {
        it('not using variables', async () => {
            const gqlQuery = `#graphql
                query {
                    users(
                    filter:  {
                        or: [
                        { field: "age", value: "41", operator: "="},
                        { field: "age", value: "31", operator: "="},
                        { and: [
                            { field: "haircolor", value: "gray", operator: "="},
                            { field: "age", value: "70", operator: "="},
                            { not: [
                            { field: "firstname", value: "Kenyon", operator: "="},
                                { field: "firstname", value: "Nerissa", operator: "="},
                            ]}
                        ]},
                        ],
                    }) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery));

            expect(response.body.errors).toBeUndefined();
            expect(typeof response.body.data.users.edges[0].cursor).toEqual('string');
            expect(response.status).toBe(200);
        });

        it('using variables', async () => {
            const gqlQuery = `#graphql
                query($filter: Filter) {
                    users(filter: $filter) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const variables = `
            {
                "filter": { "or": [{ "field": "age", "value": "30", "operator": "=" }]}
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(response.body.errors).toBeUndefined();
            expect(typeof response.body.data.users.edges[0].cursor).toEqual('string');
            expect(response.status).toBe(200);
        });

        it('handles literal numeric filter', async function() {
            const gqlQuery = `#graphql
                query($filter: Filter) {
                    users(filter: $filter) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const variables = `
            {
                "filter": { "or": [{ "field": "age", "value": 30, "operator": "=" }]}
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(response.body.data.users.edges[0].node.age).toEqual(30);

            expect(response.status).toBe(200);
        });

        it('handles stringified numeric filter', async function() {
            const gqlQuery = `#graphql
                query($filter: Filter) {
                    users(filter: $filter) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const variables = `
            {
                "filter": { "or": [{ "field": "age", "value": "30", "operator": "=" }]}
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(response.body.data.users.edges[0].node.age).toEqual(30);

            expect(response.status).toBe(200);
        });

        it('handles literal boolean filter', async function() {
            const gqlQuery = `#graphql
                query($filter: Filter) {
                    users(first: 1, filter: $filter) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                    isPetOwner
                                }
                            }
                        }
                }
            `;

            const variables = `
            {
                "filter": { "or": [{ "field": "isPetOwner", "value": false, "operator": "=" }]}
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(response.body.errors).toBeUndefined();
            for (const edge of response.body.data.users.edges) {
                expect(edge.node.isPetOwner).toEqual(false);
            }
            expect(response.status).toBe(200);
        });

        it('handles stringified boolean filter', async function() {
            const gqlQuery = `#graphql
                query {
                    users(first: 1, filter: { field: "isPetOwner", value: "false", operator: "=" }) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                    isPetOwner
                                }
                            }
                        }
                }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery));

            expect(response.body.errors).toBeUndefined();
            for (const edge of response.body.data.users.edges) {
                expect(edge.node.isPetOwner).toEqual(false);
            }
            expect(response.status).toBe(200);
        });
    });

    describe('handles errors', () => {
        it('not using variables with compound filter', async () => {
            const gqlQuery = `#graphql
                query {
                    users(
                    filter:  {
                        or: [
                        { fields: "age", value: "41", operator: "="},
                        { field: "age", value: "31", operator: "="},
                        { and: [
                            { field: "haircolor", value: "gray", operator: "="},
                            { field: "age", value: "70", operator: "="},
                            { not: [
                                { field: "firstname", value: "Kenyon", operator: "="},
                                { field: "firstname", value: "Nerissa", operator: "="},
                            ]}
                        ]},
                        ],
                    }) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery));

            expect(response.text).toMatchSnapshot();
            expect(response.status).toBe(400);
        });

        it('not using variables with single filter', async () => {
            const gqlQuery = `#graphql
                query {
                    users(
                        filter: { fields: "haircolor", value: "gray", operator: "=" }
                    ) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery));

            expect(response.text).toMatchSnapshot();
            expect(response.status).toBe(400);
        });

        it('using variables with compound filter', async () => {
            const gqlQuery = `#graphql
                query($filter: FilterInputScalar) {
                    users(filter: $filter) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const variables = `
            {
                "filter": { "or": { "fields": "age", "value": "31", "operator": "=" }}
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(response.text).toMatchSnapshot();
            expect(response.status).toBe(400);
        });

        it('using variables with single filter', async () => {
            const gqlQuery = `#graphql
                query($filter: FilterInputScalar) {
                    users(filter: $filter) {
                        pageInfo {
                            hasNextPage
                            hasPreviousPage
                        }
                        edges {
                            cursor
                                node {
                                    id
                                    age
                                    haircolor
                                    lastname
                                    username
                                }
                            }
                        }
                }
            `;

            const variables = `
            {
                "filter": { "field": "age", "values": "30", "operator": "=" }
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(response.text).toMatchSnapshot();
            expect(response.status).toBe(400);
        });
    });
});
