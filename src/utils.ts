import path from 'path';
import fs from 'fs';
import os from 'os';

const TOKEN_FILE_PATH = path.join(os.homedir(), '.faktoora-cli-gitlab-token');

export function getGitlabToken() {
  if (fs.existsSync(TOKEN_FILE_PATH)) {
    return fs.readFileSync(TOKEN_FILE_PATH, 'utf-8');
  }
  return null;
}

export function saveToken(token: string) {
  fs.writeFileSync(TOKEN_FILE_PATH, token, 'utf-8');
}
