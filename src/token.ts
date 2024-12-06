import fs from 'fs';
import config from './config';

export function getGitlabToken() {
  if (fs.existsSync(config.GITLAB_TOKEN_FILE_PATH)) {
    return fs.readFileSync(config.GITLAB_TOKEN_FILE_PATH, 'utf-8');
  }
  return null;
}

export function saveToken(token: string) {
  fs.writeFileSync(config.GITLAB_TOKEN_FILE_PATH, token, 'utf-8');
}
