"use client";
import { listingPath } from "@/lib/listing-url";
import { backendFaviconUrl } from "@/lib/backend-api";
import Link from "next/link";
import ShopSkeleton from "./shop-skeleton";
import { useRouter } from "next/navigation";
import { Children, useEffect, useState, useRef } from "react";
import { ShopHeader, ShopFooter } from "./shop-frame";
import { defaultContent, type ShopContent } from "@/lib/content";
import ListingGallery from "./listing-gallery";
import ShippingPolicy from "./shipping-policy";
import ProductBenefits from "./product-benefits";
import PaymentTrust from "./payment-trust";
import HomepageBenefits from "./homepage-benefits";
import TestimonialCarousel from "./testimonial-carousel";
import { policyBody } from "@/lib/policy-text";
import { ProductShopping } from "./shopping-controls";
import ShoppingPage from "./shopping-page";
import Checkout from "./checkout";
import OrderFinder from "./order-finder";
import { resolvePersonalization } from "@/lib/personalization";
import ShopImage from "./shop-image";
import { formatPrice, listingPrice, type Listing } from "@/lib/catalog";
import { listListings, submitInquiry, loadShopContent } from "@/lib/backend";

function ListingPrices({ item, content, detail = false }: { item: Listing; content: ShopContent; detail?: boolean }) {
  const price = listingPrice(item, content.saleEnabled, content.salePercent);
  const discounted = price < item.price;
  const percentOff = discounted && item.price > 0 ? Math.round((1 - price / item.price) * 100) : 0;
  return (
    <>
      <div className="listing-prices">
        <strong className={discounted ? "discount-price" : undefined}>{detail && discounted && <span className="listing-price-now">Now </span>}{formatPrice(price)}</strong>
        {discounted && <span className="listing-was"><del>{formatPrice(item.price)}</del> <span className="listing-percent-off">{percentOff}% off</span></span>}
      </div>
      <Link className="free-delivery" href="/policies/delivery">Free delivery</Link>
    </>
  );
}

function Card({ item, content, showcase = false, eager = false }: { item: Listing; content: ShopContent; showcase?: boolean; eager?: boolean }) {
  const photos = Array.from(new Set([item.image, ...(item.images ?? [])].filter(Boolean)));
  const [selected, setSelected] = useState<string | null>(null);
  const photo = selected && photos.includes(selected) ? selected : photos[0];
  return (
    <article className={`listing-card${showcase ? " homepage-listing" : ""}`}>
      <Link className="listing-media demo-media" href={listingPath(item)}>
        <ShopImage src={photo} alt={item.title} loading={eager ? "eager" : "lazy"}
          sizes={showcase ? "(max-width: 600px) 75vw, (max-width: 850px) 46vw, (max-width: 1100px) 30vw, 19vw" : "(max-width: 900px) 44vw, (max-width: 1440px) 22vw, 320px"} />
        {Boolean(item.videos?.length) && <span className="product-card-video-tag">
          Video
        </span>}
      </Link>
      {photos.length > 1 && (
        <div className="homepage-thumbnails" role="group" aria-label={`Photos of ${item.title}`}>
          {photos.map((image, index) => (
            <button key={image} type="button" aria-label={`Show photo ${index + 1} of ${item.title}`}
              aria-pressed={photo === image} onClick={() => setSelected(image)}>
              <ShopImage src={image} alt="" sizes="52px" />
            </button>
          ))}
        </div>
      )}
      <h3 className="listing-name"><Link href={listingPath(item)}>{item.title}</Link></h3>
      <div className="card-price-row">
        <div><ListingPrices item={item} content={content} /></div>
      </div>
      <ProductShopping id={item.id} compact />
    </article>
  );
}

function CollectionProductRow({ children, label }: { children: React.ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  function move(direction: number) {
    const element = track.current;
    const card = element?.firstElementChild as HTMLElement | null;
    if (!element || !card) return;
    element.scrollBy({ left: direction * (card.getBoundingClientRect().width + 16), behavior: "smooth" });
  }
  return <div className="collection-product-carousel" role="region" aria-label={label}>
    <div className="product-grid collection-product-grid" ref={track}>{children}</div>
    {Children.count(children) > 1 && <>
      <button type="button" className="collection-mobile-arrow previous" aria-label={`Previous ${label}`} onClick={() => move(-1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
      </button>
      <button type="button" className="collection-mobile-arrow next" aria-label={`Next ${label}`} onClick={() => move(1)}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
      </button>
    </>}
  </div>;
}

function Carousel({
  children,
  label,
}: {
  children: React.ReactNode;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const scrollCards = (direction: number) => {
    const element = track.current;
    if (!element) return;
    const cards = Array.from(element.children) as HTMLElement[];
    if (cards.length < 2) return;
    const maxScroll = element.scrollWidth - element.clientWidth;
    if (maxScroll <= 2) return;
    const current = element.scrollLeft;
    const viewportLeft = element.getBoundingClientRect().left;
    const positions = cards.map(card => Math.min(maxScroll,
      card.getBoundingClientRect().left - viewportLeft + current));
    const target = direction > 0
      ? positions.find(position => position > current + 2) ?? 0
      : [...positions].reverse().find(position => position < current - 2) ?? maxScroll;
    element.scrollTo({ left: target, behavior: "smooth" });
  };
  const carouselEnabled = Children.count(children) > 5;
  return (
    <div className="demo-carousel" role="region" aria-label={label}>
      <div className={`demo-track${carouselEnabled ? "" : " static-product-grid"}`} ref={track}>
        {children}
      </div>
      {carouselEnabled && <div className="demo-controls">
        <button
          className="homepage-carousel-arrow previous"
          type="button"
          aria-label={"Previous " + label}
          onClick={() => scrollCards(-1)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
        </button>
        <button
          className="homepage-carousel-arrow next"
          type="button"
          aria-label={"Next " + label}
          onClick={() => scrollCards(1)}
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
        </button>
      </div>}
    </div>
  );
}
export default function Storefront({
  page = "home",
  id,
  initialContent,
  initialListings,
  categoryOnly,
  bestSellersOnly = false,
}: {
  page?:
    "home" | "collection" | "contact" | "wholesale" | "policies" | "listing" | "cart" | "favorites" | "checkout-address" | "checkout-payment" | "order-finder";
  id?: string;
  initialContent?: ShopContent;
  initialListings?: Listing[];
  categoryOnly?: string;
  bestSellersOnly?: boolean;
}) {
  const router = useRouter();
  const [pagination, setPagination] = useState({ key: "", page: 1 });
  const [content, setContent] = useState(initialContent ?? defaultContent);
  const [settingsStatus, setSettingsStatus] = useState<"loading" | "ready" | "failed">(initialContent ? "ready" : "loading");
  const [items, setItems] = useState<Listing[]>(initialListings ?? []),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [sort, setSort] = useState("featured"),
    [ready, setReady] = useState(Boolean(initialListings)),
    [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    if (!initialContent) void loadShopContent()
      .then((settings) => {
        if (active) {
          setContent(settings);
          setSettingsStatus("ready");
        }
      })
      .catch((e) => {
        if (active) {
          setError(e.message);
          if (!initialContent) setSettingsStatus("failed");
        }
      });
    if (!initialListings) void listListings()
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
  }, [initialContent, initialListings]);
  useEffect(() => {
    const icons = document.head.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
    const url = content.favicon.startsWith("s3:media/")
      ? backendFaviconUrl(content.favicon)
      : backendFaviconUrl();
    for (const icon of icons) {
      icon.href = url;
      icon.sizes.value = "48x48";
      // The endpoint returns PNG or redirects to the bundled ICO fallback.
      icon.removeAttribute("type");
    }
  }, [content.favicon]);
  const visible = items.filter((i) => i.published && (!bestSellersOnly || content.bestSellerIds.includes(i.id)));
  const filtered = visible
    .filter(
      (i) =>
        (!(categoryOnly || category) || i.category === (categoryOnly || category)) &&
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
  const paginationKey = JSON.stringify([categoryOnly, bestSellersOnly, category, query, sort]);
  const pageSize = categoryOnly ? 15 : 16;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(pagination.key === paginationKey ? pagination.page : 1, pageCount);
  const pageProducts = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);
  function changeProductPage(next: number) {
    setPagination({ key: paginationKey, page: next });
    document.querySelector(".catalog-heading")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  const categoryGroups = new Map<string, Listing[]>();
  for (const listing of filtered) {
    const group = categoryGroups.get(listing.category) ?? [];
    group.push(listing);
    categoryGroups.set(listing.category, group);
  }
  const categoryOrder = new Map(content.categories.map((category, index) => [category.name, index]));
  const orderedCategoryGroups = Array.from(categoryGroups).sort(([a], [b]) =>
    (categoryOrder.get(a) ?? Number.MAX_SAFE_INTEGER) - (categoryOrder.get(b) ?? Number.MAX_SAFE_INTEGER));
  const item = visible.find((i) => i.id === id);
  return (
    <div className="storefront-frame">
      <ShopHeader content={content} />
      {page === "order-finder" ? <OrderFinder /> : page === "checkout-address" || page === "checkout-payment" ? <Checkout step={page === "checkout-address" ? "address" : "payment"} listings={visible} content={content} ready={ready && !error && settingsStatus === "ready"} /> : page === "cart" || page === "favorites" ? <ShoppingPage kind={page} listings={visible} content={content} ready={ready && !error && settingsStatus === "ready"} loadError={error} /> : page === "home" ? (
        <main className="shop shop-home">
          {settingsStatus === "ready" ? (
            <StoreBanner content={content} />
          ) : (
            <div className={`store-hero-placeholder${settingsStatus === "loading" ? " shimmer" : ""}`} role="status" aria-busy={settingsStatus === "loading"}>
              {settingsStatus === "loading" ? <span className="sr-only">Loading banner</span> : <p>Unable to load the banner. Please refresh the page.</p>}
            </div>
          )}
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
                  <ShopImage src={c.image} alt={c.name} sizes="(max-width: 600px) 75vw, (max-width: 850px) 46vw, (max-width: 1100px) 30vw, 19vw" />
                  <h3>{c.name}</h3>
                </Link>
              ))}
            </Carousel>
          </section>
          <HomepageBenefits />
          <section id="best-sellers" className="collection">
            <div className="section-top">
              <div>
                <p className="eyebrow">THOUGHTFUL FAVORITES</p>
                <h2>Best sellers</h2>
              </div>
              <Link href="/best-sellers">View all best sellers →</Link>
            </div>
            <Carousel label="products">
              {visible
                .filter((i) => content.bestSellerIds.includes(i.id))
                .map((i) => (
                  <Card content={content} item={i} key={i.id} showcase />
                ))}
            </Carousel>
          </section>
          <div className="homepage-payment-trust"><PaymentTrust etsyUrl={content.etsy} pinterestUrl={content.pinterest} /></div>
          <section className="testimonials collection">
            <p className="eyebrow">A LITTLE KINDNESS GOES A LONG WAY</p>
            <h2>Thoughtful products. Beautiful moments.</h2>
            <p className="muted">
              Personal touches, handcrafted details, and something for every
              occasion.
            </p>
            {content.reviews.length ? (
              <TestimonialCarousel reviews={content.reviews} intervalSeconds={content.testimonialIntervalSeconds} />
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
        </main>
      ) : page === "collection" ? (
        <main className={`shop${categoryOnly || bestSellersOnly ? ` collection-full-page${categoryOnly ? " collection-category-page" : ""}` : ""}`}>
          <section className="collection">
            <div className="collection-eyebrow-row">
              <p className="eyebrow">CURATED WITH CARE</p>
              <p className="collection-product-count" role="status">
                {categoryOnly || category ? filtered.length : query ? `${filtered.length} of ${visible.length}` : visible.length} {(categoryOnly || category ? filtered.length : visible.length) === 1 ? "product" : "products"}
              </p>
            </div>
            <div className="collection-heading-row">
            <h1 className="catalog-heading">{bestSellersOnly ? "Best sellers" : categoryOnly || "Collections"}</h1>
            <div className="collection-toolbar">
              <div className="catalog-filters collection-toolbar-filters">
              {!categoryOnly && (
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
              )}
              <label>
                Sort by
                <select value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="featured">Featured</option>
                  <option value="low">Price: low to high</option>
                  <option value="high">Price: high to low</option>
                </select>
              </label>
              </div>

            </div>
            </div>
            {!ready ? <ShopSkeleton /> : filtered.length ? bestSellersOnly ? (
              <CollectionProductRow label="best sellers">
                {pageProducts.map((listing, index) => <Card key={listing.id} item={listing} content={content} eager={index < 3} />)}
              </CollectionProductRow>
            ) : (
              <div className="collection-category-groups">
                {orderedCategoryGroups.map(([name, listings], groupIndex) => {
                  const heading = <h2>{name}</h2>;
                  const products = <>
                    <CollectionProductRow label={`${name} products`}>
                      {(categoryOnly ? pageProducts : listings.slice(0, category ? 10 : 5)).map((listing, index) => (
                        <Card content={content} key={listing.id} item={listing} eager={groupIndex === 0 && index < 3} />
                      ))}
                    </CollectionProductRow>
                  </>;
                  return (
                    <section className="collection-category-section" key={name}>
                      {!categoryOnly && <div className="collection-category-heading collection-category-static">
                        {heading}
                        {!categoryOnly && listings.length > (category ? 10 : 5) && (
                          <Link className="category-view-all collection-view-all" href={`/collection/${encodeURIComponent(name)}`}>
                            View all ({listings.length}) products
                          </Link>
                        )}
                      </div>}
                      {products}
                      {!categoryOnly && category && listings.length > 10 && (
                        <div className="collection-view-all-bottom">
                          <Link href={`/collection/${encodeURIComponent(name)}`}>
                            View all ({listings.length}) products
                          </Link>
                        </div>
                      )}
                    </section>
                  );
                })}
              </div>
            ) : (
              <div className="empty">
                <h2>No products found</h2>
                <p>Try another search or explore all categories.</p>
                <button
                  onClick={() => {
                    if (categoryOnly) router.push("/collection");
                    else { setCategory(""); setQuery(""); }
                  }}
                >
                  Clear filters
                </button>
              </div>
            )}
            {(categoryOnly || bestSellersOnly) && pageCount > 1 && (
              <nav className="collection-pagination" aria-label="Product pagination">
                <button type="button" aria-label="Previous page" disabled={currentPage === 1} onClick={() => changeProductPage(currentPage - 1)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg>
                </button>
                {Array.from({ length: Math.min(5, pageCount) }, (_, index) => {
                  const start = Math.max(1, Math.min(currentPage - 2, pageCount - 4));
                  const number = start + index;
                  return <button key={number} type="button" aria-label={`Page ${number}`} aria-current={currentPage === number ? "page" : undefined}
                    onClick={() => changeProductPage(number)}>{number}</button>;
                })}
                <button type="button" aria-label="Next page" disabled={currentPage === pageCount} onClick={() => changeProductPage(currentPage + 1)}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg>
                </button>
              </nav>
            )}
          </section>
        </main>
      ) : page === "listing" ? (
        <main className="shop listing-detail">
          <Link className="listing-back-link" href={item?.category ? `/collection/${encodeURIComponent(item.category)}` : "/collection"}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5m6-6-6 6 6 6" /></svg>
            Explore {item?.category || "Collections"}
          </Link>
          {!ready ? (
            <ShopSkeleton variant="product" />
          ) : item ? (
            <div className="listing-detail-grid">
              <ListingGallery item={item} />
              <section className="listing-detail-info">
                <div className="listing-detail-heading">
                  <div className="listing-category-favorite">
                    <p className="eyebrow">{item.category}</p>
                    <ProductShopping id={item.id} compact mode="favorite" showFavoriteNotice={false} />
                  </div>
                  <h1>{item.title}</h1>
                  <div className="listing-detail-price"><ListingPrices item={item} content={content} detail /></div>
                </div>
                <p className="listing-maker">Handmade by GiftsByArtisans</p>
                <div className="listing-mobile-facts">
                  <Link className="free-delivery" href="/policies/delivery">Free delivery</Link>
                  {content.reviews.length > 0 && <div>
                    <span>Testimonials</span>
                    <a href="#listing-testimonials">{content.reviews.length} customer {content.reviews.length === 1 ? "story" : "stories"}</a>
                  </div>}
                </div>
                <ProductShopping id={item.id} mode="cart" item={resolvePersonalization(item, content)} />
                {(item.etsyUrl || item.pinterestUrl) && (
                  <div className="listing-detail-buy">
                    {item.etsyUrl && (
                      <a
                        className="etsy-button"
                        href={item.etsyUrl}
                        rel="noopener noreferrer"
                      >
                        Buy From Etsy
                      </a>
                    )}
                    {item.pinterestUrl && (
                      <a
                        href={item.pinterestUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Pinterest
                      </a>
                    )}
                  </div>
                )}
                <details className="product-description listing-first-description" open>
                  <summary>Description</summary>
                  <p className="description">{item.description}</p>
                </details>
                <ShippingPolicy content={content} />
              </section>
            </div>
          ) : (
            <div className="empty">
              <h1 className="catalog-heading">Product not found</h1>
              <Link href="/collection">Explore the collection →</Link>
            </div>
          )}
          {ready && item && <ProductBenefits />}
          {ready && item && content.reviews.length > 0 && (
            <section id="listing-testimonials" className="testimonials collection listing-testimonials" aria-label="Customer testimonials">
              <p className="eyebrow">KIND WORDS FROM OUR CUSTOMERS</p>
              <h2>Customer testimonials</h2>
              <TestimonialCarousel reviews={content.reviews} intervalSeconds={content.testimonialIntervalSeconds} />
            </section>
          )}
        </main>
      ) : (
        <main className={`info-page${page === "policies" ? " shop-policies-page" : ""}`}>
          <h1>{page === "contact" ? "Contact us" : page === "wholesale" ? "Wholesale inquiry" : id ? content.policies.find(policy => policy.id === id)?.title || "Shop policy" : "Shop policies"}</h1>
          {page === "policies" ? (
            settingsStatus === "loading" && !initialContent ? <p role="status">Loading policies…</p> : settingsStatus === "failed" ? <p role="alert">Policies could not be loaded. Please refresh to try again.</p> : id ? (
              content.policies.some(policy => policy.id === id) ? <article className="policy"><p className="pre-wrap">{policyBody(content.policies.find(policy => policy.id === id)!.title, content.policies.find(policy => policy.id === id)!.text)}</p></article> : <p>This policy could not be found. Choose a policy from the customer care links below.</p>
            ) : content.policies.map((p) => (
              <section className="policy" id={"policy-" + p.id} key={p.id}>
                <h2><Link href={"/policies/" + encodeURIComponent(p.id)}>{p.title} <span aria-hidden="true">→</span></Link></h2>
              </section>
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
    </div>
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
  const touchStart = useRef<{ x: number; y: number } | null>(null);
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
    <section className="store-hero">
      <div
        className="store-hero-carousel"
        role={multiple ? "region" : undefined}
        aria-roledescription={multiple ? "carousel" : undefined}
        aria-label="Shop highlights"
      >
        <div
          className="store-hero-slide"
          onTouchStart={event => {
            const touch = event.touches[0];
            touchStart.current = event.touches.length === 1 ? { x: touch.clientX, y: touch.clientY } : null;
          }}
          onTouchCancel={() => { touchStart.current = null; }}
          onTouchEnd={event => {
            const start = touchStart.current;
            touchStart.current = null;
            const touch = event.changedTouches[0];
            if (!start || !touch || !multiple) return;
            const dx = touch.clientX - start.x;
            const dy = touch.clientY - start.y;
            if (Math.abs(dx) < 40 || Math.abs(dx) <= Math.abs(dy)) return;
            setIndex((active + (dx < 0 ? 1 : banners.length - 1)) % banners.length);
          }}
          role={multiple ? "group" : undefined}
          aria-roledescription={multiple ? "slide" : undefined}
          aria-label={multiple ? `${active + 1} of ${banners.length}` : undefined}
        >
          <ShopImage
            key={selected.image}
            src={selected.image}
            alt={selected.alt}
            optimized
            loading="eager"
            fetchPriority="high"
            sizes="100vw"
          />
        </div>
        {multiple && (
          <>
            <button
              className="store-hero-arrow previous"
              type="button"
              aria-label="Previous banner"
              onClick={() => setIndex((active + banners.length - 1) % banners.length)}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m14 6-6 6 6 6" /></svg>
            </button>
            <div className="store-hero-dots">
              {banners.map((banner, i) => (
                <button
                  key={banner.id}
                  type="button"
                  aria-label={`Show banner ${i + 1}`}
                  aria-pressed={active === i}
                  onClick={() => setIndex(i)}
                />
              ))}
            </div>
            <button
              className="store-hero-arrow next"
              type="button"
              aria-label="Next banner"
              onClick={() => setIndex((active + 1) % banners.length)}
            >
              <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m10 6 6 6-6 6" /></svg>
            </button>
          </>
        )}
      </div>
      {hasText && (
        <div className="store-hero-copy">
          <p className="eyebrow">THE ART OF GIVING</p>
          {content.bannerTitle.trim() && <h1>{content.bannerTitle}</h1>}
          {content.bannerText.trim() && <p>{content.bannerText}</p>}
          <Link className="primary banner-button" href="/collection">Explore the collection →</Link>
        </div>
      )}
    </section>
  );
}
