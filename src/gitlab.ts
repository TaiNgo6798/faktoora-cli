import axios from 'axios';
import inquirer from 'inquirer';
import path from 'path';
import { execSync } from 'child_process';
import { existsSync } from 'fs';
import {
  cloneRepo,
  checkoutBranch,
  commitToCurrenctBranch,
  pushBranch,
} from './git';
import { DataObject } from './types';
import { getGitlabToken } from './utils';

const TEMP_REPO_DIR = '/tmp/faktoora-bump';
const GITLAB_API_BASE_URL = 'https://git.storyx.company/api/v4';

const reviewers = {
  'cuong.nguyen': '19',
};

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

export async function createMergeRequest(
  repo: DataObject,
  branch: string,
  commitMessage: string,
) {
  await axios.post(
    `${GITLAB_API_BASE_URL}/projects/${repo.id}/merge_requests`,
    {
      source_branch: branch,
      target_branch: repo.default_branch,
      title: commitMessage,
      description: `Automated bump of ${commitMessage}`,
      reviewer_ids: [reviewers['cuong.nguyen']],
    },
    {
      headers: {
        'PRIVATE-TOKEN': getGitlabToken(),
      },
    },
  );
}

const filterProjectByPackageName = async (
  packageName: string,
  branch: string = 'master',
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

  const projectsHasThePackage = await Promise.all(
    ids.map(async (id: string) => {
      try {
        const response = await axios.get(
          `${GITLAB_API_BASE_URL}/projects/${id}/repository/files/package.json/raw?ref=${branch}`,
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

  return projectsHasThePackage.filter((v) => !!v);
};

async function runNpmInstall(
  localPath: string,
  packageName: string,
  version: string,
) {
  execSync(`npm i ${packageName}@${version} --package-lock-only`, {
    cwd: localPath,
    stdio: 'pipe',
  });
}

export async function updatePackageInRepos(
  packageName: string,
  version: string,
  shouldCreateMr = false,
) {
  console.log(`Finding repositories using the "${packageName}"...`);
  const repos = await filterProjectByPackageName(packageName);

  if (!repos?.length) {
    console.log(`No repositories found using the "${packageName}"`);
    return;
  }

  const { selectedRepos } = await inquirer.prompt([
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

        console.log(`${repo.name}: Committing changes...`);
        await commitToCurrenctBranch(localPath, commitMessage);

        console.log(`${repo.name}: Pushing changes...`);
        await pushBranch(localPath, branchName);

        if (shouldCreateMr) {
          console.log(`${repo.name}: Creating merge request...`);
          await createMergeRequest(repo, branchName, commitMessage);
        }
      }),
    );

    console.log(`Bump ${packageName}@${version} done!`);
  } catch (e) {
    console.error(e);
  } finally {
    console.log(`Cleaning up...`);
    localPaths?.forEach(
      (localPath) => existsSync(localPath) && execSync(`rm -rf ${localPath}`),
    );
  }
}
