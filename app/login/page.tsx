"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

export default function LoginPage() {
  const router = useRouter();
  const [token, setToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "Incorrect token.");
        return;
      }
      router.push("/");
      router.refresh();
    } catch {
      setError("Could not reach the server.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <h1 className={styles.title}>GitHub Portfolio Status</h1>
        <p className={styles.subtitle}>Enter the access token to continue.</p>
        <form onSubmit={handleSubmit}>
          <label className={styles.label} htmlFor="token">
            Access token
          </label>
          <input
            id="token"
            type="password"
            className={styles.input}
            value={token}
            onChange={(event) => setToken(event.target.value)}
            autoFocus
            autoComplete="off"
          />
          <button type="submit" className={styles.submit} disabled={submitting || !token}>
            {submitting ? "Checking..." : "Continue"}
          </button>
          {error && <p className={styles.error}>{error}</p>}
        </form>
      </div>
    </div>
  );
}
