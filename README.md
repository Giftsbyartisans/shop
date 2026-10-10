# GiftsByArtisans

Next.js storefront and admin portal backed by Amplify Gen 2 (Cognito and DynamoDB/AppSync).

## Setup

```sh
npm install
npm run sandbox
```

The sandbox uses the configured `shop-dev` AWS profile. Deploying regenerates `amplify_outputs.json`, which must be present before building the frontend. Existing outputs from the Todo starter do not support the new models.

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

“Export JSON” downloads the catalog. “Import Etsy CSV / JSON” accepts Etsy-style TITLE, DESCRIPTION, PRICE, IMAGE1 columns or this app’s exported JSON, with only the first 10 listings imported per file (8 MB maximum). Matching IDs update existing listings. CSV imports default to drafts unless an explicit `published` column is true; exported JSON preserves its published status. Review imported gifts before publishing. Category defaults to Uncategorized when absent. This importer does not synchronize with an Etsy account.

“Delete all listings” asks for confirmation before removing the catalog. Export a backup first if you need to restore it. Operations across multiple records are sequential and can partially complete if a backend request fails.

Listing editors provide Save draft, Publish listing, and Unpublish listing actions instead of a published checkbox. Optional Etsy and Pinterest URLs appear as buttons on the public listing page only when provided. Deploy the updated data schema (`etsyUrl` and `pinterestUrl`) with `npm run sandbox` before saving these fields.

## Full-page listing editor

The editor uses a two-column form with regular and optional sale prices, Etsy/Pinterest URLs, category, photo/video tiles, a description, and best-seller selection. Up to 10 photos (PNG/JPEG/WebP, 8 MB each) and 2 videos (MP4/WebM, 50 MB each) are supported. The first photo is the thumbnail; use Make primary to reorder it. Removing a tile changes the listing without deleting the uploaded object from S3.

Sale prices apply only while the store sale is enabled and override its percentage discount. Customer listing pages display the photo gallery and videos. Publish remains a button. Successful saves close the editor tab. Deploy the added `salePrice`, `images`, and `videos` fields with `npm run sandbox` before using these features with AWS.

### Storefront image delivery

The Amplify backend defines a CloudFront distribution with S3 Origin Access Control. A viewer-request function permits only `/media/` paths; personal `/uploads/` files continue using authenticated S3 access. The generated `custom.mediaCdnUrl` output enables stable CDN URLs without browser-side signing. Deploy the backend through the existing Amplify deployment pipeline (or `npm run sandbox` for development), regenerate `amplify_outputs.json`, then rebuild the frontend. Until that output exists, images continue using signed S3 URLs.

Admin image uploads prepare 320, 640, 960, and 1600 pixel WebP variants in the browser, retain the original, and upload at most two files concurrently. Listings receive an image reference only once all uploads finish; failed uploads attempt to remove completed files. UUID paths carry a one-year immutable cache policy. Product images use responsive `srcset`; the hero and detail photo load eagerly. Existing media uses the CDN after deployment but needs re-uploading to gain variants. Deleting a listing removes its referenced S3 photos, complete UUID image folders (including originals and variants), and videos before deleting the public and draft records. Media referenced by other listings or website settings is preserved. Storage failures keep the listing records available for retry; some files may already be removed. Replacing photos or removing them from the editor does not clean up previously detached uploads. Concurrent admin edits during deletion are not locked, so avoid attaching the same media to another listing while deleting it. Public CDN copies can remain cached for a year; immediate withdrawal requires CloudFront invalidation and S3 deletion.


All app image upload fields use the same CloudFront pipeline: listing photos, banner slides, category images, brand logos, favicons, and admin previews. Logos and preview images declare their display size for responsive selection; favicons use the 320px CDN variant. Manually entered external image URLs remain on their original host. Optionally set `NEXT_PUBLIC_MEDIA_CDN_URL=https://your-distribution.cloudfront.net` at frontend build time to use an existing distribution instead of the generated `custom.mediaCdnUrl`. That distribution must use this shop's bucket and permit `/media/` paths. Rebuild after changing this setting. No CDN address is currently present in the local generated outputs; backend deployment and refreshed outputs are required to activate the default CDN path.

### Production Cognito recovery (October 10, 2026)

The `main` backend stack `amplify-d3r1sr91624ks6-main-branch-b045bbc189` still tracks the deleted Cognito user pool `us-east-1_kN18CFDrm`. Updating the Admins group fails because that pool no longer exists. `amplify/auth/recover-production-pool.ts` assigns new permanent logical IDs to the user pool and app client only in this affected root stack. The next deployment creates them and updates generated references, including the Admins group, identity pool providers, and AppSync auth. Other stacks retain their existing logical IDs. Keep the recovery code after deployment to avoid another auth replacement.

Redeploy `main` through Amplify Hosting after pushing this repair. The stack was observed in `UPDATE_ROLLBACK_COMPLETE`, so it can accept another update. Recreate your administrator in the new Cognito user pool and add them to `Admins`; users and passwords from a deleted pool cannot be recovered by this code. Hosting must build using the newly generated `amplify_outputs.json`. This repair does not reset the database or S3 bucket. Local AWS credentials can inspect CloudFormation but cannot describe Cognito or perform drift detection; successful live recovery must be verified in the Hosting deployment logs.
