# GiftsByArtisans

Next.js storefront and admin portal backed by Amplify Gen 2 (Cognito and DynamoDB/AppSync).

## Setup

```sh
npm install
npm run sandbox
```

The sandbox uses the configured `shop-dev` AWS profile. `npm run sandbox` writes its configuration to `.amplify/sandbox-outputs/amplify_outputs.json`, preserving the root backend configuration used by this checkout. The root `amplify_outputs.json` must be present before building the frontend. The sandbox has separate data and users; it does not contain the production catalog. For a sandbox frontend, explicitly copy the sandbox configuration to the root in a separate development checkout. Existing outputs from the Todo starter do not support the new models.

In the deployed Cognito user pool, create an administrator with an email and temporary password, then add the user to the `Admins` group. Open `/admin` to sign in and set their permanent password. Group membership is granted through AWS administration, never through the public frontend.

```sh
npm run dev
npm run lint
npm test
npm run build
```

## Catalog and inbox

Admins can create, edit, publish, unpublish, and delete listings and import the bundled sample catalog. Customers browse published listings on `/`, `/collection`, and `/listing/[id]`, with search, category filtering, and price sorting. Contact and wholesale forms persist inquiries to the admin inbox; they do not send email.

`DraftListing` is accessible only to the `Admins` Cognito group. `Listing` holds public copies with guest and authenticated read access and admin write access. `Inquiry` allows customer creation and admin reading/deletion. Public users cannot query drafts or read customer messages.

Publication uses sequential requests across the draft and public models. Unpublishing and deletion remove public copies first. If a request fails midway, the portal reports the error; refresh and save again to reconcile the public copy. This is not an atomic multi-table transaction. The portal does not currently support concurrent edit conflict detection.

No catalog is automatically seeded. Use “Import sample listings” in `/admin` or add your own listings. Browser demo data is not migrated. Admins can use HTTPS image URLs or upload PNG, JPEG, and WebP images up to 8 MB. Uploaded images live under the public-read, admin-write `media/` storage prefix. Checkout is outside this implementation.

For a hosted deployment, deploy the Amplify backend and generate matching outputs before the Next.js build. Do not use sandbox resources as the production backend.

## Shop Manager website editor

`/admin` has a compact sidebar with Listings, Messages, Brand & announcement, Banner Image, Categories, Sale, Testimonials, Social & footer, and Pages & policies as direct navigation links. Listings is the default view. The sidebar collapses on desktop and adapts to smaller screens. Website edits remain in the editor until “Save website changes” succeeds; unsaved changes trigger a browser navigation warning.

Website settings are stored in the singleton `ShopSettings` record (`website`), with public read access and Admins-only writes. Uploads store durable S3 paths, with fresh signed URLs resolved by the frontend. Customers receive saved settings when opening or reloading the shop. Uploaded files are immediately stored; removing an image from settings does not delete it from S3.

Deploy the updated data and storage resources using `npm run sandbox` before trying the editor against AWS. The old backend configuration cannot serve `ShopSettings` or the new `media/` upload permissions.

## Admin listing catalog

Listing cards and edit links open the selected listing editor in a new browser tab. Listings use product cards with title/description search, category filters, price/title/date sorting, published/draft filters, and best-seller stars. Clicking a best-seller star immediately saves the change and controls the storefront’s Best sellers section. Only selected, published listings appear in the Best sellers section.

“Export JSON” downloads the catalog. “Import Etsy CSV / JSON” accepts Etsy-style TITLE, DESCRIPTION, PRICE, IMAGE1 columns or this app’s exported JSON, imports every valid listing in the file (8 MB maximum), and has no listing-count limit. Matching IDs update existing listings; listings without an ID receive a unique UUID. Listing IDs are included in the S3 folders used for their uploaded photos and videos. CSV imports default to drafts unless an explicit `published` column is true; exported JSON preserves its published status. Review imported gifts before publishing. Category defaults to Uncategorized when absent. This importer does not synchronize with an Etsy account.

“Delete all listings” asks for confirmation before removing the catalog. Export a backup first if you need to restore it. Operations across multiple records are sequential and can partially complete if a backend request fails.

Listing editors provide Save draft, Publish listing, and Unpublish listing actions instead of a published checkbox. Optional Etsy and Pinterest URLs appear as buttons on the public listing page only when provided. Deploy the updated data schema (`etsyUrl` and `pinterestUrl`) with `npm run sandbox` before saving these fields.

## Full-page listing editor

The editor uses a two-column form with regular and optional sale prices, Etsy/Pinterest URLs, category, photo/video tiles, a description, and best-seller selection. Up to 10 photos (PNG/JPEG/WebP, 8 MB each) and 2 videos (MP4/WebM, 50 MB each) are supported. The first photo is the thumbnail; use Make primary to reorder it. Removing a photo/video tile deletes its unused S3 original and variants when the listing is saved.

Saved sale prices apply independently of the storewide sale switch and override its percentage discount. Customer listing pages display the photo gallery and videos. Publish remains a button. Successful saves close the editor tab. Deploy the added `salePrice`, `images`, and `videos` fields with `npm run sandbox` before using these features with AWS.

### Storefront image delivery

The Amplify backend defines a CloudFront distribution with S3 Origin Access Control. A viewer-request function permits only `/media/` paths; personal `/uploads/` files continue using authenticated S3 access. The generated `custom.mediaCdnUrl` output enables stable CDN URLs without browser-side signing. Deploy the backend through the existing Amplify deployment pipeline (or `npm run sandbox` for development), regenerate `amplify_outputs.json`, then rebuild the frontend. Until that output exists, images continue using signed S3 URLs.

Admin image uploads prepare 320, 640, 960, and 1600 pixel WebP variants in the browser, retain the original, and upload at most two files concurrently. Listings receive an image reference only once all uploads finish; failed uploads attempt to remove completed files. UUID paths carry a one-year immutable cache policy. Product images use responsive `srcset`; the hero and detail photo load eagerly. Existing media uses the CDN after deployment but needs re-uploading to gain variants. Deleting a listing removes its referenced S3 photos, complete UUID image folders (including originals and variants), and videos before deleting the public and draft records. Media referenced by other listings or website settings is preserved. Storage failures keep the listing records available for retry; some files may already be removed. Replacing photos or removing them from the editor does not clean up previously detached uploads. Concurrent admin edits during deletion are not locked, so avoid attaching the same media to another listing while deleting it. Public CDN copies can remain cached for a year; immediate withdrawal requires CloudFront invalidation and S3 deletion.


All app image upload fields use the same CloudFront pipeline: listing photos, banner slides, category images, brand logos, favicons, and admin previews. Logos and preview images declare their display size for responsive selection; favicons use the 320px CDN variant. Manually entered external image URLs remain on their original host. Optionally set `NEXT_PUBLIC_MEDIA_CDN_URL=https://your-distribution.cloudfront.net` at frontend build time to use an existing distribution instead of the generated `custom.mediaCdnUrl`. That distribution must use this shop's bucket and permit `/media/` paths. Rebuild after changing this setting. No CDN address is currently present in the local generated outputs; backend deployment and refreshed outputs are required to activate the default CDN path.

### Production Cognito recovery (October 10, 2026)

The `main` backend stack `amplify-d3r1sr91624ks6-main-branch-b045bbc189` still tracks the deleted Cognito user pool `us-east-1_kN18CFDrm`. Updating the Admins group fails because that pool no longer exists. `amplify/auth/recover-production-pool.ts` assigns new permanent logical IDs to the user pool and app client only in this affected root stack. The next deployment creates them and updates generated references, including the Admins group, identity pool providers, and AppSync auth. Other stacks retain their existing logical IDs. Keep the recovery code after deployment to avoid another auth replacement.

Redeploy `main` through Amplify Hosting after pushing this repair. The stack was observed in `UPDATE_ROLLBACK_COMPLETE`, so it can accept another update. Recreate your administrator in the new Cognito user pool and add them to `Admins`; users and passwords from a deleted pool cannot be recovered by this code. Hosting must build using the newly generated `amplify_outputs.json`. This repair does not reset the database or S3 bucket. Local AWS credentials can inspect CloudFormation but cannot describe Cognito or perform drift detection; successful live recovery must be verified in the Hosting deployment logs.


### Early homepage banner loading

Saving website settings now publishes the same public content to `media/website-settings.json` with a 30-second CloudFront cache policy. After deploying this change, save Website settings once to create the snapshot. The homepage reads it on the server, renders the saved banner in the initial HTML, and emits an image preload with responsive sizes plus a CDN preconnect. This removes the browser-side Amplify settings/authentication wait from the banner's initial request. Snapshot results are cached on the server for up to 60 seconds; combined CDN/server caching can briefly show earlier settings (roughly up to 90 seconds). Client-side settings revalidation still applies the current database values. A missing or unavailable snapshot uses the existing client loader without displaying sample banner text. Legacy original-sized banner files should be re-uploaded to get WebP variants.


### Early catalog image loading

The homepage, collection, and listing-detail routes now receive server-loaded public settings and published listings from CloudFront snapshots, so images can appear in streamed HTML without waiting for browser-side Amplify authentication and catalog queries. The first three collection cards load eagerly; remaining photos and thumbnails use lazy loading with responsive sizes. Detail photos receive a responsive preload. Listing saves, publication changes, and deletions refresh `media/published-listings.json`; drafts are excluded. Saving Website settings also refreshes this catalog, so save once after deployment to initialize it for existing products. Snapshot caching has the same brief update delay as the settings snapshot, and the browser revalidates against the database. Snapshot publication failures are reported separately from saved database changes and can be retried by saving Website settings. Existing original-sized photos need re-uploading to gain smaller WebP variants.


Removing a saved banner or replacing its image and then saving Website settings now removes the old banner's S3 original and WebP variants. A banner image still used by another banner, logo, favicon, category, published listing, or draft is preserved. Removing a banner in the editor alone does not delete files until Save. S3 cleanup failures retain the previous settings for retry (some objects may already be gone). Unsaved uploads and media removed before this feature was deployed are not automatically discovered. CloudFront cached copies can remain until expiry or invalidation.


### Descriptive S3 upload folders

New media is organized under `media/banners/`, `media/categories/`, `media/logos/`, `media/favicons/`, `media/listing-images/`, and `media/listing-videos/`. Each contains a readable entity name (with its ID when available), then the original filename stem and a unique upload ID. Example: `media/listing-images/copper-gift-box-product-42/front-view--<uuid>/original.jpg`, alongside `320.webp`, `640.webp`, `960.webp`, and `1600.webp`. Names are sanitized for safe S3 keys. A renamed listing keeps its earlier upload path; subsequent uploads use the current title. Older UUID-only objects keep their existing paths, and both layouts work with CloudFront, responsive image selection, and media cleanup. Originals and variants are deleted per upload folder, never by deleting an entire listing/category folder. Public settings/catalog snapshots retain their stable filenames at the media root.

### Etsy photo imports

CSV/JSON imports copy photos hosted on `i.etsystatic.com` and `img0`–`img4.etsystatic.com` into `media/listing-images/etsy-<listing-id>/`. The authenticated admin download endpoint checks the source and image bytes, limits downloads to 8 MB, and rejects redirects. The browser generates the same responsive WebP sizes as normal uploads; delivery uses the configured CloudFront CDN. Etsy listing links remain unchanged. Other external image hosts retain their URLs.

Reimports with the same listing ID and photo URL reuse an existing S3 copy. Include `listing_id` or `id` in the import to preserve this identity; files without IDs generate new listings. Failed photo copies leave the affected imported listings as drafts and show the error so you can retry. Successfully copied photos are retained. Uploads require a browser supporting WebP canvas and image decoding, as with regular uploads. Deploy the new `/api/import-image` route before testing this on the hosted site.

Saved listing sale prices display independently of the storewide sale switch. The storewide percentage applies to listings without a saved sale price. Discounted listings show their original price and percentage off on cards and product pages; all listings display a Free Shipping tag.

Removing or replacing saved category images, banners, logos, or favicons cleans up their unused S3 upload folders when website changes are saved. Files referenced by another listing or website field are preserved. Cleanup failures stop the save so it can be retried. Removing unsaved uploads does not trigger this saved-record cleanup.

The public sitemap is available at `/sitemap.xml` and includes public pages, categories with published products, and published listings. `/robots.txt` advertises the sitemap and excludes admin and API routes. Set the Amplify Hosting environment variable `SITE_URL` to your canonical HTTPS website address (for example, `https://your-domain.com`) so sitemap links always use your preferred domain. Without it, the requesting host is used. Catalog entries refresh through the existing public catalog cache.

## Lambda backend

Custom API operations now run in the Amplify-managed `shop-api` Lambda through API
Gateway: PayPal settings, Etsy image import, favicon delivery, and authoritative
cart totals. Next.js `/api` handlers have been removed. Managed AppSync CRUD,
Cognito auth, DynamoDB, S3, and CloudFront remain in use. The frontend reads
`custom.backendApiUrl` from matching generated outputs. See
[deployment and permissions](docs/lambda-backend.md).

The tracked `amplify.yml` deploys the branch backend before the Next.js build.
Configure `PAYPAL_ENCRYPTION_KEY` in the Amplify build environment so the Lambda
retains access to previously encrypted credentials. Sandbox outputs stay separate
from production. These changes require production backend deployment before the
new frontend is served.


Public search metadata uses a unique title, description, and self-referencing canonical URL for each product, category, policy, and main public page. Set `SITE_URL` to the preferred HTTPS domain in Amplify Hosting; that same origin is used by the sitemap. Product and category URLs that do not exist return 404.

Server rendering first reads the published CDN snapshots. If a snapshot is missing or unavailable, the cached `/storefront` API reads the public Listing and ShopSettings tables, paginating listings and returning only public listing fields. Deploy the backend and frontend together (`amplify.yml` already deploys the backend first). If both sources fail, pages and the sitemap fail instead of returning an apparently successful empty catalog. Public data is loaded at request time and cached for 30 seconds, so builds do not require access to the live catalog.

After deployment, submit `/sitemap.xml` in Google Search Console and inspect a product URL to verify Google's rendered page and selected canonical. Metadata and sitemap fixes do not guarantee indexing.

Product URLs use the title and a persistent six-digit public listing number, for example `/listing/copper-bottle-123456`. The backend assigns numbers when published listings are first loaded, using a DynamoDB transaction to reserve both the listing-to-number mapping and the unique number. Existing cart, favorite, order, and media references keep their internal UUIDs. Deploy the backend and frontend together to provision the listing-number registry. Legacy snapshots without numbers fall back to the public API; saving a listing or website settings republishes the snapshot with assigned numbers.
