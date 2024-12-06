# GitLab Version Bumper CLI

This CLI tool automates the process of bumping the version of a package across multiple GitLab projects. It updates the version in your `package.json` (or similar) files, commits the changes, and create merge requests with your credential.

```bash
Note: 
- It requires having nvm installed to run.
- .nvmrc file in the repo is supported.

```

## Installation

You can install the CLI globally using npm:

```bash
cd faktoora-ci
npm run build
npm uninstall -g @faktoora/faktoora-cli // optional
npm i -g .
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

- `--branch`: Basically it will install the package in a new branch, and you can set its name.
- `--destination`: Destination branch's name to create Merge Request.
- `--create-mr`: Will create merge requests after bumping(default: false).
- `--reviewer=<gitlab_user_name>`: Set reviewer for merge requests(default: cuong.nguyen).
- `-f, --force`: Force bump all found repos.

### Example

```bash
faktoora bump @faktoora/faktoora-queue@1.24.5 --create-mr --reviewer=cuong.nguyen
```

### Screenshots
![TaiNgo 2024-09-02 at 12 43 13](https://github.com/user-attachments/assets/cc4c6f44-1d3c-415a-885e-d844dcb77399)


![TaiNgo 2024-09-02 at 12 43 34](https://github.com/user-attachments/assets/1ff44ff2-fc6b-4a3d-9c8d-311b4303c22a)

[See demo video](https://drive.google.com/file/d/1-QsLonYS1pwBLBrCN-PptGNW1Mwj2l4A/view)


