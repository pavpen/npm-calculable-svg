# Developer Guide

This project uses `npm`, `rspack`, and `rslib`.  The following sections
mention the common project development commands.

There are also files for code-generation ML Language Models in this
repository.  However, code generation hasn't been necessary so far.

## Developer Environment Setup

* [Install Node.js](https://nodejs.org/en/download).
* Install NPM dependencies:

  ```bash
  npm install

  # Install non-NPM dependencies for running unit tests:
  npm run test:install
  ```

* [Install Rust](https://rust-lang.org/tools/install/).
* Install `git-cliff` for generating `CHANGELOG.md`.

  ```bash
  cargo install git-cliff
  ```

Create a Docker container for running an AI agent (e.g., Cursor):

```bash
sbx run cursor --name=cursor-npm-calculable-svg
```

## Lint, Build, and Test

### Lint

```terminal
npm run check
npm run format
```

### Preview samples, and browser tests from a development server

The app will be available at <http://localhost:8080>.

```bash
npm run build-test-preview && npm run test-preview
```

### Build for production

Output is under `dist/`.

```bash
npm run build
```

### Serve the production build locally

```bash
npm run preview
```

### Run unit tests

```bash
npm run check && npm run build && npm run test
```

### Start an AI agent session

E.g., using the Docker container from
[Developer Environment Setup](#developer-environment-setup):

```bash
sbx run --name=cursor-npm-calculable-svg
```

## Build, or Update `CHANGELOG.md`

```bash
npm run build-changelog
```

## Commit Changes

* Use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/)
  guidelines.
* The following commit footers are recognized for ChangeLog generation
  (defined in [`cliff.toml`](cliff.toml)):
  * `Changelog: ignore` Skips the commit when auto-generating `CHANGELOG.md`.
    E.g., if a larger feature is broken down into small commits, a ChangeLog
    reader usually needs one message for the feature, not one for each commit.
    Also, refactors should usually be non-breaking changes, and include
    `Changelog: ignore`.
  * `changelog-message:` Overrides the ChangeLog message for this commit.  Can
    be used, e.g., if a large feature is broke-down into smaller commits, and
    the commit message for the smaller commit that makes the feature available
    to users doesn't correspond to the summary useful to ChangeLog readers.
    * You can find more examples of un-helpful ChangeLogs at
      [keep a changelog](https://keepachangelog.com/en/1.1.0/).
  * You should also use `Relates-to: <GitHub-issue-id>`, or
    `Resolves: <GitHub-issue-id>` for pull requests that are related to an
    issue.
* Recognized commit types (defined in [`cliff.toml`](cliff.toml)), include:
  `feat` (feature), `fix` (bug fix), `doc` (documentation),
  `perf` (performance change), `refactor`, `test` (testing change),
  `chore(release): prepare for`, `chore(deps.*)`, `chore(pr)`, `chore(pull)`,
  `chore`, `ci`, `revert`.
* Build, review, and add updates to `CHANGELOG.md` with each commit.
  * It's much easier than rewriting commit history, or adding rules to ignore
    mistyped commit messages in `cliff.toml`.
  * This looks something like:
    * `git add <. . .>`,
    * `git commit` (write commit message),
    * `npm run build-changelog`,
    * `git diff CHANGELOG.md` (review ChangeLog changes),
    * `git commit --amend CHANGELOG.md`,
    * `git push`.

## Release

* Lint: `npm npm run check; npm run format`
* Build: `npm run build`
* Unit test: `npm run test`
* Re-build the ChangeLog: `git-cliff`
* Revew [`CHANGELOG.md`](CHANGELOG.md)
* Tag the release commit with a tag that consists of `'v'` + a
  [semantic version](https://semver.org/)
  * `git tag --annotate v0.0.0-alpha.0`
  * `git push origin v0.0.0-alpha.0`
* [Upload release artefacts](https://github.com/pavpen/npm-calculable-svg/releases/new)
  (`dist/*.js`, `dist/*.js.map`, `dist/*.ts`) to GitHub.
