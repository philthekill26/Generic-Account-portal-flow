# FastSpring rebrand — 2.3

1. Replace the repository files with this package, including dist and public.
2. In Render → Environment, set BRAND_NAME to FastSpring.
   An existing value such as Generic overrides the new default in the code.
3. Save and deploy the latest commit. Refresh the page once deployment completes.

The login page, customer portal, admin panel, dialogs, tabs, buttons, API previews,
favicon and browser title now use the FastSpring demo identity. The supplied banner
is retained. The palette uses warm orange, charcoal and purple inspired by that banner;
green success indicators remain for status clarity.

No API credentials, login credentials or subscription IDs need to change.
The Render service name and its generic-account-portal-flow URL can remain as they are;
those do not control the portal's branding.

Build and TypeScript checks passed. This is a branding-only update; the API flow is
unchanged. Browser visual verification was not performed in this environment.
