# Lambda backend

The custom backend is an Amplify-managed `shop-api` Lambda behind API Gateway HTTP
API. Frontend calls use `custom.backendApiUrl` in generated Amplify outputs.
All Next.js `/api` handlers have been removed. Next.js still renders the storefront
and its sitemap/robots metadata. Existing Cognito authentication, AppSync model
operations, DynamoDB records, S3 uploads and CloudFront media remain managed AWS
services; AppSync model CRUD does not require an extra Lambda hop.

Routes:

- `GET/PUT /admin/paypal`: verifies a Cognito access token and Admins membership;
  encrypts credentials using the Lambda environment key before storing in DynamoDB.
- `POST /import-image`: admin-only Etsy import with URL and image validation;
  uploads the source into the listing's media folder and returns its CDN URL. The
  browser creates the established image variants. Folder cleanup removes sources
  with the rest of each listing's media.
- `GET /favicon`: redirects to the 320px CDN image or returns the bundled icon.
  It no longer transcodes a separate 48px PNG on each request.
- `POST /cart/quote`: reads the current public Listing records and ShopSettings
  from DynamoDB, then calculates quantity, sale, personalization, shipping and totals
  in cents. Cart UI uses this quote and never substitutes its own total after errors.
  Missing products and invalid quantities/personalization fail closed.

The Lambda role is restricted to reading Listing/ShopSettings, reading/writing
PaymentSettings, and writing listing media. API Gateway throttles requests. Customer
quotes are public, as product prices are public; admin operations verify tokens in
Lambda regardless of CORS or caller-supplied headers.

## Deployment

`amplify.yml` deploys the backend for the current Amplify branch before building
Next.js. Production `main` Lambda uses live mode. Other branches/sandboxes use
sandbox. A local frontend can request sandbox in the admin configuration view;
headers never grant admin access and a sandbox backend cannot select live mode.
Checkout buttons/capture are not implemented by this migration.

Set `PAYPAL_ENCRYPTION_KEY` in the Amplify build environment to the existing
64-character hex encryption key **before deployment** if credentials already exist.
The deployment injects this into Lambda's private environment, never frontend
outputs. Preserve the existing key so existing ciphertext remains readable.
Do not use a `NEXT_PUBLIC_` variable. Secrets Manager is not required.

Sandbox validation can pass the ignored `.env.local` key into the deployment process.
Use `--outputs-out-dir .amplify/sandbox-outputs` to keep production outputs intact.
Production local work uses outputs generated for the production branch after its
backend has deployed. The current developer AWS identity lacks `amplify:GetBranch`;
production deployment must run using the Amplify build role or suitably authorized
AWS credentials. Until deployed outputs contain `backendApiUrl`, the new frontend
reports that the Lambda backend must be deployed instead of using the removed routes.
