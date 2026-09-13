"use client";

import { useCallback, useEffect, useState } from "react";
import styles from "./page.module.css";
import { formatRelativeTime } from "@/lib/relative-time";
import { CURATED_STATUSES, type CuratedStatus } from "@/lib/metadata";
import type { PortfolioRepo, PortfolioResponse } from "./api/portfolio/route";

function formatStatusLabel(status: CuratedStatus): string {
  return status
    .split("-")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

interface EditDraft {
  status: CuratedStatus;
  purpose: string;
  production: boolean;
}

function AlertIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

export default function PortfolioPage() {
  const [data, setData] = useState<PortfolioResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingRepo, setEditingRepo] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<EditDraft | null>(null);
  const [saving, setSaving] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const response = await fetch("/api/portfolio", { cache: "no-store" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Refresh failed (status ${response.status})`);
      }
      const body: PortfolioResponse = await response.json();
      setData(body);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not refresh");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Standard fetch-on-mount: refresh() kicks off a real async request:
    // the setLoading(true) inside it isn't mirroring existing state, it's
    // the first step of that request.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refresh();
  }, [refresh]);

  function startEdit(repo: PortfolioRepo) {
    setEditingRepo(repo.name);
    setEditDraft({
      status: repo.status ?? "active",
      purpose: repo.purpose ?? "",
      production: repo.production,
    });
  }

  function cancelEdit() {
    setEditingRepo(null);
    setEditDraft(null);
  }

  async function saveEdit(repoName: string) {
    if (!editDraft) return;
    setSaving(true);
    try {
      const response = await fetch("/api/metadata", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repo: repoName, ...editDraft }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.error ?? `Save failed (status ${response.status})`);
      }
      cancelEdit();
      await refresh();
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  const repos = data?.repos ?? [];

  return (
    <div className={styles.wrap}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>GitHub Portfolio Status</h1>
          <div className={styles.meta}>
            {data
              ? `Fetched ${formatRelativeTime(data.fetchedAt)} · ${repos.length} repo${repos.length === 1 ? "" : "s"} loaded${data.partial ? ` (${data.errors.length} error${data.errors.length === 1 ? "" : "s"})` : ""}`
              : loading
                ? "Loading..."
                : "Not yet loaded"}
          </div>
        </div>
        <button className={styles.refresh} onClick={refresh} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </button>
      </header>

      {loadError && <div className={styles.bannerError}>{loadError}</div>}

      {data?.partial && data.errors.length > 0 && (
        <div className={styles.bannerError}>
          <AlertIcon /> {data.errors.length} repo{data.errors.length === 1 ? "" : "s"} failed to load:{" "}
          {data.errors.map((e) => `${e.repo} (${e.reason})`).join(", ")}
        </div>
      )}

      {repos.length === 0 && !loading ? (
        <div className={styles.empty}>No repositories loaded yet.</div>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Repository</th>
              <th>Status</th>
              <th>Production</th>
              <th className={styles.numHeader}>Open PRs</th>
              <th className={styles.numHeader}>Open Issues</th>
              <th className={styles.numHeader}>Last Activity</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {repos.map((repo) => {
              const isEditing = editingRepo === repo.name;

              return (
                <tr key={repo.name} className={`${styles.row} ${repo.stale ? styles.staleRow : ""}`}>
                  <td className={styles.cell}>
                    <div className={styles.repoName}>{repo.name}</div>
                    {repo.purpose && <div className={styles.purpose}>{repo.purpose}</div>}
                  </td>
                  {isEditing && editDraft ? (
                    <td className={styles.cell} colSpan={6}>
                      <div className={styles.editForm}>
                        <select
                          className={styles.editSelect}
                          value={editDraft.status}
                          onChange={(e) => setEditDraft({ ...editDraft, status: e.target.value as CuratedStatus })}
                        >
                          {CURATED_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {formatStatusLabel(status)}
                            </option>
                          ))}
                        </select>
                        <input
                          className={styles.editInput}
                          type="text"
                          placeholder="Purpose"
                          value={editDraft.purpose}
                          onChange={(e) => setEditDraft({ ...editDraft, purpose: e.target.value })}
                        />
                        <label className={styles.editCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={editDraft.production}
                            onChange={(e) => setEditDraft({ ...editDraft, production: e.target.checked })}
                          />
                          Production
                        </label>
                        <button className={styles.editSave} disabled={saving} onClick={() => saveEdit(repo.name)}>
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button className={styles.editCancel} onClick={cancelEdit} disabled={saving}>
                          Cancel
                        </button>
                      </div>
                    </td>
                  ) : (
                    <>
                      <td className={styles.cell}>
                        {repo.status ? (
                          <span className={`${styles.badge} ${repo.status === "active" ? styles.badgeActive : styles.badgeMuted}`}>
                            {formatStatusLabel(repo.status)}
                          </span>
                        ) : (
                          <span className={styles.unannotated}>—</span>
                        )}
                        {repo.stale && <span className={styles.staleTag}>STALE</span>}
                      </td>
                      <td className={styles.cell}>
                        {repo.production ? <span className={styles.prod}>PRODUCTION</span> : "—"}
                      </td>
                      <td className={`${styles.cell} ${styles.numCell}`}>{repo.openPRs}</td>
                      <td className={`${styles.cell} ${styles.numCell}`}>{repo.openIssues}</td>
                      <td className={`${styles.cell} ${styles.numCell}`}>{formatRelativeTime(repo.lastActivity)}</td>
                      <td className={styles.cell}>
                        <button className={styles.edit} onClick={() => startEdit(repo)}>
                          Edit
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
