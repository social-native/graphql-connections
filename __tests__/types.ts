import {INode, IInputArgs} from '../src';

export interface IUserNode extends INode {
    id: number;
    username: string;
    firstname: string;
    lastname: string;
    age: number;
    haircolor: string;
    bio: string;
}

// export type IUserCursorArgs = ICursorArgs;
// export type IUserFilterArgs = FilterArgs<
//     'id' | 'username' | 'firstname' | 'age' | 'haircolor' | 'lastname' | 'bio'
// >;

// export type FilterFields =
//     | 'id'
//     | 'username'
//     | 'firstname'
//     | 'age'
//     | 'haircolor'
//     | 'lastname'
//     | 'bio';
// export type OrderByFields =
//     | 'id'
//     | 'username'
//     | 'firstname'
//     | 'age'
//     | 'haircolor'
//     | 'lastname'
//     | 'bio';

// export type IUserInputs = IInputArgs<FilterFields, OrderByFields>;
export type KnexQueryResult = Array<{[attributeName: string]: any}>;
