import {INode, ICursorArgs, FilterArgs} from '../src';

export interface IUserNode extends INode {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    age: number;
    haircolor: string;
    bio: string;
}

export type IUserCursorArgs = ICursorArgs;
export type IUserFilterArgs = FilterArgs<
    'id' | 'username' | 'firstname' | 'age' | 'haircolor' | 'lastname' | 'bio'
>;

export type KnexQueryResult = Array<{[attributeName: string]: any}>;
