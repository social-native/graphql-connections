const fs = require("fs");
const childProcess = require("child_process");
const semver = require("semver");

const branchPackageRaw = fs.readFileSync("package.json");
const branchPackage = JSON.parse(branchPackageRaw);
const branchVersion = semver.parse(branchPackage.version);

childProcess.exec("git tag", (error, stdout, stderr) => {
  console.log("stdout: " + stdout);
  console.log("stderr: " + stderr);
  const tagVersion = semver.coerce(`${process.env.CIRCLE_TAG}`);
  console.log(
    `current branch is: ${branchVersion.version} and the tag is ${tagVersion.version}`
  );
  if (error !== null) {
    console.log("exec error: " + error);
  }
  if (branchVersion.version === tagVersion.version) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});
