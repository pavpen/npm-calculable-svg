# Developer Guide

This project uses `npm`, `rspack`, and `rslib`.  The following sections
mention the common project development commands.

There are also files for code-generation ML Language Models in this
repository.  However, code generation hasn't been necessary so far.

## Setup

Install the dependencies:

```bash
npm install

# Install non-NPM dependencies for running unit tests:
npm run test:install
```

Create a Docker container for running an AI agent (e.g., Cursor):

```bash
sbx run cursor --name=cursor-npm-calculable-svg
```

## Get started

### Start a development server

The app will be available at <http://localhost:8080>.

```bash
npm run dev
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

E.g., using the Docker container from [Setup](#setup):

```bash
sbx run --name=cursor-npm-calculable-svg
```
