# Validation

- Frontend and backend production builds passed using Node 24.19.0 and installed dependencies.
- TypeScript checks passed, including server/api.ts.
- Fifteen HTTP integration tests passed: session/role checks, cross-origin rejection, both
  timings, SQLite restart persistence, API request order/body, live-subscription and wrong-owner
  rejection, survey failure/retry, unknown cancellation outcome, API body error and cross-session
  retry protection.
- FastSpring tests use an isolated transport stub. No actual API credentials were supplied,
  no real FastSpring request was made, and no external subscription was canceled.
- Browser preview could not reach localhost from this environment. Visual/browser interaction
  verification remains to be done after deployment.
- Docker image build and Render deployment were not executed here.
- Fresh package download was not verified. The included prebuilt bundle runs without npm install;
  rebuilding from source requires installing the declared dependencies.

Run `npm test` to repeat the HTTP checks without installing dependencies (Node 22.13+).

Version 2.1 additionally tests uncancel in simulation/test modes, deactivated rejection,
uncancel failure/unknown outcomes, and selected-reason-only admin request bodies.
