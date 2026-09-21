# FastSpring integration

All API calls originate on the Node server with HTTP Basic authentication to
https://api.fastspring.com. The browser only calls same-origin /api/portal and /api/admin.
No user-selectable upstream URL or browser-supplied subscription ID is accepted.

| Step | Request | Use |
| --- | --- | --- |
| Verify fixture | GET /subscriptions/{id}?scope=test | Require matching id/account and live === false |
| Load survey | GET /subscriptions/cancelSurvey/reasons/{id}?lang=en | Render enabled reasons |
| Save answer | POST /subscriptions/cancelSurvey/response | Send subscription and cancelSurvey |
| Cancel now | DELETE /subscriptions/{id}?billingPeriod=0 | Immediate cancellation |
| Cancel at term | DELETE /subscriptions/{id}?billingPeriod=1 | End-of-period cancellation |
| Admin read-back | GET /subscriptions/cancelSurvey/reasons/{id}?lang=en | Read reasons if active, saved response if canceled |

Survey request:
```json
{
  "subscription": "SERVER_CONFIGURED_TEST_SUBSCRIPTION",
  "cancelSurvey": {
    "reasonId": "1",
    "feedbackText": "Customer feedback",
    "lang": "en"
  }
}
```

Reason IDs are validated against the current enabled reasons returned by FastSpring.
The demo uses English. Feedback is limited to 2,000 characters by this app.
The API documentation lists cost, need, usability, support, integration, alternative and other.
The customer-facing labels come from the retrieval response in test mode.

A successful HTTP status alone is not enough for cancellation: the matching entry in
`subscriptions[]` must have `result: "success"`. Failed or unexpected responses never
produce a success message. Immediate cancellation does not issue a refund.

## Persistence and recovery

The local survey record is written first, then sent to FastSpring. On survey failure,
no cancellation is sent; retry updates the same pending record in the current session.
On confirmed survey save, the local state becomes survey_saved, then cancel_requested
before DELETE. Only a confirmed successful cancellation changes it to complete.

A cancellation error/timeout may have an unknown outcome. Refresh/check FastSpring first.
A repeated request rechecks the subscription. If it is already canceled, the pending record
is reconciled as complete. If it is still active, a cancel_requested record blocks another
DELETE, even from a new portal session. Review in FastSpring before retrying.

For demo recovery, the simplest safe route is to configure a fresh disposable test subscription.
For a interrupted process, the subscription lock remains deliberately held. After confirming
no request is still running and checking the actual subscription in FastSpring, an operator
can back up SQLite and remove that specific portal_locks row. Do not automatically expire
locks or clear pending outcomes merely because a request timed out. This demo has no
background reconciliation or webhook receiver.

Authentication uses hour-long random sessions, hashed tokens in SQLite, HttpOnly SameSite
cookies, origin checks on mutations, role checks, constant-time credential comparison and
login throttling. The demo uses fixed operator-configured identities, not seller SSO.

## Documentation consulted

- https://developer.fastspring.com/reference/configure-cancel-survey
- https://developer.fastspring.com/reference/retrieve-cancel-survey
- https://developer.fastspring.com/reference/cancel-a-subscription
- https://developer.fastspring.com/reference/retrieve-a-subscription

Schemas checked on 17 September 2026. Actual account testing still requires credentials
and a disposable test subscription. Mock-based verification is not proof of an account's
API permissions or the live service's availability.

## Version 2.1: uncancel and request/response history

A customer can remove a scheduled cancellation while the subscription is still active.
The app verifies test mode/account ownership, asks for confirmation, then sends:

```json
{"subscriptions":[{"subscription":"SERVER_CONFIGURED_TEST_SUBSCRIPTION","deactivation":null}]}
```

Endpoint: POST /subscriptions. A matching success entry is required. Deactivated
subscriptions are rejected; this button is not a repurchase/reactivation flow.
Source: https://developer.fastspring.com/reference/update-a-subscription

The admin mutation history now stores actual POST/DELETE JSON requests and responses,
HTTP status, timestamp and operation. A survey submission still contains only one
selected reasonId (cost is "1"), feedbackText and lang. The reason options GET response
is not a submission and is no longer displayed in the admin payload viewer.
Authentication headers are never logged. Simulation records are explicitly labelled.
Earlier request/response bodies cannot be recovered; the activity log starts on upgrade.
SQLite automatically adds the activity table without deleting existing surveys.
