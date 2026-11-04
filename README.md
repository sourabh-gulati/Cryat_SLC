# Cryat

**Decoding the future of currency conversion.** A dark themed currency converter built with Vue, Express, and the REST Countries Currencies API.

## Run with Docker Compose

1. Copy `.env.example` to `.env` and set `RESTCOUNTRIES_API_KEY` to your key.
2. Run `docker compose up --build`.
3. Open [http://localhost:0901](http://localhost:0901).

Set `CRYAT_PORT` in `.env` to use another host port.

## Run locally

Use Node.js 22 or newer. Set `RESTCOUNTRIES_API_KEY` in your environment, run `npm install`, then `npm run dev`. Open [http://localhost:5173](http://localhost:5173). The Vite dev server proxies `/api` to Express on port 3000.

## API

- `GET /api/currencies` returns the provider's supported catalog, cached for one hour.
- `GET /api/convert?from=USD&to=EUR&amount=100` returns the conversion and the provider's `as_of` time as ISO 8601.
- `GET /api/health` returns a basic health response.

The API key is used only by Express and is never sent to the browser. The currency list includes historical codes and non-fiat units if the provider supports them. Rate freshness depends on your REST Countries plan; the result displays the actual sourced time.

Run `npm test` for backend checks and `npm run build` for the production frontend build.

With the app running, `npm run test:e2e -w client` runs browser interaction tests against `http://localhost:0901`. Set `CRYAT_URL` to test a different local URL.

## Cypress automation

The Cypress 16 suite uses controlled provider responses and does not need a REST Countries API key. Use Node.js 22 or newer and Chrome for local runs. The commands build and serve the frontend or start the test API harness as needed, then stop those processes when the tests finish.

| Command | Tests |
| --- | --- |
| `npm run test:cy:ui` | UI only |
| `npm run test:cy:api` | API only |
| `npm run test:cy` | UI and API together |

The latest local Mochawesome report is at `AutomationTestReport/withoutDocker/index.html`. Each command replaces the previous local report. The original Playwright and Node tests remain available.

To run the same combined suite in Docker, start Docker Desktop and run:

```sh
docker compose -f compose.test.yaml run --build --rm cypress
```

The Docker report is written to the host through a bind mount at `AutomationTestReport/withDocker/index.html`. Docker and local reports are kept separate, and each run replaces only its own mode's report. The Compose test stack runs a fixture API, so it does not need `.env` or a provider key.

The one-off Cypress container exits after the run; stop its helper containers with `docker compose -f compose.test.yaml down` when finished. This test stack has its own Compose project name and does not stop the regular Cryat app.
