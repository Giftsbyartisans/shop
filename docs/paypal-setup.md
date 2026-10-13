# PayPal admin credentials

Admin → Settings → PayPal accepts separate sandbox and live Client IDs and Secrets.
The Next.js server encrypts the entire configuration using AES-256-GCM with a fresh
random nonce for each save. Only ciphertext is stored in the Amplify PaymentSettings
model, which is restricted to the Admins group. The admin API returns Client IDs and
secret-presence flags, never saved secrets. Public website settings remain separate.
AWS Secrets Manager is no longer used.

## Local setup

A random `PAYPAL_ENCRYPTION_KEY` has been generated in the ignored `.env.local` file.
Do not share this file or commit it. Restart `npm run dev` after changing the key.
This checkout uses the production backend for its existing catalog. The PayPal
model was deployed to the development sandbox only. To use PayPal configuration
alongside the production catalog, deploy the model through the production Amplify
pipeline and regenerate the matching outputs. Do not run the sandbox command in
this checkout to restore production data: it replaces the backend connection.

For a separate development checkout, deploy using the sandbox workflow:

```sh
npx ampx sandbox --once --profile shop-dev
```

Then open Admin → Settings → PayPal and enter the PayPal app credentials.

To restore this checkout's production connection after a sandbox deployment:

```sh
npx ampx generate outputs --app-id d3r1sr91624ks6 --branch main --profile shop-dev
```

## Production setup

Deploy the updated Amplify backend, then set `PAYPAL_ENCRYPTION_KEY` in your hosting
server environment. It must contain exactly 64 hexadecimal characters (32 bytes).
Never prefix it with `NEXT_PUBLIC_`. Use a different key for a separate production
database. A new key can be generated using `openssl rand -hex 32`.

Keep a secure backup of the key. Changing or losing it makes existing encrypted
credentials unreadable. To rotate, re-encrypt the stored record with the new key or
remove the existing PaymentSettings record and re-enter PayPal credentials.

If credentials were previously saved in Secrets Manager, re-enter them in the admin
panel; there is no automatic migration. Remove the old secret only after verifying
the replacement setup. No deletion of AWS secrets is performed by this change.

Blank secret fields keep the saved secret. Changing a Client ID requires its new
secret. Clearing the Client ID and leaving the secret blank removes that pair.
Live mode requires live credentials. Get credentials from
https://developer.paypal.com/dashboard/applications.

This prepares configuration; customer payment buttons and server order creation,
capture, and reconciliation remain follow-up work. Server checkout code will need
a restricted server authorization path to read this model without an admin session.
