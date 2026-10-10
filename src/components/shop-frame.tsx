"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Brand from "./brand";
import type { ShopContent } from "@/lib/content";
export function ShopHeader({ content }: { content: ShopContent }) {
  return (
    <>
      {content.announcement && (
        <div className="announcement">{content.announcement}</div>
      )}
      <header>
        <Brand content={content} />
        <nav>
          <Link href="/#categories">Categories</Link>
          <Link href="/collection">Collections</Link>
          <Link href="/#best-sellers">Best sellers</Link>
          <Link href="/contact">Contact</Link>
        </nav>
        <form action="/collection" className="shop-search" role="search">
          <input
            id="shop-search"
            type="search"
            name="q"
            placeholder="Search Products"
            maxLength={150}
          />
          <button type="submit">Search</button>
        </form>
      </header>
    </>
  );
}
export function SocialLinks({ content }: { content: ShopContent }) {
  return (
    <div className="links">
      {[
        ["Instagram", content.instagram],
        ["Etsy", content.etsy],
        ["Pinterest", content.pinterest],
      ].map(
        ([name, url]) =>
          url && (
            <Link
              key={name}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
            >
              {name}
            </Link>
          ),
      )}
    </div>
  );
}
export function ShopFooter({ content }: { content: ShopContent }) {
  return (
    <footer className="full-footer">
      <div className="footer-grid">
        <div>
          <Brand content={content} />
          <p>{content.footerText}</p>
          <SocialLinks content={content} />
        </div>
        <div>
          <h3>Explore</h3>
          <Link href="/#categories">Shop by category</Link>
          <Link href="/#best-sellers">Best sellers</Link>
          <Link href="/wholesale">Wholesale inquiry</Link>
        </div>
        <div>
          <h3>Customer care</h3>
          <Link href="/contact">Contact us</Link>
          <Link href="/policies">Shop policies</Link>
          {content.policies.map((p) => (
            <Link href={"/policies#policy-" + p.id} key={p.id}>
              {p.title}
            </Link>
          ))}
        </div>
        <div>
          <h3>Get in touch</h3>
          {content.contactEmail && (
            <Link href={"mailto:" + content.contactEmail}>
              {content.contactEmail}
            </Link>
          )}
          {content.phone && <p>{content.phone}</p>}
          {content.address && <p className="pre-wrap">{content.address}</p>}
          {!content.contactEmail && !content.phone && !content.address && (
            <Link href="/contact">Send us a message</Link>
          )}
        </div>
      </div>
      <div className="footer-bottom">
        <span>© {<CopyrightYear />} GiftsByArtisans</span>
      </div>
    </footer>
  );
}

export function FindUsIcons({ content }: { content: ShopContent }) {
  return (
    <div className="find-social-icons">
      {content.etsy && (
        <Link
          className="find-etsy"
          href={content.etsy}
          aria-label="Find GiftsByArtisans on Etsy"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 50 24"
            width="64"
            height="32"
            fill="currentColor"
            aria-hidden="true"
            focusable="false"
          >
            <path d="M42.973 23.998C45.006 23.998 46.673 23.321 47.768 22.045 48.89 20.716 49.254 19.386 49.254 16.675V7.739C49.254 7.008 49.254 6.2 49.306 5.627 49.332 5.13 48.889 5.027 48.497 5.184 47.377 5.627 46.412 5.861 45.11 6.148 44.797 6.226 44.667 6.435 44.667 6.67S44.826 7.166 45.32 7.14C46.492 7.088 46.804 7.323 46.804 8.18V13.941C46.621 15.504 45.32 16.833 43.678 16.833 42.192 16.833 41.332 15.843 41.332 13.81V7.738C41.332 7.008 41.358 6.2 41.384 5.627 41.41 5.13 40.994 5.027 40.575 5.184 39.48 5.601 38.568 5.861 37.343 6.148 37.004 6.226 36.873 6.435 36.873 6.67S37.03 7.166 37.525 7.14C38.592 7.088 38.879 7.323 38.879 8.18V14.254C38.879 17.094 40.52 18.37 42.969 18.37 44.482 18.37 46.072 17.51 46.802 15.92V18.033C46.801 19.699 46.462 20.768 45.785 21.576 45.082 22.411 44.17 22.88 42.997 22.88 41.615 22.879 40.86 22.383 40.86 21.654 40.86 21.42 40.938 21.158 40.938 20.794 40.938 20.117 40.468 19.517 39.739 19.517 38.827 19.517 38.385 20.22 38.385 21.03 38.385 22.437 39.922 24 42.97 24M31.3 18.474C34.296 18.474 36.146 16.65 36.146 14.435 36.146 10.032 29.293 11.151 29.293 8.311 29.293 7.216 30.075 6.304 31.508 6.304 32.836 6.304 33.853 6.904 34.399 8.154L34.66 8.754C34.921 9.352 35.65 9.223 35.572 8.623L35.312 6.487C35.26 6.122 35.156 5.965 34.842 5.836 33.852 5.393 32.782 5.184 31.637 5.184 28.823 5.184 27.18 6.931 27.18 9.094 27.18 13.576 34.033 12.404 34.033 15.218 34.033 16.337 33.121 17.328 31.375 17.328 29.863 17.329 28.95 16.704 28.274 15.295L27.884 14.487C27.647 13.99 26.918 14.122 27.023 14.774L27.387 17.119C27.439 17.46 27.57 17.563 27.858 17.694 28.977 18.215 29.89 18.475 31.296 18.475M22.464 18.5C24.262 18.5 25.487 17.562 25.955 15.92 26.14 15.348 25.54 15.009 25.175 15.583 24.679 16.442 23.95 16.807 23.115 16.807 22.048 16.807 21.5 16.024 21.5 14.592V6.696L24.94 6.722C25.33 6.722 25.487 6.357 25.487 6.045 25.487 5.706 25.304 5.419 24.887 5.419L21.5 5.445V3.464C21.5 3.125 21.291 2.968 21.03 2.968A.6.6 0 0 0 20.535 3.228C19.597 4.664 18.97 5.158 17.512 5.705 17.199 5.834 17.016 6.017 17.016 6.252 17.016 6.512 17.146 6.694 17.538 6.694H19.049V14.877C19.049 17.25 20.431 18.5 22.462 18.5M11.806 17.014H7.27C5.863 17.014 5.499 16.65 5.499 15.424V9.692H9.147C10.501 9.691 10.919 10.056 11.387 11.384L11.753 12.454C11.962 13.079 12.794 13.104 12.794 12.376 12.69 10.29 12.69 7.84 12.742 5.756 12.794 5.027 11.959 5.053 11.752 5.678L11.388 6.748C10.918 8.102 10.553 8.52 9.147 8.52H5.499V1.745C5.499 1.38 5.654 1.223 6.046 1.223H11.493C13.083 1.223 13.759 1.665 14.255 3.047L14.855 4.742C15.089 5.419 15.896 5.316 15.896 4.664L15.844.468C15.845.13 15.637 0 15.35 0H.599C.13 0 0 .26 0 .522 0 .782.13 1.017.573 1.069 2.398 1.2 2.71 1.565 2.71 2.633V15.715C2.71 16.705 2.398 17.043.677 17.175.261 17.226.13 17.46.13 17.722S.26 18.244.703 18.244H15.61C15.896 18.244 16.105 18.114 16.105 17.776L16.157 13.58C16.157 12.928 15.35 12.85 15.141 13.502L14.594 15.196C14.15 16.604 13.394 17.021 11.806 17.021" />
          </svg>
        </Link>
      )}
      {content.instagram && (
        <Link
          href={content.instagram}
          aria-label="Find GiftsByArtisans on Instagram"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
          >
            <rect x="3" y="3" width="18" height="18" rx="5" />
            <circle cx="12" cy="12" r="4" />
            <circle
              cx="17.5"
              cy="6.5"
              r=".8"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </Link>
      )}
      {content.pinterest && (
        <Link
          className="find-pinterest"
          href={content.pinterest}
          aria-label="Find GiftsByArtisans on Pinterest"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            viewBox="0 0 24 24"
            width="36"
            height="36"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M12 0a12 12 0 0 0-4.37 23.17c-.06-1.03-.01-2.27.26-3.45l1.54-6.52s-.38-.77-.38-1.91c0-1.79 1.04-3.12 2.34-3.12 1.1 0 1.63.83 1.63 1.83 0 1.11-.7 2.76-1.07 4.3-.3 1.29.65 2.34 1.92 2.34 2.31 0 4.08-2.44 4.08-5.96 0-3.12-2.24-5.3-5.44-5.3-3.71 0-5.89 2.78-5.89 5.65 0 1.12.43 2.32.97 2.97.1.13.12.24.09.37l-.36 1.48c-.06.24-.19.29-.44.18-1.63-.76-2.65-3.15-2.65-5.07 0-4.13 3-7.93 8.64-7.93 4.53 0 8.05 3.23 8.05 7.55 0 4.51-2.85 8.14-6.8 8.14-1.33 0-2.58-.69-3.01-1.5l-.82 3.11c-.3 1.14-1.12 2.57-1.67 3.44A12 12 0 1 0 12 0Z" />
          </svg>
        </Link>
      )}
    </div>
  );
}

function CopyrightYear() {
  const [year, setYear] = useState(2026);
  useEffect(() => {
    Promise.resolve().then(() => setYear(new Date().getFullYear()));
  }, []);
  return <>{year}</>;
}
