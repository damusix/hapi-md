# Hapi Markdown Server

Serves EJS templates and Markdown files as HTML. Everything else is written in TypeScript.

Everything is server-side rendered. Vite is only used to compile SCSS and browser-specific TypeScript files.

## Features

- TypeScript
- HapiJS Server-side rendering
- EJS templates
- Markdown files
- SCSS
- Live reload using Hapi / Nes

## Philosophy

- Type everything, absolutely everything.
- Documentation is a first-class citizen (comment your code).
- Keep the server as simple as possible.
- Keep the client as simple as possible.
- Social environment: think about the people who will be working on this project after you.

## Getting started

**Prerequisites:**

```bash
# Node 20 is required
nvm install 20
nvm use 20

# PNPM is our package manager
corepack enable
corepack install pnpm
```

**Install:**

```bash

pnpm install
```

**Start developing:**

```bash
pnpm watch
```

## Files

- `src/client`
  - Vite generated CSS and JS files to be run in the browser
  - SCSS files
  - Frontend TypeScript files

- `src/server`
  - Server TypeScript files
  - `index.ts` is the entry point
  - `methods` are where you add universal server methods
  - `routes` are where you add server routes
  - `plugins` are where you add and configure server plugins
  - `helpers` are where you add helper and utility functions

- `src/views`
  - EJS templates, partials, and layouts

- `src/docs`
  - Markdown files to be served as HTML

