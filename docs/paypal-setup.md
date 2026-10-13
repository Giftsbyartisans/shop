# PayPal credentials

Admin → Settings → PayPal saves separate sandbox and live Client IDs/Secrets through
the Lambda backend. The Lambda encrypts the entire configuration using AES-256-GCM
with a fresh nonce on every save. DynamoDB PaymentSettings stores ciphertext only;
public ShopSettings and media snapshots contain no payment credentials. The API
verifies Cognito Admins membership and returns only Client IDs and secret-presence
flags. AWS Secrets Manager is not used.

Deploy the backend and regenerate outputs before using the admin form. The frontend
requires `custom.backendApiUrl`. See [Lambda deployment](lambda-backend.md).

Set `PAYPAL_ENCRYPTION_KEY` in the Amplify build environment to exactly 64 hexadecimal
characters (32 bytes); the backend injects it into Lambda's private environment.
Never prefix it with `NEXT_PUBLIC_`. For sandbox deployment, pass the existing key
from ignored `.env.local` to the deployment process; Next.js itself no longer needs
this key. The production backend connection must stay in root amplify_outputs.json;
sandbox outputs belong in `.amplify/sandbox-outputs`.

Preserve the key used for existing encrypted records. Changing or losing it makes
saved credentials unreadable. Keep a secure backup; rotate by re-encrypting existing
records, or remove the encrypted record and re-enter credentials. Separate databases
may use different keys. No AWS secrets are automatically deleted or migrated.

The admin form's mode is automatic: local `npm run dev` requests sandbox mode;
production builds request live. Only a backend deployed for production `main` can
use live mode. Both credential pairs can be saved independently; blank secret fields
retain existing secrets, changing a Client ID requires its matching new secret,
and clearing a Client ID with a blank secret removes that pair.

Create PayPal credentials at https://developer.paypal.com/dashboard/applications.
Customer PayPal order creation, capture and reconciliation remain follow-up work.
