#!/usr/bin/env node

// REQURIED: npm install --save-dev depcheck

const fs = require('fs');
const depcheck = require('depcheck');

const processUnusedDevDependencies = (unusedDevDependencies, usedDependencies) => {
    const {types, nonTypes} = filterTypesAndNonTypeDependencies(unusedDevDependencies);
    // check if the types (extracted from @types/<someLib> to <someLib>) are in `usedDependencies`
    //   if they are, dont count them as unused
    const missingTypes = types.filter(t => !usedDependencies[t]);
    return [...nonTypes, ...missingTypes.map(t => `@types/${t}`)];
};

const filterTypesAndNonTypeDependencies = dependencyNames =>
    // @types/<someLib> aren't filtered correctly
    // here we seperate out dependencies that are types (above) and nonTypes
    // types are extracted from @types/<someLib> to <someLib>
    dependencyNames.reduce(
        (acc, dep) => {
            const matches = dep.match(/(@types\/)(.*)/);
            if (matches && matches[1]) {
                acc.types.push(matches[2]);
            } else {
                acc.nonTypes.push(dep);
            }

            return acc;
        },
        {types: [], nonTypes: []}
    );

const options = {
    ignoreBinPackage: false, // ignore the packages with bin entry
    skipMissing: false, // skip calculation of missing dependencies
    ignoreDirs: [
        // folder with these names will be ignored
    ],
    ignoreMatches: [
        // ignore dependencies that matches these globs
        'faker',
        'graphql-tools',
        'jest',
        'knex',
        'nodemon',
        'prettier',
        'sqlite3',
        'ts-jest',
        'ts-node',
        'tsconfig-paths',
        'tslint',
        'tslint-eslint-rules',
        '@types/jest',
        '@types/superagent',
        'mysql2'
    ],
    specials: [
        // the target special parsers
        // depcheck.special.tslint,
        // depcheck.special.webpack,
        // depcheck.special.babel
    ]
};

const packageJsonLocation = process.cwd();

// keys on `unused` are `dependencies`, `devDependencies`, `using`, `missing`, `invalidFiles`, `invalidDirs`
depcheck(packageJsonLocation, options, unused => {
    const devDependencies = processUnusedDevDependencies(unused.devDependencies, unused.using);
    let unusedDependenciesExist = unused.dependencies.length > 0 || devDependencies.length > 0;

    const results = {...unused, devDependencies};
    var dir = './tmp';

    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir);
    }

    fs.writeFile('./tmp/dependency-check-output.json', JSON.stringify(results), function(err) {
        if (err) {
            console.log(err);
        }

        if (unusedDependenciesExist) {
            console.log('Found unused dependencies:');
            console.log('\n dependencies', results.dependencies); // an array containing the unused dependencies
            console.log('\n devDependencies', results.devDependencies); // an array containing the unused devDependencies
            process.exit(1);
        } else {
            console.log('No unused dependencies found!');
            process.exit(0);
        }
    });
});
