# Cypress testing for Cryat

This project uses Cypress 16.2.1 to test the currency converter UI and the Express API. The Cypress tests use fixed currency and rate fixtures, so they do not need a REST Countries API key or live provider access. Run commands from the repository root.

## What the suite covers

| Area | Specs | Main checks |
| --- | --- | --- |
| UI | `test/ui/*.cy.js` | Initial conversion, branding and tagline placement, picker search and keyboard behavior, mobile picker layout, swap, amount validation, tiny results, delayed responses, errors, and retry. |
| API | `test/api/*.cy.js` | Health, catalog filtering and caching, conversion response, input validation, key handling, and provider failures. |

UI specs call `mockUi()` or define `cy.intercept()` handlers to control `/api/currencies` and `/api/convert`. API specs use `ApiClient` to call a local Express app built from the real `server/src/app.js`, with a fake upstream provider. The harness exposes `/__test/reset` to choose a scenario and `/__test/state` to inspect provider calls. This keeps the tests repeatable and separate from the production API key.

## Run without Docker

Prerequisites: Node.js 22 or newer, npm, and Google Chrome. Install dependencies once from the repository root:

```sh
npm ci
```

Run the suite you need:

```sh
npm run test:cy:ui    # Build the client, then run UI specs
npm run test:cy:api   # Run API specs
npm run test:cy       # Build the client, then run all Cypress specs
```

The local scripts start the needed services and stop them after Cypress exits. UI runs serve the production client build with Vite preview at `http://127.0.0.1:4173`. API runs start the fixture harness at `http://127.0.0.1:3001`. A combined run starts both. Ports 4173 and 3001 must be available. These commands run Chrome in Cypress's normal `run` mode. The scripts set the Cypress URLs explicitly, so they do not depend on the regular app running at port 0901.

To run Cypress directly against the regular app at port 0901, start that app first, then run:

```sh
npx cypress run --browser chrome --headed
```

The direct run uses `http://127.0.0.1:0901` for UI specs and starts the isolated API fixture harness at `http://127.0.0.1:3001` for API specs. Set `CRYAT_URL` if the app uses another host port. `TEST_API_URL` points API specs to an already running fixture harness and disables the automatic local harness. `npm run cy:run`, `npm run cy:run:ui`, and `npm run cy:run:api` invoke Cypress with Chrome against these same default targets without building the client.

## Run with Docker

Prerequisites: Docker with the Compose plugin. The test stack is defined in `compose.test.yaml`. It builds an isolated fixture API, an Nginx-served client, and a Cypress container with Chrome. It does not need `.env` or `RESTCOUNTRIES_API_KEY`.

```sh
docker compose -f compose.test.yaml run --build --rm cypress
```

After the run, stop the helper containers:

```sh
docker compose -f compose.test.yaml down
```

The test Compose project is named `cryat-cypress-test`, separate from the regular app stack in `compose.yaml`. Container health checks wait for the API and web service before Cypress starts. The Cypress container targets `http://web` and `http://api:3000` on the Compose network. The Docker command runs all Cypress specs.

## Reports and failures

The `cypress-mochawesome-reporter` creates an HTML report, JSON data, and failure screenshots. Videos are disabled.

| Run type | Report to open |
| --- | --- |
| Local | `AutomationTestReport/withoutDocker/index.html` |
| Docker | `AutomationTestReport/withDocker/index.html` |

Docker writes its report to the host through a bind mount. Each run replaces the previous report for its own run type, including direct `npx cypress run` commands. The two report directories stay separate. A failing test makes the Cypress command exit with a nonzero status; inspect the command output, report, and any screenshots in the same report directory.

## Where to change tests

| Path | Purpose |
| --- | --- |
| `cypress.config.js` | Browser test URLs, spec pattern, reporter, screenshots, and support setup. |
| `test/ui/` | Browser interaction specs. |
| `test/api/` | HTTP API specs. |
| `test/pages/` | UI page objects and stable `data-cy` selectors. |
| `test/fixtures/data.js` | Currency, rate, conversion, and source-time fixtures. |
| `test/support/mock-ui.js` | UI network intercepts. |
| `test/support/ApiClient.js` | Requests to the fixture API and test control endpoints. |
| `test/support/api-harness.js` | Express fixture server and provider scenarios. |
| `test/support/run-local.js` | Starts local services, waits for readiness, runs Cypress, and stops services. |
| `test/support/run-cypress.js` | Chooses UI, API, or all specs and invokes Cypress with Chrome. |
| `test/support/prepare-report.js`, `cypress.config.js` | Clear the selected old report and publish the new HTML report. |
| `compose.test.yaml`, `test/Dockerfile` | Docker test services and Cypress image. |

For changes to UI behavior, update the related `test/ui` spec and reuse `data-cy` selectors or page objects. For API behavior, add the required scenario to `api-harness.js` and assert it through `ApiClient`. The Node unit tests (`npm test`) and client Playwright test (`npm run test:e2e -w client`) are separate from the Cypress suite.
