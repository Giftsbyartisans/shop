# shop

Source code for the GiftsByArtisans website.

A minimal Next.js app with TypeScript, App Router, CSS Modules, and ESLint.

## Development

```sh
npm install
npm run dev
```

Open http://localhost:3000. Edit `src/app/page.tsx` to change the home page.

## Checks and production

```sh
npm run lint
npm run build
npm start
```

## Frontend reference implementation

The storefront is based on `../shop-portal`, retaining its GiftsByArtisans branding and shared CSS. Pages: `/`, `/collection`, `/listing/[id]`, `/contact`, `/wholesale`, `/policies`, and `/admin`.

This frontend uses bundled sample illustrations and products. Collection search, category filters, price sorting, and carousel navigation work locally. The admin demo edits, publishes, and deletes listings using browser localStorage; inquiry forms save locally and never send messages. No authentication, checkout, API routes, or backend integration is included. Existing Amplify files are untouched.

Demo data: `src/lib/catalog.ts` and `src/lib/content.ts`. Images: `public/demo/`. Clear browser storage or use “Restore demo listings” in `/admin` to reset the catalog. The admin workspace is a local demo with no access controls.
