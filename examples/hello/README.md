# node-runner-hello

A tiny sample app for smoke-testing node-runner deploys. It exercises the full
pipeline: `npm ci` → `npm run build` (tsc → `dist/`) → `node dist/server.js`,
binding to `process.env.PORT`, plus a websocket echo endpoint at `/ws`.

Deploy settings to use in node-runner:

| Field | Value |
|-------|-------|
| install command | `npm ci` |
| build command | `npm run build` |
| start command | `node dist/server.js` |
| port | any free internal port, e.g. `3001` |
