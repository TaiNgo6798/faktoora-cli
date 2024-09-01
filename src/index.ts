#! /usr/bin/env node

import { Command } from 'commander';
import { updatePackageInRepos } from './gitlab';
import inquirer from 'inquirer';
import { saveToken } from './utils';
const program = new Command();

program
  .command('set-token')
  .description('Set a gitlab token')
  .action(async () => {
    const answers = await inquirer.prompt([
      {
        type: 'input',
        name: 'token',
        message: 'Enter your gitlab access token:',
      },
    ] as any);

    saveToken(answers.token);
    console.log('Access token saved successfully!');
  });

const invalidInputMessage =
  'Error: Please provide a valid package name and version in the format <package_name>@<package_version>';
program
  .command('bump <package_name>@<package_version>')
  .description('Bump a package version across multiple repositories')
  .version('1.0.0')
  .option('--create-mr', 'Should create merge request')
  .action((pkgVersion, options) => {
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

    const shouldCreateMr = options.createMr;
    updatePackageInRepos(packageName, version, shouldCreateMr);
  });

program.parse();
