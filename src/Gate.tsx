import React, { useEffect, useState } from "react";
import {
  login,
  logout,
  handleAuthCallback,
  acceptInvite,
  updateUser,
} from "@netlify/identity";
import { App } from "./App";
export function Gate() {
  const [state, setState] = useState("checking"),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const [invite, setInvite] = useState<string | null>(null),
    [busy, setBusy] = useState(false);
  async function check() {
    try {
      const r = await fetch("/api/session", {
        credentials: "same-origin",
        cache: "no-store",
      });
      setState(r.ok ? "approved" : r.status === 403 ? "denied" : "login");
    } catch {
      setState("offline");
    }
  }
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const c = await handleAuthCallback();
        history.replaceState(null, "", location.pathname);
        if (!live) return;
        if (c?.type === "invite") {
          setInvite(c.token || null);
          setState("invite");
        } else if (c?.type === "recovery") {
          setState("recovery");
        } else await check();
      } catch {
        history.replaceState(null, "", location.pathname);
        if (live) {
          setError(
            "This link could not be verified. Ask the project owner for access.",
          );
          setState("login");
        }
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (state === "invite") {
        if (!invite) throw Error();
        await acceptInvite(invite, password);
        setInvite(null);
      } else if (state === "recovery") await updateUser({ password });
      else await login(email, password);
      setPassword("");
      await check();
    } catch {
      setError(
        "Sign-in or link verification failed. Check your details or ask the project owner.",
      );
    } finally {
      setPassword("");
      setBusy(false);
    }
  }
  async function signout() {
    setBusy(true);
    try {
      await logout();
      setState("login");
    } catch {
      setError("Sign-out could not be confirmed. Close this window and retry.");
    } finally {
      setBusy(false);
    }
  }
  if (state === "approved")
    return (
      <>
        <div className="air-session" role="region" aria-label="Session">
          <span>Private evaluation · approved account</span>
          <button onClick={signout} disabled={busy}>
            Sign out
          </button>
        </div>
        <App />
      </>
    );
  return (
    <main className="air-gate">
      <h1>AirSaathi / एयर साथी</h1>
      <h2>Private evaluation / निजी मूल्यांकन</h2>
      <p>
        Access is limited to approved adult reviewers. The sign-in page is
        visible to anyone; forecast and AI endpoints require server-verified
        approval. No signup is available here.
      </p>
      {["login", "invite", "recovery"].includes(state) ? (
        <form onSubmit={submit}>
          <h3>
            {state === "login"
              ? "Sign in"
              : state === "invite"
                ? "Accept approved invitation"
                : "Set a new password"}
          </h3>
          {state === "login" && (
            <label>
              Email
              <input
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}
          <label>
            Password
            <input
              type="password"
              autoComplete={
                state === "login" ? "current-password" : "new-password"
              }
              minLength={state === "login" ? undefined : 12}
              required
              maxLength={200}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button disabled={busy}>{busy ? "Checking…" : "Continue"}</button>
          <p>
            Credentials are handled by Netlify Identity. Do not send passwords
            to the project owner.
          </p>
        </form>
      ) : (
        <p role="status">
          {state === "checking"
            ? "Checking your session…"
            : state === "denied"
              ? "This account is not approved, has expired or was revoked. Ask the project owner."
              : "The access service is unavailable. No data or model request has been made."}
        </p>
      )}
      <p role="alert">{error}</p>
      {["denied", "offline"].includes(state) && (
        <button onClick={signout} disabled={busy}>
          Sign out / retry
        </button>
      )}
    </main>
  );
}
