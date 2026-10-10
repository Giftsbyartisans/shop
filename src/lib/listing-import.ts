import {
  validateListingLinks,
  validateListingMedia,
  type Listing,
} from "./catalog";

export function parseCSV(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(cell);
      cell = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((c) => c.trim())) rows.push(row);
      row = [];
      cell = "";
    } else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quoted field.");
  row.push(cell);
  if (row.some((c) => c.trim())) rows.push(row);
  return rows;
}
export function importListings(text: string, filename: string): Listing[] {
  let records: Record<string, unknown>[];
  if (filename.toLowerCase().endsWith(".csv")) {
    const [headers, ...rows] = parseCSV(text.replace(/^\uFEFF/, ""));
    if (!headers) throw new Error("The file is empty.");
    records = rows.map((row) =>
      Object.fromEntries(
        headers.map((header, i) => [header.trim().toLowerCase(), row[i] ?? ""]),
      ),
    );
  } else {
    const raw: unknown = JSON.parse(text);
    const list = Array.isArray(raw)
      ? raw
      : raw && typeof raw === "object" && "listings" in raw
        ? raw.listings
        : null;
    if (!Array.isArray(list))
      throw new Error("JSON must contain a listings array.");
    records = list.map((item) => {
      if (!item || typeof item !== "object")
        throw new Error("Each listing must be an object.");
      return Object.fromEntries(
        Object.entries(item).map(([k, v]) => [k.toLowerCase(), v]),
      );
    });
  }
  if (!records.length) throw new Error("The file contains no listings.");
  const ids = new Set<string>();
  return records.slice(0, 10).map((record, index) => {
    const title = String(record.title ?? "").trim(),
      description = String(record.description ?? "").trim();
    const rawPrice = record.price;
    const price = Number(rawPrice);
    if (
      !title ||
      !description ||
      rawPrice === undefined ||
      rawPrice === "" ||
      !Number.isFinite(price) ||
      price < 0
    )
      throw new Error(
        `Row ${index + 1}: title, description, and a valid price are required.`,
      );
    const id = String(record.id ?? record.listing_id ?? crypto.randomUUID());
    if (ids.has(id)) throw new Error(`Duplicate listing ID: ${id}`);
    ids.add(id);
    const image = String(record.image ?? record.image1 ?? "/demo/gift-0.svg");
    if (!image.startsWith("/demo/") && !image.startsWith("s3:media/")) {
      try {
        if (new URL(image).protocol !== "https:") throw new Error();
      } catch {
        throw new Error(`Row ${index + 1}: use an HTTPS image URL.`);
      }
    }
    const links = {
      etsyUrl: String(record.etsyurl ?? record.etsy_url ?? ""),
      pinterestUrl: String(record.pinteresturl ?? record.pinterest_url ?? ""),
    };
    validateListingLinks(links);
    const images = Array.isArray(record.images)
      ? record.images.map(String)
      : Array.from({ length: 10 }, (_, index) => record[`image${index + 1}`])
          .filter(Boolean)
          .map(String);
    const videos = Array.isArray(record.videos)
      ? record.videos.map(String)
      : [];
    const salePrice = record.saleprice ?? record.sale_price;
    const listing: Listing = {
      ...links,
      images: images.length ? images : [image],
      videos,
      salePrice:
        salePrice === undefined || salePrice === null || salePrice === ""
          ? undefined
          : Number(salePrice),
      id,
      title,
      description,
      price,
      image: images[0] ?? image,
      category: String(record.category ?? record.section ?? "Uncategorized"),
      published: record.published === true || record.published === "true",
    };
    validateListingMedia(listing);
    return listing;
  });
}
