const fs = require("fs");
const childProcess = require("child_process");
const semver = require("semver");

const branchPackageRaw = fs.readFileSync("package.json");
const branchPackage = JSON.parse(branchPackageRaw);
const branchVersion = semver.parse(branchPackage.version);

childProcess.execSync("git fetch --all");
childProcess.execSync("git checkout origin/master");

const masterPackageRaw = fs.readFileSync("package.json");
const masterPackage = JSON.parse(masterPackageRaw);
const masterVersion = semver.parse(masterPackage.version);

console.log(
  `current branch is: ${branchVersion.version} and the master is ${masterVersion.version}`
);

if (
  (masterVersion.major + 1 === branchVersion.major &&
    masterVersion.minor === branchVersion.minor &&
    masterVersion.patch === branchVersion.patch) ||
  (masterVersion.major === branchVersion.major &&
    masterVersion.minor + 1 === branchVersion.minor &&
    masterVersion.patch === branchVersion.patch) ||
  (masterVersion.major === branchVersion.major &&
    masterVersion.minor === branchVersion.minor &&
    masterVersion.patch + 1 === branchVersion.patch)
) {
  process.exit(0);
} else {
  console.log(`Version is not incremental`);
  console.log("Version branch must match either:");
  console.log(
    `${masterVersion.major + 1}.${branchVersion.minor}.${branchVersion.patch}`
  );
  console.log(
    `${branchVersion.major}.${branchVersion.minor + 1}.${branchVersion.patch}`
  );
  console.log(
    `${branchVersion.major}.${branchVersion.minor}.${masterVersion.patch + 1}`
  );
  process.exit(1);
}
