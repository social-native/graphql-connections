export interface IUserNode {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    age: number;
    haircolor: string;
    bio: string;
    isPetOwner: boolean;
}

export type KnexQueryResult = Array<{[attributeName: string]: any}>;
