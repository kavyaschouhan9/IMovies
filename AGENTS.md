# Repository Guidelines

## Project Structure & Modules

iMovies is an npm-workspaces application. `client/` contains the React 18/Vite interface; its components and pages are primarily in `client/src/App.jsx`, with shared API access in `client/src/lib/`, auth state in `client/src/context/`, and styling in `client/src/styles.css`. `server/` contains the Express API: routes, Mongoose models, middleware, configuration, and booking services live under `server/src/`. Server tests are in `server/tests/`; client tests sit alongside code (for example, `client/src/lib/api.test.js`). Deployment configuration is at the root and in the relevant workspace.

## Build, Test, and Development

Run commands from the repository root unless noted:

- `npm install` installs dependencies for both workspaces.
- `npm run dev` starts the API and Vite client together; `npm run dev:server` and `npm run dev:client` start them separately.
- `npm run build` creates the client production build.
- `npm test` runs server tests with Node’s test runner and client tests with Vitest.
- `npm run seed` loads demo movies, theaters, and shows; configure the server environment and MongoDB first.

## Coding Style & Naming

Use the existing JavaScript ES module style and React function components. Match nearby formatting; the current codebase uses compact files and generally minimal whitespace. Use PascalCase for React components, camelCase for functions and variables, and descriptive `*.test.js` names for tests. Keep API validation and booking state transitions in the server layers already responsible for them rather than duplicating business rules in the UI.

## Testing Guidelines

Add server tests under `server/tests/` using `node:test` and assertions from `node:assert/strict`. Add client tests beside the module they cover using Vitest. Name tests for the behavior they verify. Run `npm test` after changes and `npm run build` for client-facing changes. Include regression cases for route responses, authentication/authorization, booking holds, and payment state changes where applicable.

## Commits & Pull Requests

No Git history is available in this checkout to establish an existing commit convention. Use concise imperative commit subjects, such as `Add booking hold expiry test`. Pull requests should explain user-visible and API changes, note configuration or migration needs, link related issues, and include screenshots for interface changes. Describe the tests and build commands run.

## Security & Configuration

Keep credentials in ignored local environment files or deployment secrets; never commit them. Server secrets and payment credentials must remain server-side—do not put secrets in `VITE_` variables. Treat demo payment as simulated and do not use it to collect real payments.
