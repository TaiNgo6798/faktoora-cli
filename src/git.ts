import simpleGit from 'simple-git';

export async function cloneRepo(repoUrl: string, localPath: string) {
  const git = simpleGit();
  await git.clone(repoUrl, localPath);
}

export async function branchExists(
  localPath: string,
  branchName: string,
): Promise<boolean> {
  const git = simpleGit(localPath);

  try {
    // Get all branches
    const branches = await git.branch();

    // Check if the branch exists in the local or remote branches
    return branches.all.some(
      (b) => b.split('remotes/origin/').pop() === branchName,
    );
  } catch (error) {
    console.error('Error checking branch:', error);
    return false;
  }
}

export async function createBranch(
  localPath: string,
  branchName: string,
  destinationBranch?: string,
) {
  const git = simpleGit(localPath);
  const exists = await branchExists(localPath, branchName);
  if (exists) {
    await git.checkout(branchName);
  } else {
    if (destinationBranch) {
      await git.checkout(destinationBranch);
    }
    await git.checkoutLocalBranch(branchName);
  }
}

export async function checkStatus(localPath: string) {
  const git = simpleGit(localPath);
  const status = await git.status();
  return status;
}

export async function commitToCurrentBranch(
  localPath: string,
  commitMessage: string,
) {
  const git = simpleGit(localPath);

  // If there are no changes, return or log a message
  const status = await git.status();
  if (status.isClean()) {
    return false;
  }

  await git.add('.');
  await git.commit(commitMessage);
}

export async function pushBranch(localPath: string, branchName: string) {
  const git = simpleGit(localPath);
  await git.push('origin', branchName);
}
