"use client";

import "@/lib/customer-auth";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import { signIn, signUp, confirmSignUp, resendSignUpCode, resetPassword, confirmResetPassword, confirmSignIn, getCurrentUser, signOut, type SignInOutput } from "aws-amplify/auth";
import styles from "./customer-auth.module.css";
import CustomerAccount from "./customer-account";

type Mode = "login" | "signup" | "verify" | "forgot" | "reset" | "challenge" | "new-password" | "account";

export default function CustomerAuth({ initialMode }: { initialMode: "login" | "signup" | "account" | "forgot" }) {
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [accountEmail, setAccountEmail] = useState("");
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    if (initialMode === "login") {
      try {
        const verifiedEmail = sessionStorage.getItem("shop-verified-email");
        if (verifiedEmail) {
          setEmail(verifiedEmail);
          setMessage("Email verified. Log in to your account.");
          sessionStorage.removeItem("shop-verified-email");
        }
      } catch { /* Login remains available when browser storage is disabled. */ }
    }
    getCurrentUser().then(user => {
      if (active && initialMode === "login" && new URLSearchParams(window.location.search).get("next") === "/cart") { window.location.assign("/cart"); return; }
      if (active) { setAccountEmail(user.signInDetails?.loginId || "Customer"); setMode("account"); }
    }).catch(() => { if (active && initialMode === "account") setMode("login"); })
      .finally(() => { if (active) setChecking(false); });
    return () => { active = false; };
  }, [initialMode]);

  function change(next: Mode, notice = "") { setMode(next); setError(""); setMessage(notice); }
  async function finishLogin(result: SignInOutput) {
    if (result.isSignedIn) { window.location.assign(new URLSearchParams(window.location.search).get("next") === "/cart" ? "/cart" : "/account"); return; }
    const step = result.nextStep.signInStep;
    if (step === "CONFIRM_SIGN_UP") {
      await resendSignUpCode({ username: email.trim() });
      change("verify", "Enter the verification code sent to your email.");
    } else if (step === "RESET_PASSWORD") {
      change("forgot", "Reset your password to continue.");
    } else if (step === "CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED") {
      change("new-password", "Choose a new password to finish signing in.");
    } else if (["CONFIRM_SIGN_IN_WITH_EMAIL_CODE", "CONFIRM_SIGN_IN_WITH_SMS_CODE", "CONFIRM_SIGN_IN_WITH_TOTP_CODE"].includes(step)) {
      change("challenge", "Enter your sign-in verification code.");
    } else { throw new Error("This account requires an additional sign-in method. Please contact the shop for help."); }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const password = String(data.get("password") || "");
    const code = String(data.get("code") || "").trim();
    setBusy(true); setError(""); setMessage("");
    try {
      if (["signup", "reset", "new-password"].includes(mode) && password !== data.get("confirmPassword")) throw new Error("Passwords do not match.");
      const username = email.trim();
      if (mode === "signup") {
        const result = await signUp({ username, password, options: { userAttributes: { email: username } } });
        form.reset();
        change(result.isSignUpComplete ? "login" : "verify", result.isSignUpComplete ? "Your account is ready. Log in to continue." : "Enter the verification code sent to your email.");
      } else if (mode === "verify") {
        const result = await confirmSignUp({ username, confirmationCode: code });
        if (!result.isSignUpComplete) throw new Error("Verification is incomplete. Please try again.");
        try {
          sessionStorage.setItem("shop-verified-email", username);
          window.location.assign("/login");
          return;
        } catch { /* Preserve the email in this form if browser storage is unavailable. */ }
        change("login", "Email verified. Log in to your account.");
      } else if (mode === "login") {
        await finishLogin(await signIn({ username, password }));
      } else if (mode === "forgot") {
        const result = await resetPassword({ username });
        change(result.nextStep.resetPasswordStep === "DONE" ? "login" : "reset", "If your account is eligible, you will receive a password reset code by email.");
      } else if (mode === "reset") {
        await confirmResetPassword({ username, confirmationCode: code, newPassword: password });
        change("login", "Password updated. Log in with your new password.");
      } else if (mode === "challenge" || mode === "new-password") {
        await finishLogin(await confirmSignIn({ challengeResponse: mode === "challenge" ? code : password }));
      }
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Something went wrong. Please try again."); }
    finally { setBusy(false); }
  }

  async function resend() {
    setBusy(true); setError("");
    try { await resendSignUpCode({ username: email.trim() }); setMessage("A new verification code has been sent to your email."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not send the code."); }
    finally { setBusy(false); }
  }
  async function logout() {
    setBusy(true); setError("");
    try { await signOut(); window.location.assign("/"); }
    catch { setError("Could not sign out. Please try again."); }
    finally { setBusy(false); }
  }

  const titles: Record<Mode, string> = { login: "Welcome back", signup: "Create your account", verify: "Verify your email", forgot: "Forgot your password?", reset: "Reset your password", challenge: "Verify your sign-in", "new-password": "Choose a new password", account: "Your account" };
  const needsPassword = ["login", "signup", "reset", "new-password"].includes(mode);
  const newPassword = mode !== "login";
  const needsCode = ["verify", "reset", "challenge"].includes(mode);

  if (!checking && mode === "account") return <CustomerAccount email={accountEmail} busy={busy} error={error} onSignOut={logout} />;

  return <main className={styles.page}>
    <div className={styles.topbar}>
      <Link href="/" className={styles.back}>← Back to the shop</Link>
      <Link href="/" className={styles.brand}>GiftsByArtisans</Link>
    </div>
    <section className={styles.card} aria-labelledby="account-title">
      <h1 id="account-title">{checking ? "Your account" : titles[mode]}</h1>
      {checking ? <p role="status">Checking your session…</p> : <>
        <p className={styles.intro}>{mode === "account" ? `Signed in as ${accountEmail}` : mode === "signup" ? "A little more personal. Create a customer account with your email." : mode === "login" ? "Log in to your customer account, or continue shopping as a guest." : "Follow the steps below to access your account."}</p>
        {message && <p className={styles.message} role="status">{message}</p>}
        {error && <p className={`${styles.message} ${styles.error}`} role="alert">{error}</p>}
        {mode === "account" ? <div className={styles.actions}><Link href="/collection" className={styles.guest}>Continue shopping</Link><button disabled={busy} onClick={logout}>{busy ? "Signing out…" : "Sign out"}</button></div> : <>
          <form className={styles.form} onSubmit={submit} key={mode}>
            <fieldset disabled={busy} style={{ display: "contents" }}>
              <label htmlFor="customer-email">Email address<input id="customer-email" name="email" type="email" required autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} readOnly={["verify", "reset", "challenge", "new-password"].includes(mode)} maxLength={254} /></label>
              {needsCode && <label htmlFor="customer-code">Verification code<input id="customer-code" name="code" autoComplete="one-time-code" required autoFocus maxLength={32} /></label>}
              {needsPassword && <label htmlFor="customer-password">{newPassword ? "New password" : "Password"}<input id="customer-password" name="password" type="password" required autoComplete={newPassword ? "new-password" : "current-password"} minLength={newPassword ? 8 : undefined} maxLength={256} />{newPassword && <small>Use at least 8 characters, including uppercase and lowercase letters, a number, and a symbol.</small>}</label>}
              {needsPassword && newPassword && <label htmlFor="customer-confirm">Confirm password<input id="customer-confirm" name="confirmPassword" type="password" autoComplete="new-password" required minLength={8} maxLength={256} /></label>}
              <button className="primary" type="submit">{busy ? "Please wait…" : mode === "login" ? "Log in" : mode === "signup" ? "Create account" : mode === "verify" ? "Verify email" : mode === "forgot" ? "Send reset code" : mode === "reset" ? "Update password" : "Continue"}</button>
            </fieldset>
          </form>
          {mode === "login" && <p><Link className={styles.textButton} href="/forgot-password">Forgot password?</Link></p>}
          {mode === "verify" && <p><button className={styles.textButton} disabled={busy} onClick={resend}>Resend verification code</button></p>}
          <div className={styles.actions}><Link href="/collection" className={styles.guest}>Continue as guest</Link></div>
          <p className={styles.switch}>{mode === "login" ? <>New here? <Link href="/signup">Sign up</Link></> : mode === "signup" ? <>Already have an account? <Link href="/login">Log in</Link></> : <button className={styles.textButton} disabled={busy} onClick={() => change("login")}>Back to login</button>}</p>
        </>}
      </>}
    </section>
  </main>;
}
