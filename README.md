# About

This repo provides a boilerplate for creating packages that can be used with the Social Native API micro services.

It uses:

 - `Typescript` for typing and generating JS
 - `Rollup` for building the package bundle
 - `TSLint` for linting
 - `Prettier` for making the code beautiful
 - `Depcheck` for dependency checking
 - `CircleCI` for CI. You will need to enable the CI on the CircleCI site.
 - `Jest` for testing and test coverage reporting

# Usage

1. Clone repo, delete `.git` folder, and either run `git init` or copy the files into an existing git repo.
2. `grep` and replace all instances of `snpkg-snapi-boilerplate` with your repos name
3. Update the `description` value in `package.json`
