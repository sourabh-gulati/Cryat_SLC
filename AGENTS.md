# Cryat project guide

## What this project does

Cryat is a currency converter with a Vue frontend and an Express API. Users choose a source and destination currency, enter an amount, and see the converted value, exchange rate, and the provider's source time. The server calls the REST Countries Currencies API using `RESTCOUNTRIES_API_KEY`; the browser never receives that key.

## Structure

| Path | Role |
| --- | --- |
| `client/src/App.vue` | Main converter flow, API requests, validation, result and error states. |
| `client/src/CurrencySelect.vue` | Searchable currency picker and its keyboard/focus behavior. |
| `client/src/format.js`, `style.css` | Number/date formatting and styling. |
| `client/vite.config.js` | Dev server proxy from `/api` to Express on port 3000. |
| `client/Dockerfile`, `client/nginx.conf` | Production client build and Nginx static hosting/API proxy. |
| `server/src/app.js` | Express routes, provider requests, input checks, caching, and errors. |
| `server/src/index.js` | Starts the API on `PORT` or port 3000. |
| `test/ui/`, `test/api/` | Cypress browser and API specs. |
| `test/pages/`, `test/fixtures/`, `test/support/` | Cypress page objects, fixed data, intercepts, fixture API, and runners. |
| `client/e2e/`, `client/test/`, `server/test/` | Playwright and Node tests outside Cypress. |
| `compose.yaml` | Regular Docker app stack. |
| `compose.test.yaml` | Isolated Cypress test stack. |
| `AutomationTestReport/` | Generated Cypress reports for local and Docker runs; report contents are ignored by Git. |

## How the app works

1. The Vue app requests `GET /api/currencies` when it starts, then requests a conversion for the selected pair and amount.
2. Express fetches the provider's currency catalog and caches it for one hour. It validates currency codes and positive amounts up to 1 trillion before sending conversion requests upstream.
3. `GET /api/convert?from=USD&to=EUR&amount=100` returns `from`, `to`, `amount`, `rate`, `result`, and `asOf` (an ISO 8601 source timestamp). `GET /api/health` returns `{ "ok": true }`.
4. The UI formats the result and source time, and shows validation or provider errors. It ignores late conversion responses when a newer request has started.

## Run and verify

Use Node.js 22 or newer. From the repository root, run `npm ci`, set `RESTCOUNTRIES_API_KEY` in the environment, then run `npm run dev`. The client is served by Vite at `http://localhost:5173`; the API runs on port 3000. For the regular Docker app, copy `.env.example` to `.env`, set the key, then run `docker compose up --build`. The app is exposed at `http://localhost:0901` by default; `CRYAT_PORT` changes the host port.

Useful checks from the repository root:

```sh
npm test                # Server and client Node tests
npm run build           # Production frontend build
npm run test:cy         # All Cypress specs, local fixture services
npm run test:cy:ui      # Cypress UI specs
npm run test:cy:api     # Cypress API specs
```

For Docker Cypress, run `docker compose -f compose.test.yaml run --build --rm cypress`, then `docker compose -f compose.test.yaml down`. The Cypress fixture setup does not need a provider key. See `ReadMECypress.md` for setup, test design, and report locations. The client also has a separate Playwright suite: with the app running, `npm run test:e2e -w client` targets `http://localhost:0901` unless `CRYAT_URL` is set.

## Change guidance

- Keep the API key on the server. Use `server/src/app.js` for provider integration and response validation.
- Preserve the `/api` response fields that the Vue client consumes, especially `asOf` for the displayed source time.
- Use the existing `data-cy` hooks and page objects when changing Cypress UI tests. Keep UI tests independent of a live provider through intercepts.
- Use the fixture API harness for Cypress API tests, and add provider scenarios there when testing new failure paths.
- Keep generated builds, reports, and `.env` out of source control. `client/dist` and `AutomationTestReport` contents are generated artifacts.
