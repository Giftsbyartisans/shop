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
- `POST /cart`: reads the current public Listing records and ShopSettings
  from DynamoDB, then calculates quantity, sale, personalization, shipping and totals
  in cents. Cart UI uses these totals and never substitutes its own total after errors.
  Missing products and invalid quantities/personalization fail closed.

The Lambda role is restricted to reading Listing/ShopSettings, reading/writing
PaymentSettings, and writing listing media. API Gateway throttles requests. Customer
cart calculations are public, as product prices are public; admin operations verify tokens in
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

## Orders without online payment

`POST /orders` requires a valid customer Cognito access token. It accepts cart line
IDs/quantities/personalization, a saved shipping address ID, a UUID request ID, and
the displayed expected total. Lambda checks address ownership and reads current
catalog/settings records. A changed total is rejected for review. The customer order
is created with `status: pending`; it does not capture payment or mark orders paid.
Product and shipping-address snapshots are retained with the order.

The conditional order write and user-scoped request ID make retries idempotent.
Client retry IDs survive a page reload in session storage until cart cleanup
succeeds. After order creation, the frontend removes only submitted quantities
from the cart and links to account order history. Customer order records are accessible through AppSync only to admins; customers
read and create orders through the ownership-checked Lambda endpoints.
Deploy the updated CustomerOrder fields and Lambda IAM permissions before serving
the new frontend. Guest shoppers sign in and choose a saved address before ordering.

## Checkout steps

The cart's Buy now button opens `/checkout/address`. Customers sign in, choose a
saved address or save a new address inline, then use Next to open
`/checkout/payment?address=<id>`. Both steps show a full item-and-price summary.
The payment page reserves space for future gateways; Place order calls `/orders`
and creates a record explicitly marked `isSample: true`, with pending/unpaid status.
No gateway is invoked. Order confirmation remains visible after cart cleanup and
links to account order history. Deploy the `isSample` field with the backend before
serving these pages. The admin toggle grays out Buy now on the cart and Lambda
continues to reject new orders when disabled.

Order history is loaded through authenticated `GET /orders` in the same Lambda.
The server filters every page by owner identities derived from the verified Cognito
token (combined sub/username, legacy sub, or legacy username), so direct DynamoDB
orders are readable even with older AppSync owner rules. Client pagination continues
through empty filtered pages and sorts the resulting records by creation time.
The retry fingerprint is not returned. Deploy the GET route before using the new
account history client; it reports a deployment requirement if the route is absent.

`GET /orders/{id}` returns one order only after verifying the customer's access
token and checking its stored owner. Foreign and missing orders both return 404.
Account order cards open `/account/orders/<id>` in a new tab. The summary renders
archived product/personalization details, the shipping address, recorded price
breakdown, status, sample marker, and delivery estimate based on order creation.
Missing legacy snapshots are labeled unavailable rather than substituted with
current catalog details. Deploy the detail route together with the frontend page.


## Guest checkout and Order finder

Guests can submit orders without signing in. Checkout requires a valid contact
email and mobile number; the server validates both, calculates prices, and saves
contact details, product snapshots and the shipping address in CustomerOrder.
Guest ownership uses a SHA-256 identity derived from normalized email. It does
not make guest records readable to an account merely because someone types that
email. Account orders continue to use verified Cognito ownership.

Every new order receives a private random 128-bit tracking number. Footer → Track order opens `/order-finder` and accepts either email or that private tracking number. Tracking-number lookup opens the full summary. Email lookup returns only order number, date, and status (up to 100 orders). Addresses, items, prices, internal IDs, and tracking credentials are excluded from previews.

Email users click View full order details to send a six-digit code through SES. `/order-finder/code` stores a salted code hash with a random challenge, ten-minute expiry, and a 60-second resend cooldown in a private DynamoDB table. `/order-finder/verify` atomically counts attempts (maximum five), consumes the challenge once, and returns orders matching the normalized email. TTL removes expired records; expiry is also enforced during verification. Lookup and verification credentials remain in POST bodies. The preview intentionally reveals whether an email has orders; API throttling limits requests.

The default sender is `noreply@giftsbyartisans.com`, authorized through the SES-verified domain identity `giftsbyartisans.com` in the backend region (`us-east-1`). No sender inbox is required for a verified domain. Optional Amplify build variables `ORDER_EMAIL_FROM` and `ORDER_EMAIL_IDENTITY` override the sender and verified identity (domain or email). Lambda grants SendEmail for that identity and restricts the From address to the configured sender. SES sandbox accounts require verified recipients; production SES access is necessary for arbitrary customer addresses. Missing sender configuration produces a clear unavailable message rather than exposing full details. No code is returned to the browser or logged. Deploy the `byEmail` index, verification table, SES permission, and both verification routes with the frontend. Guest address drafts stay in session storage until order creation. Orders remain sample and unpaid.

AppSync CustomerOrder access is admin-only. Guest records cannot be claimed through an account username matching their email-derived owner identity; account reads filter out the reserved guest namespace.

## Admin orders

Admin → Orders loads all order pages through `GET /admin/orders`, protected by
verified Admins-group access tokens. Cards group orders by date, show archived
items, prices and shipping/contact details, and support selection and bulk
completion. New includes new, buyer-discussion and in-progress orders; Completed
contains only completed fulfillment records. Fulfillment progress is independent
of payment status. Completing a sample order does not collect or record payment.
`PUT /admin/orders/{id}` validates progress and an optional ship-by calendar date,
conditionally updates existing orders, and returns the updated record. Reopening
removes the completion timestamp. Ship-by dates are explicitly set by admins;
missing dates appear under No estimate. Filters use the administrator's local date.
Deploy the new API routes and CustomerOrder fulfillmentProgress, shipBy and
completedAt fields together with the admin interface.

## PayPal checkout

The payment step now renders PayPal's JavaScript SDK button instead of the sample
Place order action. Enter sandbox/live REST Client IDs and Secrets under Admin →
Settings → PayPal. Credentials remain encrypted in PaymentSettings and are decrypted
only in Lambda. `GET /paypal/config` returns the active public Client ID, mode and
currency; it never returns secrets. Production main uses live mode and local
frontend requests use sandbox mode through the existing mode header.

`POST /paypal/create` validates the checkout contact/address and authoritative
catalog prices using the same order service, then persists an unpaid snapshot
before creating a PayPal Orders v2 CAPTURE order. PayPal retry namespaces separate
sample, sandbox and live orders. The PayPal order ID is bound to that snapshot;
create/capture requests use stable PayPal-Request-Id values. Cart totals and IDs
supplied by a browser cannot mark an order paid. Both create and capture require
the original checkout request UUID, matching payload and optional verified customer
identity, so guest retries also require their original request data.

`POST /paypal/capture` verifies the bound PayPal order, captures through the server,
and verifies COMPLETED capture status, order identity, amount and USD currency
before conditionally marking the stored order paid. Repeated requests return the
existing paid receipt. Retrying create also recovers a completed PayPal capture
whose database update was interrupted. Live orders have isSample=false; sandbox
orders stay clearly marked as tests. Cancelled/failed attempts remain unpaid.
No automatic background/webhook reconciliation is configured; interrupted payment
confirmation is recovered when that checkout is retried. Retain pending orders
for payment support rather than deleting them blindly.

Deploy the new PayPal fields and routes with the frontend. Confirm a full sandbox
buyer checkout, cancellation and retry before using live credentials. No real
charge is performed by local automated tests.
