import path from 'path';
import os from 'os';

export default {
  TEMP_REPO_DIR: '/tmp/faktoora-bump',
  GITLAB_API_BASE_URL: 'https://git.storyx.company/api/v4',
  GITLAB_TOKEN_FILE_PATH: path.join(os.homedir(), '.faktoora-cli-gitlab-token'),
  DEFAULT_MERGE_REQUEST_DESCRIPTION: `Automated merge request`,
};
