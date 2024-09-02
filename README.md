# GitLab Version Bumper CLI

This CLI tool automates the process of bumping the version of a package across multiple GitLab projects. It updates the version in your `package.json` (or similar) files, commits the changes, and create merge requests with your credential.

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

- `--create-mr`: Will create merge requests after bumping(default: false).

### Example

```bash
faktoora bump @faktoora/faktoora-queue@1.24.5
```