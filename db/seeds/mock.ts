import faker from 'faker';
import * as Knex from 'knex';
import generateColumnData from './data/generateColumnData';

console.log('Generating fake data values:');

console.log('              Unique     Random ');
console.log('              -------    -------');

// Usernames
const {uniqueData: usernameUniqueData, randomData: usernameRandomData} = generateColumnData<string>(
    {},
    {makeRandomUnique: true, fakerFn: faker.internet.userName},
    10000
);

console.log('usernames:    ', usernameUniqueData.length, '        ', usernameRandomData.length);

// Firstnames
const firstNameCount = {
    Reggie: 10,
    Marrilee: 20,
    Kelbee: 40,
    Nerissa: 80,
    Kenyon: 160
};

const {uniqueData: firstnamesUniqueData, randomData: firstnamesRandomData} = generateColumnData<
    string
>(firstNameCount, {makeRandomUnique: false, fakerFn: faker.name.firstName}, 10000);

console.log('firstnames:   ', firstnamesUniqueData.length, '      ', firstnamesRandomData.length);

// Lastnames
const lastNameCount = {
    Gross: 2,
    Candaele: 4,
    Chew: 8,
    Summa: 10
};

const {uniqueData: lastnamesUniqueData, randomData: lastnamesRandomData} = generateColumnData<
    string
>(lastNameCount, {makeRandomUnique: false, fakerFn: faker.name.lastName}, 10000);

console.log('lastnames:    ', lastnamesUniqueData.length, '       ', lastnamesRandomData.length);

// Bio
const bioCount = {
    famelicose: 2,
    sodalitious: 4
};

const {uniqueData: biosUniqueData, randomData: biosRandomData} = generateColumnData<string>(
    bioCount,
    {makeRandomUnique: false, fakerFn: faker.lorem.paragraph},
    10000
);

console.log('bios:         ', biosUniqueData.length, '        ', biosRandomData.length);

// Age
const ageCount = {
    20: 1000,
    30: 1000,
    40: 1000,
    50: 1000,
    60: 1000,
    70: 1000,
    80: 1000,
    90: 1000,
    100: 1000,
    110: 1000
};

const undefinedData = () => undefined;

const {uniqueData: agesUniqueData, randomData: agesRandomData} = generateColumnData<number>(
    ageCount,
    {makeRandomUnique: false, fakerFn: undefinedData, dataIsNumber: true},
    10000
);

console.log('ages:         ', agesUniqueData.length, '     ', agesRandomData.length);

// Haircolor
const haircolorCount = {
    brown: 6000,
    black: 2000,
    blonde: 1000,
    red: 500,
    gray: 100
} as {[color: string]: number};

const {uniqueData: haircolorsUniqueData, randomData: haircolorsRandomData} = generateColumnData<
    string
>(haircolorCount, {makeRandomUnique: false, fakerFn: faker.commerce.color}, 10000);

console.log('haircolors:   ', haircolorsUniqueData.length, '     ', haircolorsRandomData.length);

console.log('\n Building cases.... \n');

const takeItemFromArray = <Type>(item: Type, array: Type[]) => {
    const index = array.indexOf(item);
    if (index !== -1) {
        array.splice(index, 1);
    }
};

// Combine haircolors with ages
let caseA: Array<{haircolor: string; age: number}> = [];
Object.keys(haircolorCount).forEach(haircolor => {
    [20, 30, 40, 50, 60, 70, 80, 90, 100, 110].forEach(age => {
        const count = haircolorCount[haircolor] / 10;
        const colorAgeCase = Array(count)
            .fill(undefined)
            .map(() => {
                takeItemFromArray(haircolor, haircolorsUniqueData);
                takeItemFromArray(+age, agesUniqueData);
                return {
                    haircolor,
                    age: +age
                };
            });

        caseA = [...caseA, ...colorAgeCase];
    });
});

let caseB: Array<{haircolor: string; age: number; firstname: string}> = [];
// Add first name Kenyon
[20, 30, 40, 50, 60, 70, 80, 90, 100, 110].forEach(age => {
    const colorAgeFirstNameCase = Array(16)
        .fill(undefined)
        .map(() => {
            // remove from caseA
            const index = caseA.findIndex(row => row.age === age && row.haircolor === 'brown');
            if (index !== -1) {
                caseA.splice(index, 1);
            }

            // remove from unique names
            takeItemFromArray('Kenyon', firstnamesUniqueData);
            return {haircolor: 'brown', age, firstname: 'Kenyon'};
        });
    caseB = [...caseB, ...colorAgeFirstNameCase];
});

// Add first name Nerissa
[20, 30, 40, 50, 60, 70, 80, 90, 100, 110].forEach(age => {
    const colorAgeFirstNameCase = Array(8)
        .fill(undefined)
        .map(() => {
            // remove from caseA
            const index = caseA.findIndex(row => row.age === age && row.haircolor === 'brown');
            if (index !== -1) {
                caseA.splice(index, 1);
            }

            // remove from unique names
            takeItemFromArray('Nerissa', firstnamesUniqueData);
            return {haircolor: 'brown', age, firstname: 'Nerissa'};
        });
    caseB = [...caseB, ...colorAgeFirstNameCase];
});

// Add last name Summa
let caseC: Array<{haircolor: string; age: number; firstname: string; lastname: string}> = [];
[20, 30, 40, 50, 60, 70, 80, 90, 100, 110].forEach(age => {
    const colorAgeFirstNameLastNameCase = Array(1)
        .fill(undefined)
        .map(() => {
            // remove from caseA
            const index = caseB.findIndex(
                row => row.age === age && row.haircolor === 'brown' && row.firstname === 'Kenyon'
            );
            if (index !== -1) {
                caseB.splice(index, 1);
            }

            // remove from unique names
            takeItemFromArray('Summa', lastnamesUniqueData);
            return {haircolor: 'brown', age, firstname: 'Kenyon', lastname: 'Summa'};
        });
    caseC = [...caseC, ...colorAgeFirstNameLastNameCase];
});

console.log('caseA:   ', caseA.length);
console.log('caseB:   ', caseB.length);
console.log('caseC:   ', caseC.length);

console.log('ages:         ', agesUniqueData.length, '     ', agesRandomData.length);
console.log('haircolors:   ', haircolorsUniqueData.length, '     ', haircolorsRandomData.length);
console.log('lastnames:   ', lastnamesUniqueData.length, '     ', lastnamesRandomData.length);

const takeRandomElement = (array: string[]) => {
    const index = Math.floor(Math.random() * array.length);
    const item = array[index];
    if (index !== -1) {
        array.splice(index, 1);
    }

    return item ? item : undefined;
};

const firstnames = [...firstnamesUniqueData, ...firstnamesRandomData];
const lastnames = [...lastnamesUniqueData, ...lastnamesRandomData];
const bios = [...biosUniqueData, ...biosRandomData];
const ages = [...agesUniqueData, ...agesRandomData];
const haircolors = [...haircolorsUniqueData, ...haircolorsRandomData];
const usernames = [...usernameUniqueData, ...usernameRandomData];

const finalCaseA = caseA.map(({haircolor, age}) => ({
    haircolor,
    age,
    username: takeRandomElement(usernames),
    firstname: takeRandomElement(firstnames),
    lastname: takeRandomElement(lastnames),
    bio: takeRandomElement(bios)
}));

const finalCaseB = caseB.map(({haircolor, age, firstname}) => ({
    haircolor,
    age,
    firstname,
    username: takeRandomElement(usernames),
    lastname: takeRandomElement(lastnames),
    bio: takeRandomElement(bios)
}));

const updatedAt = new Date(1546347661000);
const finalCaseC = caseC.map(({haircolor, age, firstname, lastname}) => ({
    updated_at: updatedAt,
    haircolor,
    age,
    firstname,
    lastname,
    username: takeRandomElement(usernames),
    bio: takeRandomElement(bios)
}));

const remainingRows = Array(usernames.length)
    .fill(undefined)
    .map(() => ({
        haircolor: takeRandomElement(haircolors),
        age: takeRandomElement((ages as unknown) as string[]),
        username: takeRandomElement(usernames),
        firstname: takeRandomElement(firstnames),
        lastname: takeRandomElement(lastnames),
        bio: takeRandomElement(bios)
    }));

const rows = [...finalCaseA, ...finalCaseB, ...finalCaseC, ...remainingRows];

export async function seed(knex: Knex) {
    return knex('mock')
        .del()
        .then(() => {
            return knex.batchInsert('mock', rows, 100);
        });
}
