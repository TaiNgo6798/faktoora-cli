# GitLab Version Bumper CLI

This CLI tool automates the process of bumping the version of a package across multiple GitLab projects. It updates the version in your `package.json` (or similar) files, commits the changes, and create merge requests with your credential.

```bash
Note:
- Requires pre-installed GIT(of course)
- Requires pre-installed NVM - to handling many node versions of different repo - default: current global node version
- .nvmrc file in each repo(optional) for NVM

```

## Installation

You can install the CLI globally using npm:

```bash
cd faktoora-ci
npm run build
npm uninstall -g @faktoora/faktoora-cli // optional
npm i -g . --no-cache
npm run postinstall
```

## Usage

### Basic Command

To set your Gitlab access-token:

```bash
faktoora set-token
```

To bump version of a package:

```bash
faktoora bump <package_name>@<version>
```

### Options

- `--branch=<name>`: Basically it will install the package in a new branch, and you can set its name.
- `--destination=<name>`: Destination branch's name to create Merge Request. 
Default: `master`, CAUTION: It will clone the repo from the destination branch.
- `--create-mr`: Will create merge requests after bumping(default: false).
- `--reviewer=<gitlab_user_name>`: Set reviewer for merge requests(default: cuong.nguyen).
- `-f, --force`: Force bump all found repos - no selecting repo prompt

### Example

```bash
faktoora bump @faktoora/faktoora-queue@1.24.5 --create-mr --reviewer=cuong.nguyen --destination=dev1 --branch=my-feat-branch-name
```

### Screenshots
![TaiNgo 2024-09-02 at 12 43 13](https://github.com/user-attachments/assets/cc4c6f44-1d3c-415a-885e-d844dcb77399)


![TaiNgo 2024-09-02 at 12 43 34](https://github.com/user-attachments/assets/1ff44ff2-fc6b-4a3d-9c8d-311b4303c22a)

[See demo video](https://drive.google.com/file/d/1-QsLonYS1pwBLBrCN-PptGNW1Mwj2l4A/view)


