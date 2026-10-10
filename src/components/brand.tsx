import ShopImage from "./shop-image";
import Link from "next/link";
import type { ShopContent } from "@/lib/content";
export default function Brand({ content }: { content: ShopContent }) {
  return (
    <Link href="/" className="brand">
      {content.logo ? (
        <ShopImage
          className="brand-logo"
          src={content.logo}
          alt={content.logoAlt || "GiftsByArtisans"}
        />
      ) : (
        <>GiftsByArtisans</>
      )}
    </Link>
  );
}
