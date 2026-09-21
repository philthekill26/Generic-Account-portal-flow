# GitHub and Render

## 1. Upload

Create a separate repository for this generic version. Extract the ZIP and upload its
**contents**, not the ZIP file. Dockerfile, package.json, render.yaml and dist must be
at the repository root. Include source, scripts, components, lib, vendor and tests.
Never upload .env, node_modules or data. Keep .env.example as the blank template.

## 2. Deploy the visual demo

In Render select New → Web Service, connect the repo, then use:

| Setting | Value |
| --- | --- |
| Language | Docker |
| Branch | main |
| Root Directory | Leave blank |
| Docker Build Context | . |
| Dockerfile Path | ./Dockerfile |
| Docker Command | Leave blank |
| Health Check Path | /healthz |
| Compute | Free for disposable simulation; paid + disk for durable test activity |

Add FS_MODE=simulation, TRUST_PROXY=1 and optionally BRAND_NAME=YourBrand.
Deploy, open the HTTPS URL and try both demo logins. Set PUBLIC_ORIGIN to that exact
HTTPS origin (no path or trailing slash). The Docker image supplies HOST=0.0.0.0.
The bundled render.yaml can alternatively create the simulation service as a Blueprint.

## 3. Enable actual test API requests

In Render → service → Environment add these values. Save secrets here, not in GitHub
or the chat. API credentials and portal login credentials are different things.

| Variable | Value to enter |
| --- | --- |
| FS_MODE | test |
| FS_API_USERNAME | Your FastSpring API username |
| FS_API_PASSWORD | Your FastSpring API password |
| FS_SUBSCRIPTION_ID | An active disposable TEST subscription ID |
| FS_ACCOUNT_ID | The account ID that owns that subscription |
| CUSTOMER_USERNAME | Your chosen demo customer username |
| CUSTOMER_PASSWORD | A unique password, at least 12 characters |
| ADMIN_USERNAME | Your chosen demo administrator username |
| ADMIN_PASSWORD | A different password, at least 12 characters |
| TRUST_PROXY | 1 |
| PUBLIC_ORIGIN | Exact Render HTTPS origin, e.g. https://your-service.onrender.com |
| BRAND_NAME | YourBrand, or another seller-neutral name |
| DATA_DIR | /data |

The service intentionally refuses to start in test mode when required settings are
missing or portal passwords do not meet the minimum. Default logins are not enabled.
Use a paid persistent disk mounted at /data for reliable local history and pending-operation
records. Set up filesystem ownership so the container's `node` user can write the disk.
A single service instance is required for this SQLite edition.

Changing the subscription/account/login settings invalidates previous sessions. Log in again.
Choose a fresh test subscription when demonstrating the other cancellation timing option.
Cancellation can affect test-subscription state and may trigger configured test notifications.

## 4. Validate your connection

1. Open the service and confirm “FastSpring test connection”.
2. Sign in with the CUSTOMER credentials and verify the expected subscription ID and plan.
3. Open cancellation and confirm reasons load from FastSpring.
4. Submit a reason and feedback, select a timing, and confirm.
5. Inspect the subscription in FastSpring to confirm the selected outcome.
6. Log in as ADMIN. Check the local attempt status and the FastSpring read-back.

For troubleshooting: inspect the browser Network tab for `/api/portal` status and response,
then Render logs, then the configured test account/subscription in FastSpring. Never share
API Authorization headers or populated environment values in screenshots.

HTTP 401 from the portal means sign in again. A FastSpring HTTP 401 error points to API
credentials. HTTP 429 means wait and retry; the returned message includes Retry-After when
provided. A subscription verification error means the ID, account or test flag did not match.

## Storage and updates

Free Render services lose SQLite history on idle spin-down/restart/redeploy and can take
about a minute to wake. This also loses locally tracked pending outcomes. Use a persistent
disk for connected test demonstrations; do not treat the free instance as an audit store.
After source changes, run pnpm build and upload the rebuilt dist folder as well.

Sources:
- https://render.com/docs/docker
- https://render.com/docs/free
- https://render.com/docs/disks
