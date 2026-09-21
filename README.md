# Generic account portal — FastSpring test integration

Reusable seller demo with neutral branding, customer login, subscription management,
profile/payment/order sample tabs, a cancellation survey, and a separate admin login.

## Start locally

Install Node.js 22.13 or later (Node 24 recommended), extract this folder, then run:

```sh
npm start
```

Open http://localhost:3000. No npm install is needed to run the included prebuilt app.
You can also use start-mac-linux.sh or start-windows.cmd from this directory.
Simulation runs offline once Node is installed. Building from source needs dependencies;
FastSpring test mode always needs internet access.

| Experience | Username | Password |
| --- | --- | --- |
| Customer, simulation default | customer@demo.example | CustomerDemo! |
| Admin, simulation default | admin@demo.example | AdminDemo123! |

These are intentionally public simulation credentials. Test mode requires separate
credentials you configure yourself; defaults are disabled. Do not use real customer data.

## Demo walkthrough

1. Sign in as customer. View the profile, payment, order and subscription tabs.
2. Click Cancel subscription. Pick a reason, optional feedback and immediate/end-of-term timing.
3. Confirm. The server saves the survey before requesting cancellation.
4. Sign out and sign in as admin. Review cancellation outcomes and feedback.
5. In simulation, reset the subscription from the customer screen to repeat.
6. In test mode, use a fresh test subscription for another cancellation demonstration.

## Connect your FastSpring test account

See [the Render guide](docs/GITHUB-AND-RENDER.md) for the exact environment variables.
Credentials stay on the Node server and are never returned to the browser.

The backend verifies the configured subscription ID, account ID and `live: false`
before any FastSpring mutation. The customer cannot supply an arbitrary subscription ID.
There is no production/live mode. This is a single-fixture demonstration, not a
multi-customer identity system.

The test subscription, survey options, saved survey read-back and cancellation calls
are real FastSpring API data. Profile, payment history and order history remain visibly
labelled sample content. No payment or refund endpoints are called.

## Build / modify

```sh
corepack enable
corepack prepare pnpm@11.25.0 --activate
pnpm install --frozen-lockfile
pnpm build
pnpm typecheck
pnpm test
```

Or install the declared pnpm version by your preferred package-manager installation method.
Commit **both source and rebuilt dist/** after changes: Docker serves the bundled dist files.
The included Dockerfile does not run the frontend compiler.

- `src/App.tsx`, `src/styles.css`: React UI
- `server/api.ts`: auth, fixture checks, survey and cancellation workflow
- `server/index.mjs`: Node HTTP/static server
- `server/store.mjs`, `server/schema.sql`: SQLite persistence
- `dist/client`, `dist/server`: ready-to-run application
- `tests/`: HTTP tests with an isolated FastSpring transport stub
- `docs/`: API mapping, Render instructions, validation notes

## Hosting

Upload the extracted folder contents to a new GitHub repository, with Dockerfile,
package.json, render.yaml and dist/ at its root. Follow docs/GITHUB-AND-RENDER.md.
Keeping this separate preserves the original Clario demo.

SQLite stores sessions and local survey attempts in `DATA_DIR/portal.sqlite`.
Use one server instance and a persistent disk to retain those records on Render.
Free Render services lose local data on restart, redeploy and idle spin-down.
FastSpring responses saved through its API remain in FastSpring independently.

## Boundaries

This is a test/demo app. Production use would require real customer identity, per-customer
ownership mapping, durable shared storage, operational monitoring, webhook reconciliation,
and an agreed privacy/retention policy. Admin currently shows the latest 200 local attempts
and FastSpring read-back for the one configured subscription, not store-wide analytics.

A survey save failure prevents cancellation. A cancellation timeout or unconfirmed response
stays pending for review; the app will not blindly repeat the DELETE. See the integration
guide for recovery. No secrets or real test credentials are included in this package.
