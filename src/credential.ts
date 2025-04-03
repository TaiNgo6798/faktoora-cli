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

export function saveApiBaseUrl(url: string) {
  fs.writeFileSync(config.GITLAB_API_BASE_URL_PATH, url, 'utf-8');
}

export function getApiBaseUrl() {
  if (fs.existsSync(config.GITLAB_API_BASE_URL_PATH)) {
    return fs.readFileSync(config.GITLAB_API_BASE_URL_PATH, 'utf-8');
  }

  throw new Error('Please set your Gitlab API base url');
}
