"use client";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { fetchUserAttributes, updateUserAttributes, updatePassword } from "aws-amplify/auth";
import styles from "./customer-auth.module.css";
import CustomerRecords from "./customer-records";

export default function CustomerAccount({ email, busy, error, onSignOut }: { email: string; busy: boolean; error: string; onSignOut: () => Promise<void> }) {
  const [tab, setTab] = useState<"overview" | "profile" | "security" | "addresses" | "orders">("overview");
  useEffect(() => {
    const section = new URLSearchParams(window.location.search).get("section");
    if (section === "addresses" || section === "orders") setTab(section);
  }, []);
  const [name, setName] = useState("");
  const [savedName, setSavedName] = useState("");
  const [profileEmail, setProfileEmail] = useState(email);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const [failure, setFailure] = useState("");
  useEffect(() => {
    let active = true;
    fetchUserAttributes().then(attributes => {
      if (!active) return;
      setName(attributes.name || ""); setSavedName(attributes.name || "");
      setProfileEmail(attributes.email || email); setVerified(attributes.email_verified === "true");
    }).catch(() => { if (active) setFailure("Could not load your profile. Refresh the page to try again."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [email]);
  function select(next: typeof tab) { setTab(next); setNotice(""); setFailure(""); }
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    setSaving(true); setNotice(""); setFailure("");
    try {
      if (tab === "profile") {
        const value = name.trim();
        if (!value) throw new Error("Enter your name.");
        await updateUserAttributes({ userAttributes: { name: value } });
        setName(value); setSavedName(value); setNotice("Your profile has been saved.");
      } else {
        const password = String(data.get("newPassword"));
        if (password !== data.get("confirmPassword")) throw new Error("Passwords do not match.");
        await updatePassword({ oldPassword: String(data.get("oldPassword")), newPassword: password });
        form.reset(); setNotice("Your password has been updated.");
      }
    } catch (cause) { setFailure(cause instanceof Error ? cause.message : "Could not save changes. Please try again."); }
    finally { setSaving(false); }
  }
  return <>
    <header className={styles.accountHeader}>
      <Link href="/" className="brand">GiftsByArtisans</Link>
      <button className={styles.signout} disabled={busy || saving} onClick={onSignOut}>{busy ? "Signing out…" : "Sign out"}</button>
    </header>
    <main className={styles.accountPage}>
    <div className={styles.panel}>
      <div className={styles.accountBar}>
        <div className={styles.identity}>
          <div className={styles.avatar} aria-hidden="true">{(savedName || profileEmail).charAt(0).toUpperCase()}</div>
          <div><h2>{savedName || "Your account"}</h2><p className={styles.accountEmail}>{profileEmail}</p></div>
        </div>
        <nav aria-label="Account sections" className={styles.accountNav}>
          <button onClick={() => select("overview")} aria-current={tab === "overview" ? "page" : undefined}>Overview</button>
          <button onClick={() => select("profile")} aria-current={tab === "profile" ? "page" : undefined}>Profile details</button>
          <button onClick={() => select("addresses")} aria-current={tab === "addresses" ? "page" : undefined}>Shipping addresses</button>
          <button onClick={() => select("orders")} aria-current={tab === "orders" ? "page" : undefined}>Orders</button>
          <button onClick={() => select("security")} aria-current={tab === "security" ? "page" : undefined}>Password & security</button>
        </nav>
      </div>
      <section className={styles.accountContent} aria-labelledby="panel-title">
        <p className={styles.eyebrow}>MY ACCOUNT</p>
        <h1 id="panel-title">{tab === "overview" ? `Welcome${savedName ? `, ${savedName}` : " back"}` : tab === "profile" ? "Profile details" : tab === "addresses" ? "Saved shipping addresses" : tab === "orders" ? "Your orders" : "Password & security"}</h1>
        {(failure || error) && <p role="alert" className={`${styles.message} ${styles.error}`}>{failure || error}</p>}
        {notice && <p role="status" className={styles.message}>{notice}</p>}
        {tab === "addresses" || tab === "orders" ? <CustomerRecords key={tab} section={tab} /> : loading ? <p role="status">Loading your profile…</p> : tab === "overview" ? <>
          <p className={styles.intro}>Make yourself at home. Manage your details and discover something thoughtful.</p>
          <div className={styles.summary}><div><span>Email address</span><strong>{profileEmail}</strong></div><div><span>Email status</span><strong>{verified ? "Verified" : "Not verified"}</strong></div></div>
          <div className={styles.quickLinks}>
            <Link href="/collection"><h3>Explore the collection <span aria-hidden="true">→</span></h3><p>Find handcrafted pieces and personal gifts.</p></Link>
            <Link href="/contact"><h3>Need a hand? <span aria-hidden="true">→</span></h3><p>Contact us with questions about a product or purchase.</p></Link>
            <Link href="/policies/delivery"><h3>Shipping & delivery <span aria-hidden="true">→</span></h3><p>Read about shipping and delivery.</p></Link>
          </div>
        </> : tab === "profile" ? <>
          <p className={styles.intro}>Keep your customer profile up to date.</p>
          <form className={`${styles.form} ${styles.profileForm}`} onSubmit={save}>
            <label htmlFor="profile-name">Full name<input id="profile-name" name="name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required maxLength={100} disabled={saving} /></label>
            <label htmlFor="profile-email">Email address<input id="profile-email" type="email" value={profileEmail} readOnly autoComplete="email" /><small>This is the email used to sign in.</small></label>
            <button className="primary" disabled={saving} type="submit">{saving ? "Saving…" : "Save changes"}</button>
          </form>
        </> : <>
          <p className={styles.intro}>Choose a strong password to protect your account.</p>
          <form className={`${styles.form} ${styles.securityForm}`} onSubmit={save}>
            <label htmlFor="old-password">Current password<input id="old-password" name="oldPassword" type="password" autoComplete="current-password" required maxLength={256} disabled={saving} /></label>
            <label htmlFor="new-password">New password<input id="new-password" name="newPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={256} disabled={saving} /><small>Use at least 8 characters, including uppercase and lowercase letters, a number, and a symbol.</small></label>
            <label htmlFor="confirm-password">Confirm new password<input id="confirm-password" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={256} disabled={saving} /></label>
            <button className="primary" disabled={saving} type="submit">{saving ? "Updating…" : "Update password"}</button>
          </form>
        </>}
      </section>
    </div>
    </main>
  </>;
}
