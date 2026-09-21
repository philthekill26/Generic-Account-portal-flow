# Upgrade to 2.1

1. Replace the repository files with the contents of this ZIP, including the entire dist folder.
2. Keep your existing Render environment variables. No additional credentials are needed.
3. Commit to GitHub and deploy the latest commit in Render.
4. Sign in as customer, cancel at end of term, then use Uncancel subscription → Restore subscription.
5. Submit another cancellation and open Admin → API requests and responses. The survey
   request must show only your selected reason ID and feedback, not all available reasons.

An immediately deactivated subscription cannot be uncanceled. Use a fresh test subscription
for that scenario. Existing SQLite data is migrated automatically; make a backup when using
a persistent disk. As before, free Render local storage is ephemeral.

Historical survey rows remain, but exact request/response logging begins with this release.
No live FastSpring account call or Render deployment was performed during this update.
