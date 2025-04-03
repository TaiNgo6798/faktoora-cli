import axios from 'axios';
import inquirer from 'inquirer';
import path from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import {
  cloneRepo,
  createBranch,
  commitToCurrentBranch,
  pushBranch,
  checkStatus,
} from './git';
import { BumpOptions, DataObject } from './types';
import { getApiBaseUrl, getGitlabToken } from './credential';
import { runNpmInstall } from './npm.command';
import config from './config';

export async function getRepositories() {
  const apiBaseUrl = getApiBaseUrl();
  const response = await axios.get(
    `${apiBaseUrl}/projects?membership=true&per_page=1000`,
    {
      headers: {
        'PRIVATE-TOKEN': getGitlabToken(),
      },
    },
  );

  return response.data;
}

export const getMe = async () => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await axios.get(`${apiBaseUrl}/user`, {
    headers: {
      'PRIVATE-TOKEN': getGitlabToken(),
    },
  });
  return response.data as DataObject;
};

export const findUserByName = async (name: string) => {
  const apiBaseUrl = getApiBaseUrl();
  const response = await axios.get(`${apiBaseUrl}/users?search=${name}`, {
    headers: {
      'PRIVATE-TOKEN': getGitlabToken(),
    },
  });
  return response?.data?.[0] as DataObject;
};

export async function createMergeRequest(
  repo: DataObject,
  sourceBranch: string,
  reviewerName: string = 'cuong.nguyen',
  destinationBranch: string = null,
) {
  const me = await getMe();
  const body: DataObject = {
    source_branch: sourceBranch,
    target_branch: destinationBranch || repo.default_branch,
    title: sourceBranch,
    description: config.DEFAULT_MERGE_REQUEST_DESCRIPTION,
    assignee_id: me.id,
  };

  if (reviewerName) {
    const reviewer = await findUserByName(reviewerName);
    body.reviewer_ids = [reviewer.id];
  }

  const apiBaseUrl = getApiBaseUrl();
  await axios.post(`${apiBaseUrl}/projects/${repo.id}/merge_requests`, body, {
    headers: {
      'PRIVATE-TOKEN': getGitlabToken(),
    },
  });
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
        const apiBaseUrl = getApiBaseUrl();
        const response = await axios.get(
          `${apiBaseUrl}/projects/${id}/repository/files/package.json/raw${branch ? `?ref=${branch}` : ''}`,
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
  options: BumpOptions = {
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

  const {
    applyToAll,
    destinationBranch,
    shouldCreateMr,
    reviewerName,
    branchName,
  } = options;

  let selectedRepos;
  if (applyToAll) {
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
  const shortPackageName = packageName.split('/').pop();
  const commitMessage = `bump/${shortPackageName}@${version}`;
  const defaultBranchName = `bump/${shortPackageName}-${version}`;
  const preFix = destinationBranch ? `${destinationBranch}_` : '';
  const branchNameWithPrefix = `${preFix}${branchName || defaultBranchName}`;

  if (existsSync(config.TEMP_REPO_DIR))
    execSync(`rm -rf ${config.TEMP_REPO_DIR}`);
  try {
    const results = await Promise.all(
      selectedRepos.map(async (repo: DataObject) => {
        const localPath = path.join(config.TEMP_REPO_DIR, repo.name);
        localPaths.push(localPath);

        console.log(`${repo.name}: Cloning ${repo.ssh_url_to_repo}...`);
        await cloneRepo(repo.ssh_url_to_repo, localPath);

        console.log(
          `${repo.name}: Creating branch "${branchNameWithPrefix}"...`,
        );
        await createBranch(localPath, branchNameWithPrefix, destinationBranch);

        console.log(`${repo.name}: Installing ${packageName}@${version}...`);
        await runNpmInstall(localPath, packageName, version);

        const gitStatus = await checkStatus(localPath);
        if (gitStatus.isClean()) {
          console.log(`${repo.name}: All are up to date...`);
          return;
        }

        console.log(`${repo.name}: Committing changes...`);
        await commitToCurrentBranch(localPath, commitMessage);

        return {
          repo,
          localPath,
        };
      }),
    );

    await Promise.all(
      results.map(async (result) => {
        if (result) {
          const { repo, localPath } = result;
          console.log(`${repo.name}: Pushing changes...`);
          await pushBranch(localPath, branchNameWithPrefix);

          if (shouldCreateMr) {
            console.log(`${repo.name}: Creating merge request...`);
            await createMergeRequest(
              repo,
              branchNameWithPrefix,
              reviewerName,
              destinationBranch,
            );
          }
        }
      }),
    );

    console.log(`Bump ${packageName}@${version} done!`);
  } catch (e) {
    console.error(e.message);
  } finally {
    console.log(`Cleaning up...`);
    localPaths?.forEach(
      (localPath) => existsSync(localPath) && execSync(`rm -rf ${localPath}`),
    );
  }
}
