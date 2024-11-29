import { execSync } from 'child_process';
import { existsSync } from 'fs';
import { homedir } from 'os';

const findNvmScript = () => {
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
  const nvmInitScript = findNvmScript();
  if (!nvmInitScript) {
    throw new Error('Could not find nvm.sh. Is nvm installed?');
  }

  execSync(
    `. ${nvmInitScript} && nvm use && npm i ${packageName}@${version} -f --package-lock-only`,
    {
      cwd: localPath,
    },
  );
};
