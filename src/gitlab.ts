import axios from 'axios';
import inquirer from 'inquirer';
import path from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import {
  cloneRepo,
  checkoutBranch,
  commitToCurrentBranch,
  pushBranch,
  checkStatus,
} from './git';
import { DataObject } from './types';
import { getGitlabToken } from './utils';
import { runNpmInstall } from './npm-commands';

const TEMP_REPO_DIR = '/tmp/faktoora-bump';
const GITLAB_API_BASE_URL = 'https://git.storyx.company/api/v4';

export async function getRepositories() {
  const response = await axios.get(
    `${GITLAB_API_BASE_URL}/projects?membership=true&per_page=1000`,
    {
      headers: {
        'PRIVATE-TOKEN': getGitlabToken(),
      },
    },
  );

  return response.data;
}

export const getMe = async () => {
  const response = await axios.get(`${GITLAB_API_BASE_URL}/user`, {
    headers: {
      'PRIVATE-TOKEN': getGitlabToken(),
    },
  });
  return response.data as DataObject;
};

export const findUserByName = async (name: string) => {
  const response = await axios.get(
    `${GITLAB_API_BASE_URL}/users?search=${name}`,
    {
      headers: {
        'PRIVATE-TOKEN': getGitlabToken(),
      },
    },
  );
  return response?.data?.[0] as DataObject;
};

export async function createMergeRequest(
  repo: DataObject,
  branch: string,
  commitMessage: string,
  reviewerName: string = 'cuong.nguyen',
) {
  const me = await getMe();
  const body: DataObject = {
    source_branch: branch,
    target_branch: repo.default_branch,
    title: commitMessage,
    description: `Automated merge request of ${commitMessage}\nby faktoora-ci`,
    assignee_id: me.id,
  };

  if (reviewerName) {
    const reviewer = await findUserByName(reviewerName);
    body.reviewer_ids = [reviewer.id];
  }

  await axios.post(
    `${GITLAB_API_BASE_URL}/projects/${repo.id}/merge_requests`,
    body,
    {
      headers: {
        'PRIVATE-TOKEN': getGitlabToken(),
      },
    },
  );
}

const filterProjectByPackageName = async (
  packageName: string,
  branch?: string,
) => {
  const allRepos = await getRepositories();
  const ids = allRepos.map((repo: DataObject) => repo.id);
  const allRepoGroupById = allRepos.reduce(
    (acc: DataObject, repo: DataObject) => {
      acc[repo.id] = repo;
      return acc;
    },
    {},
  );

  const findProjectsHasThePackage = await Promise.all(
    ids.map(async (id: string) => {
      try {
        const response = await axios.get(
          `${GITLAB_API_BASE_URL}/projects/${id}/repository/files/package.json/raw${branch ? `?ref=${branch}` : ''}`,
          {
            headers: {
              'PRIVATE-TOKEN': getGitlabToken(),
            },
          },
        );
        const packageJson = response.data;
        if (packageJson.dependencies && packageJson.dependencies[packageName]) {
          return {
            id,
            packageDetail: {
              name: packageName,
              version: packageJson.dependencies[packageName],
            },
            ...allRepoGroupById[id],
          };
        }

        return null;
      } catch {
        return null;
      }
    }),
  );

  return findProjectsHasThePackage.filter((v) => !!v);
};

export async function updatePackageInRepos(
  packageName: string,
  version: string,
  options: {
    shouldCreateMr: boolean;
    reviewerName?: string;
    applyToAll: boolean;
  } = {
    shouldCreateMr: false,
    applyToAll: false,
  },
) {
  console.log(`Finding repositories using the "${packageName}"...`);
  const repos = await filterProjectByPackageName(packageName);

  if (!repos?.length) {
    console.log(`No repositories found using the "${packageName}"`);
    return;
  }

  let selectedRepos;
  if (options.applyToAll) {
    selectedRepos = repos;
  } else {
    const promptResult = await inquirer.prompt([
      {
        type: 'checkbox',
        name: 'selectedRepos',
        message: 'Select repositories to update:',
        choices: repos.map((repo) => ({
          name: `${repo.name}${repo.packageDetail.version.replace(/^[\^~]/, '') === version ? ' - up to date' : ''}`,
          value: repo,
          checked: true,
        })),
      },
    ] as any);

    selectedRepos = promptResult.selectedRepos;
  }

  const localPaths = [] as string[];
  const commitMessage = `bump/${packageName}@${version}`;
  const branchName = `bump/${packageName}-${version}`;

  if (existsSync(TEMP_REPO_DIR)) execSync(`rm -rf ${TEMP_REPO_DIR}`);
  try {
    await Promise.all(
      selectedRepos.map(async (repo: DataObject) => {
        const localPath = path.join(TEMP_REPO_DIR, repo.name);
        localPaths.push(localPath);

        console.log(`${repo.name}: Cloning ${repo.ssh_url_to_repo}...`);
        await cloneRepo(repo.ssh_url_to_repo, localPath);

        console.log(`${repo.name}: Creating branch "${branchName}"...`);
        await checkoutBranch(localPath, branchName);

        console.log(`${repo.name}: Installing ${packageName}@${version}...`);
        await runNpmInstall(localPath, packageName, version);

        const gitStatus = await checkStatus(localPath);
        if (gitStatus.isClean()) {
          console.log(`${repo.name}: All are up to date...`);
          return;
        }

        console.log(`${repo.name}: Committing changes...`);
        await commitToCurrentBranch(localPath, commitMessage);

        console.log(`${repo.name}: Pushing changes...`);
        await pushBranch(localPath, branchName);

        if (options.shouldCreateMr) {
          console.log(`${repo.name}: Creating merge request...`);
          await createMergeRequest(
            repo,
            branchName,
            commitMessage,
            options.reviewerName,
          );
        }
      }),
    );

    console.log(`Bump ${packageName}@${version} done!`);
  } finally {
    console.log(`Cleaning up...`);
    localPaths?.forEach(
      (localPath) => existsSync(localPath) && execSync(`rm -rf ${localPath}`),
    );
  }
}
