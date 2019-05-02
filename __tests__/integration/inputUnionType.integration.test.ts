import appProvider from '../appProvider';
import request from 'supertest';
import {createGQLRequest} from '../utils';

describe('Input Union Type', () => {
    const app = appProvider();

    describe('works with all unions', () => {
        it('not using variables', async () => {
            const gqlQuery = `
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

            expect(JSON.parse(response.text)).toHaveProperty(
                ['data', 'users', 'edges', 0, 'cursor'],
                expect.any(String)
            );
            expect(response.status).toBe(200);
        });

        it('using variables', async () => {
            const gqlQuery = `
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
                "filter": { "or": { "field": "age", "value": "31", "operator": "=" }}
            }
            `;

            const response = await request(app.callback())
                .post('/graphql')
                .use(createGQLRequest(gqlQuery, variables));

            expect(JSON.parse(response.text)).toHaveProperty(
                ['data', 'users', 'edges', 0, 'cursor'],
                expect.any(String)
            );
            expect(response.status).toBe(200);
        });
    });

    describe('handles errors', () => {
        it('not using variables with compound filter', async () => {
            const gqlQuery = `
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
            const gqlQuery = `
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
            const gqlQuery = `
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
            const gqlQuery = `
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
