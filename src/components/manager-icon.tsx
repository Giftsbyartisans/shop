export default function ManagerIcon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    download: "M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5",
    upload: "M12 16V4m-5 5 5-5 5 5M4 16v5h16v-5",
    trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
    star: "m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9L12 3z",
    Dashboard: "m3 11 9-8 9 8M5 10v11h5v-7h4v7h5V10",
    Search: "M19 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0m-2 5 5 6",
    Settings:
      "M18.64 9.78 L18.88 10.72 L21.44 10.92 L21.44 13.08 L18.88 13.28 L18.64 14.22 L18.26 15.12 L17.77 15.96 L19.43 17.91 L17.91 19.43 L15.96 17.77 L15.12 18.26 L14.22 18.64 L13.28 18.88 L13.08 21.44 L10.92 21.44 L10.72 18.88 L9.78 18.64 L8.88 18.26 L8.04 17.77 L6.09 19.43 L4.57 17.91 L6.23 15.96 L5.74 15.12 L5.36 14.22 L5.12 13.28 L2.56 13.08 L2.56 10.92 L5.12 10.72 L5.36 9.78 L5.74 8.88 L6.23 8.04 L4.57 6.09 L6.09 4.57 L8.04 6.23 L8.88 5.74 L9.78 5.36 L10.72 5.12 L10.92 2.56 L13.08 2.56 L13.28 5.12 L14.22 5.36 L15.12 5.74 L15.96 6.23 L17.91 4.57 L19.43 6.09 L17.77 8.04 L18.26 8.88 Z",
    menu: "M3 6h18M3 12h18M3 18h18",
    Listings: "m12 3 9 5-9 5-9-5 9-5M3 8v9l9 5 9-5V8M12 13v9M7 5l9 5",
    "Brand & announcement":
      "M12 3a9 9 0 1 0 0 18h2a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a4 4 0 0 0 4-4c0-4-4-6-9-6M7 8h.01M12 6h.01M17 8h.01M6 13h.01",
    "Banner Image": "M4 3h16v18H4zM4 17l5-5 4 4 3-3 4 4M9 8h.01",
    Categories: "M3 3h8l10 10-8 8L3 11V3zM7 7h.01",
    Sale: "m5 20 14-16M6 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6M18 14a3 3 0 1 0 0 6 3 3 0 0 0 0-6",
    Testimonials: "M3 4h18v14H8l-5 4V4z",
    Messages: "M3 4h18v14H8l-5 4V4z",
    "Social & footer":
      "M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0M3 12h18M12 3c-5 5-5 13 0 18 5-5 5-13 0-18",
    "Pages & policies": "M5 3h9l5 5v13H5V3zM14 3v6h5M8 13h8M8 17h6",
    collapse: "M3 3h18v18H3zM9 3v18m7-14-4 5 4 5",
    shop: "M14 3h7v7m0-7L10 14M11 5H4v16h16v-7",
    logout: "M9 3H4v18h5m7-14 5 5-5 5M8 12h13",
  };
  return (
    <svg
      width="25"
      height="25"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[name] || paths.Listings} />
      {name === "Settings" && <circle cx="12" cy="12" r="3" />}
    </svg>
  );
}
