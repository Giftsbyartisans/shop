"use client";
import Link from 'next/link';
import { useEffect, useState, useSyncExternalStore } from 'react';
import { loadShopContent } from '@/lib/backend';

const query = '(min-width: 1024px)';
function subscribe(callback: () => void) {
  const media = window.matchMedia(query);
  media.addEventListener('change', callback);
  return () => media.removeEventListener('change', callback);
}
const desktopSnapshot = () => window.matchMedia(query).matches;
const serverSnapshot = () => false;

export default function AdminDesktopGate({ children }: { children: React.ReactNode }) {
  const desktop = useSyncExternalStore(subscribe, desktopSnapshot, serverSnapshot);
  const [restriction, setRestriction] = useState<boolean | null>(null);
  useEffect(() => {
    let active = true;
    const changed = (event: Event) => {
      const value = (event as CustomEvent<unknown>).detail;
      if (typeof value === 'boolean') setRestriction(value);
    };
    window.addEventListener('admin-desktop-setting', changed);
    void loadShopContent().then(content => { if (active) setRestriction(content.adminDesktopOnly); })
      .catch(() => { if (active) setRestriction(true); });
    return () => { active = false; window.removeEventListener('admin-desktop-setting', changed); };
  }, []);
  if (desktop || restriction === false) return children;
  if (restriction === null) return <main className="admin-desktop-notice"><p role="status">Loading admin panel…</p></main>;
  return <main className="admin-desktop-notice">
    <div className="admin-desktop-message">
      <h1>Please use a desktop</h1>
      <p>The admin panel is available on desktop screens only.</p>
      <Link href="/">Back to shop</Link>
    </div>
    <p className="admin-desktop-loading" role="status">Loading admin panel…</p>
  </main>;
}
