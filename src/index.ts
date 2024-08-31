#! /usr/bin/env node

import { Command } from 'commander';
import { updatePackageInRepos } from './gitlab';
const program = new Command();

const invalidInputMessage =
  'Error: Please provide a valid package name and version in the format <package_name>@<package_version>';

program
  .name('bump')
  .description('Bump a package version across multiple repositories')
  .version('1.0.0');

program
  .command('bump <package_name>@<package_version>')
  .action((pkgVersion) => {
    const lastAtIndex = pkgVersion.lastIndexOf('@');
    if (lastAtIndex === -1) {
      console.error(invalidInputMessage);
      process.exit(1);
    }

    const packageName = pkgVersion.slice(0, lastAtIndex);
    const version = pkgVersion.slice(lastAtIndex + 1);

    if (!packageName || !version) {
      console.error(invalidInputMessage);
      process.exit(1);
    }

    updatePackageInRepos(packageName, version);
  });

program.parse();
