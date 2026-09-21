# Version 2.2 — FastSpring demo branding and API previews

Replace the GitHub repository contents with this package, including dist and public.
Redeploy in Render. Existing credentials and environment variables remain valid.

- Uses the supplied FastSpring banner and clearly labels the portal as a FastSpring demo.
- Cancellation dialog shows a dynamic request preview before confirmation: one selected
  reasonId, feedbackText and lang, followed by DELETE with the chosen billingPeriod.
- Uncancel dialog previews POST /subscriptions with deactivation: null.
- Documentation links appear in the subscription panel, dialogs and admin panel.
- Preview is illustrative in simulation mode; no API requests are sent in that mode.
- In test mode, the server rechecks subscription eligibility and the enabled reason before
  sending. If the upstream state has changed, it can reject the previewed action.
- Admin shows recorded mutation requests/responses after submission.

Both survey endpoints remain connected: configure-cancel-survey submits the answer;
retrieve-cancel-survey loads options and reads back saved responses.

Production build, type checks and 15 HTTP tests passed. No live FastSpring account
calls, Render deployment or browser visual verification were performed for this update.
