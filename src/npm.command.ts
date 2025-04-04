import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';
import path from 'path';

const findNvmPath = () => {
  const possiblePaths = [
    `${homedir()}/.nvm/nvm.sh`,
    '/usr/local/nvm/nvm.sh',
    '/opt/nvm/nvm.sh',
  ];

  return possiblePaths.find((p) => existsSync(p)) || null;
};

export const runNpmInstall = async (
  localPath: string,
  packageName: string,
  version: string,
) => {
  const nvmPath = findNvmPath();
  if (!nvmPath) {
    throw new Error('Could not find nvm.sh. Is nvm installed?');
  }

  const nvmrcPath = path.join(localPath, '.nvmrc');
  const nodeVersionCommand = existsSync(nvmrcPath)
    ? `. ${nvmPath} && nvm use &&`
    : '';

  execSync(
    `${nodeVersionCommand} npm i ${packageName}@${version} -f --package-lock-only`,
    {
      cwd: localPath,
    },
  );
};
