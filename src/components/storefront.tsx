"use client";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { ShopHeader, ShopFooter } from "./shop-frame";
import { defaultContent, type ShopContent } from "@/lib/content";
import ListingGallery from "./listing-gallery";
import ShopImage, { imageUrl } from "./shop-image";
import { SocialLinks } from "./shop-frame";
import { formatPrice, listingPrice, type Listing } from "@/lib/catalog";
import { listListings, submitInquiry, loadShopContent } from "@/lib/backend";

function Card({ item, content }: { item: Listing; content: ShopContent }) {
  return (
    <article className="listing-card">
      <Link className="listing-media demo-media" href={"/listing/" + item.id}>
        <ShopImage src={item.image} alt={item.title} loading="lazy" />
      </Link>
      <h3 className="listing-name">
        <Link href={"/listing/" + item.id}>{item.title}</Link>
      </h3>
      <div className="listing-prices">
        <strong>
          {formatPrice(
            listingPrice(item, content.saleEnabled, content.salePercent),
          )}
        </strong>
        {content.saleEnabled && <del>{formatPrice(item.price)}</del>}
      </div>
      <span className="muted">{item.category}</span>
      <div className="listing-platforms">
        <Link href={"/listing/" + item.id}>Discover this gift →</Link>
      </div>
    </article>
  );
}
function Carousel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  return (
    <div className="demo-carousel" role="region" aria-label={label}>
      <div className="demo-track" ref={track}>
        {children}
      </div>
      <div className="demo-controls">
        <button
          aria-label={"Previous " + label}
          onClick={() =>
            track.current?.scrollBy({
              left: -track.current.clientWidth,
              behavior: "smooth",
            })
          }
        >
          ←
        </button>
        <button
          aria-label={"Next " + label}
          onClick={() =>
            track.current?.scrollBy({
              left: track.current.clientWidth,
              behavior: "smooth",
            })
          }
        >
          →
        </button>
      </div>
    </div>
  );
}
export default function Storefront({
  page = "home",
  id,
}: {
  page?:
    "home" | "collection" | "contact" | "wholesale" | "policies" | "listing";
  id?: string;
}) {
  const [content, setContent] = useState(defaultContent);
  const [items, setItems] = useState<Listing[]>([]),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("featured"),
    [ready, setReady] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    void loadShopContent()
      .then((settings) => {
        if (active) setContent(settings);
      })
      .catch((e) => {
        if (active) setError(e.message);
      });
    void listListings()
      .then((list) => {
        if (active) setItems(list);
      })
      .catch((e) => {
        if (active) setError(e.message);
      })
      .finally(() => {
        if (active) setReady(true);
      });
    Promise.resolve().then(() => {
      const params = new URLSearchParams(window.location.search);
      setQuery(params.get("q") || "");
      setCategory(params.get("category") || "");
    });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    let active = true;
    let icon: HTMLLinkElement | null = null;
    const apply = () =>
      imageUrl(content.favicon)
        .then((url) => {
          if (!active || !url) return;
          if (!icon) {
            icon = document.createElement("link");
            icon.rel = "icon";
            document.head.appendChild(icon);
          }
          icon.href = url;
        })
        .catch(() => {});
    if (content.favicon) void apply();
    const timer = setInterval(apply, 50 * 60 * 1000);
    return () => {
      active = false;
      clearInterval(timer);
      icon?.remove();
    };
  }, [content.favicon]);
  const visible = items.filter((i) => i.published);
  const filtered = visible
    .filter(
      (i) =>
        (!category || i.category === category) &&
        `${i.title} ${i.description}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
    )
    .sort((a, b) =>
      sort === "low"
        ? a.price - b.price
        : sort === "high"
          ? b.price - a.price
          : 0,
    );
  const item = visible.find((i) => i.id === id);
  return (
    <>
      <ShopHeader content={content} />
      {page === "home" ? (
        <main className="shop">
          <StoreBanner content={content} />
          <section id="categories" className="collection">
            <p className="eyebrow">SOMETHING FOR EVERY OCCASION</p>
            <h2>Shop by category</h2>
            <Carousel label="categories">
              {content.categories.map((c) => (
                <Link
                  className="category-card"
                  href={"/collection?category=" + encodeURIComponent(c.name)}
                  key={c.id}
                >
                  <ShopImage src={c.image} alt={c.name} />
                  <h3>{c.name}</h3>
                </Link>
              ))}
            </Carousel>
          </section>
          <section id="best-sellers" className="collection">
            <div className="section-top">
              <div>
                <p className="eyebrow">THOUGHTFUL FAVORITES</p>
                <h2>Best sellers</h2>
              </div>
              <Link href="/collection">View collections →</Link>
            </div>
            <Carousel label="products">
              {visible
                .filter((i) => content.bestSellerIds.includes(i.id))
                .map((i) => (
                  <Card content={content} item={i} key={i.id} />
                ))}
            </Carousel>
          </section>
          <section className="testimonials collection">
            <p className="eyebrow">A LITTLE KINDNESS GOES A LONG WAY</p>
            <h2>Thoughtful gifts. Beautiful moments.</h2>
            <p className="muted">
              Personal touches, handcrafted details, and something for every
              occasion.
            </p>
            {content.reviews.length ? (
              <div className="review-grid">
                {content.reviews.map((review) => (
                  <figure key={review.id}>
                    <div
                      className="stars"
                      aria-label={`${review.rating} out of 5 stars`}
                    >
                      {"★".repeat(review.rating)}
                    </div>
                    <blockquote>{review.text}</blockquote>
                    <figcaption>{review.name}</figcaption>
                  </figure>
                ))}
              </div>
            ) : (
              <div className="demo-values">
                <div>
                  <span>♡</span>
                  <h3>Made personal</h3>
                  <p>Small details that mean the world.</p>
                </div>
                <div>
                  <span>✧</span>
                  <h3>Inspired by artisans</h3>
                  <p>Discover the beauty in thoughtful craft.</p>
                </div>
                <div>
                  <span>◇</span>
                  <h3>For every moment</h3>
                  <p>Celebrate the everyday and the extraordinary.</p>
                </div>
              </div>
            )}
          </section>
          <section className="find-us collection">
            <p className="eyebrow">LET’S STAY CONNECTED</p>
            <h2>Find us</h2>
            <p>
              Explore more gifts, inspiration, and updates from GiftsByArtisans.
            </p>
            <SocialLinks content={content} />
            <Link className="banner-button primary" href="/contact">
              Get in touch
            </Link>
          </section>
        </main>
      ) : page === "collection" ? (
        <main className="shop">
          <section className="collection">
            <p className="eyebrow">CURATED WITH CARE</p>
            <h1 className="catalog-heading">Collections</h1>
            <div className="catalog-filters">
              <label>
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search titles or descriptions…"
                />
              </label>
              <label>
                Category
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                >
                  <option value="">All categories</option>
                  {content.categories.map((c) => (
                    <option key={c.id}>{c.name}</option>
                  ))}
                </select>
              </label>
              <label>
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
            </div>
            <p className="muted" role="status">
              {filtered.length} gifts{query && ` matching “${query}”`}
            </p>
            {filtered.length ? (
              <div className="product-grid">
                {filtered.map((i) => (
                  <Card content={content} key={i.id} item={i} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h2>No gifts found</h2>
                <p>Try another search or explore all categories.</p>
                <button
                  onClick={() => {
                    setCategory("");
                    setQuery("");
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
          </section>
        </main>
      ) : page === "listing" ? (
        <main className="shop listing-detail">
          <Link href="/collection">← Collections</Link>
          {!ready ? (
            <p role="status">Loading gift…</p>
          ) : item ? (
            <div className="listing-detail-grid">
              <ListingGallery item={item} />
              <section className="listing-detail-info">
                <p className="eyebrow">{item.category}</p>
                <h1>{item.title}</h1>
                <div className="listing-prices">
                  <strong>
                    {formatPrice(
                      listingPrice(
                        item,
                        content.saleEnabled,
                        content.salePercent,
                      ),
                    )}
                  </strong>
                  {content.saleEnabled && <del>{formatPrice(item.price)}</del>}
                </div>
                <p className="muted">Curated by GiftsByArtisans</p>
                <h2>About this gift</h2>
                <p className="description">{item.description}</p>
                <p className="description">
                  Contact us for availability and ordering details.
                </p>
                {(item.etsyUrl || item.pinterestUrl) && (
                  <div className="listing-detail-buy">
                    {item.etsyUrl && (
                      <a
                        href={item.etsyUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        Shop on Etsy ↗
                      </a>
                    )}
                    {item.pinterestUrl && (
                      <a
                        href={item.pinterestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Pinterest ↗
                      </a>
                    )}
                  </div>
                )}
                <Link className="primary banner-button" href="/contact">
                  Ask about a gift
                </Link>
              </section>
            </div>
          ) : (
            <div className="empty">
              <h1 className="catalog-heading">Gift not found</h1>
              <Link href="/collection">Explore the collection →</Link>
            </div>
          )}
        </main>
      ) : (
        <main className="info-page">
          <p className="eyebrow">GIFTSBYARTISANS</p>
          <h1>
            {page === "contact"
              ? "Contact us"
              : page === "wholesale"
                ? "Wholesale inquiry"
                : "Shop policies"}
          </h1>
          {page === "policies" ? (
            content.policies.map((p) => (
              <details className="policy" id={"policy-" + p.id} key={p.id}>
                <summary>{p.title}</summary>
                <p>{p.text}</p>
              </details>
            ))
          ) : (
            <>
              <p>
                {page === "contact"
                  ? content.contactText
                  : content.wholesaleText}
              </p>
              <InquiryForm kind={page} />
            </>
          )}
        </main>
      )}
      <ShopFooter content={content} />
    </>
  );
}
function InquiryForm({ kind }: { kind: "contact" | "wholesale" }) {
  const [status, setStatus] = useState(""),
    [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    setBusy(true);
    setStatus("");
    try {
      await submitInquiry({
        kind,
        name: String(values.get("name")),
        email: String(values.get("email")),
        message: String(values.get("message")),
        business: values.get("business")
          ? String(values.get("business"))
          : undefined,
        quantity: values.get("quantity")
          ? Number(values.get("quantity"))
          : undefined,
      });
      setStatus("Your inquiry has been sent. Thank you!");
      form.reset();
    } catch (e) {
      setStatus(
        e instanceof Error
          ? e.message
          : "Could not send your inquiry. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="inquiry-form" onSubmit={submit}>
      <label>
        Your name
        <input name="name" autoComplete="name" maxLength={150} required />
      </label>
      <label>
        Email
        <input name="email" type="email" autoComplete="email" required />
      </label>
      {kind === "wholesale" && (
        <>
          <label>
            Business or organization
            <input name="business" autoComplete="organization" />
          </label>
          <label>
            Approximate quantity
            <input name="quantity" type="number" min="1" step="1" />
          </label>
        </>
      )}
      <label>
        Message
        <textarea name="message" rows={6} maxLength={5000} required />
      </label>
      <p role="status">{status}</p>
      <button className="primary" disabled={busy}>
        {busy ? "Sending…" : "Send inquiry"}
      </button>
    </form>
  );
}

function StoreBanner({ content }: { content: ShopContent }) {
  const [index, setIndex] = useState(0);
  const uploaded = content.banners.filter((b) => b.image.trim());
  const banners = uploaded.length
    ? uploaded
    : [
        {
          id: "default",
          image: "/demo/gift-3.svg",
          alt: "A gift wrapped with a ribbon",
        },
      ];
  const hasText = Boolean(
    content.bannerTitle.trim() || content.bannerText.trim(),
  );
  const multiple = banners.length > 1;
  const active = index % banners.length;
  const selected = banners[active];
  return (
    <section
      className={`intro banner demo-hero${hasText ? "" : " demo-hero-image-only"}`}
      role={multiple ? "region" : undefined}
      aria-roledescription={multiple ? "carousel" : undefined}
      aria-label={multiple ? "Shop highlights" : undefined}
    >
      <div
        className="hero-slide"
        role={multiple ? "group" : undefined}
        aria-roledescription={multiple ? "slide" : undefined}
        aria-label={multiple ? `${active + 1} of ${banners.length}` : undefined}
      >
        {hasText && (
          <div className="hero-copy">
            <p className="eyebrow">THE ART OF GIVING</p>
            {content.bannerTitle.trim() && <h1>{content.bannerTitle}</h1>}
            {content.bannerText.trim() && <p>{content.bannerText}</p>}
            <Link className="primary banner-button" href="/collection">
              Explore the collection →
            </Link>
          </div>
        )}
        <div className="store-banner">
          <ShopImage
            key={selected.image}
            src={selected.image}
            alt={selected.alt}
            optimized
            loading="eager"
            fetchPriority="high"
            sizes={
              hasText
                ? "(max-width: 600px) 90vw, (max-width: 1440px) 44vw, 640px"
                : "(max-width: 1440px) 88vw, 1280px"
            }
          />
        </div>
      </div>
      {multiple && (
        <div className="banner-controls hero-carousel-controls">
          <button
            aria-label="Previous banner"
            onClick={() =>
              setIndex((active + banners.length - 1) % banners.length)
            }
          >
            ←
          </button>
          {banners.map((banner, i) => (
            <button
              key={banner.id}
              aria-label={`Show banner ${i + 1}`}
              aria-pressed={active === i}
              onClick={() => setIndex(i)}
            >
              {i + 1}
            </button>
          ))}
          <button
            aria-label="Next banner"
            onClick={() => setIndex((active + 1) % banners.length)}
          >
            →
          </button>
          <span className="sr-only" aria-live="polite">
            Banner {active + 1} of {banners.length}
          </span>
        </div>
      )}
    </section>
  );
}
