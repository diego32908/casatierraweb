"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/client";
import { endAdminSession } from "@/app/actions/admin-auth";
import type { AdminSessionRow } from "@/lib/admin-security";

function formatRelative(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)   return "just now";
  if (mins  < 60)  return `${mins}m ago`;
  if (hours < 24)  return `${hours}h ago`;
  return `${days}d ago`;
}

function parseUA(ua: string | null): string {
  if (!ua) return "Unknown device";
  if (/iPhone|iPad/.test(ua))   return "iOS Safari";
  if (/Android/.test(ua))       return "Android";
  if (/Chrome/.test(ua))        return "Chrome";
  if (/Firefox/.test(ua))       return "Firefox";
  if (/Safari/.test(ua))        return "Safari";
  if (/curl|python|node/i.test(ua)) return "API client";
  return "Browser";
}

export default function AdminSecurityPage() {
  const router = useRouter();

  const [sessions, setSessions]           = useState<AdminSessionRow[] | null>(null);
  const [sessionsError, setSessionsError] = useState(false);
  const [isPending, startTransition]      = useTransition();
  const [result, setResult]               = useState<string | null>(null);
  const [error,  setError]                = useState<string | null>(null);

  // Load sessions on mount
  useEffect(() => {
    fetch("/api/admin/sessions")
      .then((r) => r.json())
      .then((d: { sessions: AdminSessionRow[] }) => setSessions(d.sessions))
      .catch(() => setSessionsError(true));
  }, []);

  function refreshSessions() {
    setSessions(null);
    setSessionsError(false);
    fetch("/api/admin/sessions")
      .then((r) => r.json())
      .then((d: { sessions: AdminSessionRow[] }) => setSessions(d.sessions))
      .catch(() => setSessionsError(true));
  }

  function runKill(keepCurrent: boolean) {
    setResult(null);
    setError(null);

    startTransition(async () => {
      try {
        const res  = await fetch("/api/admin/kill-switch", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ keepCurrent }),
        });
        const data = (await res.json()) as { ok?: boolean; killed?: number; error?: string };

        if (!res.ok || data.error) {
          setError(data.error ?? "Failed. Please try again.");
          return;
        }

        if (!keepCurrent) {
          await endAdminSession();
          await supabaseBrowser.auth.signOut();
          router.replace("/admin/login?reason=kill_switch");
        } else {
          setResult(`${data.killed ?? 0} other session(s) terminated.`);
          refreshSessions();
        }
      } catch {
        setError("Unexpected error. Please try again.");
      }
    });
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-[11px] font-semibold uppercase tracking-[0.22em] text-stone-500">
        Security
      </h1>

      {/* ── Active Sessions ─────────────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-stone-900 mb-4">Active sessions</h2>

        {sessions === null && !sessionsError && (
          <p className="text-xs uppercase tracking-widest text-stone-400 py-6 text-center">
            Loading…
          </p>
        )}

        {sessionsError && (
          <p className="text-sm text-red-600 border border-red-200 bg-red-50 px-4 py-3">
            Could not load sessions. Refresh the page to try again.
          </p>
        )}

        {sessions !== null && sessions.length === 0 && (
          <p className="text-sm text-stone-500 border border-stone-100 bg-stone-50 px-4 py-4">
            No active sessions found.
          </p>
        )}

        {sessions !== null && sessions.length > 0 && (
          <div className="border border-stone-200 bg-white divide-y divide-stone-100">
            {sessions.map((s) => (
              <div key={s.id} className="px-5 py-4 flex items-start justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-stone-900">
                      {parseUA(s.user_agent)}
                    </span>
                    {s.isCurrent && (
                      <span className="inline-block rounded-full bg-stone-900 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white">
                        This session
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-400 truncate">
                    IP: {s.ip_address ?? "unknown"}
                  </p>
                  <p className="text-xs text-stone-400">
                    Started {formatRelative(s.created_at)} · Active {formatRelative(s.last_active_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Session Policy ──────────────────────────────────────────────── */}
      <section className="border border-stone-100 bg-stone-50 p-5 space-y-2 text-xs text-stone-500 leading-relaxed">
        <p>
          <strong className="text-stone-700">Inactivity timeout:</strong>{" "}
          Sessions automatically end after <strong className="text-stone-700">30 minutes</strong> of inactivity.
        </p>
        <p>
          <strong className="text-stone-700">Hard expiry:</strong>{" "}
          Sessions expire after 2 hours regardless of activity.
        </p>
        <p>
          <strong className="text-stone-700">Single session:</strong>{" "}
          Signing in from a new device ends the previous session.
        </p>
        <p>
          <strong className="text-stone-700">Alerts:</strong>{" "}
          Every admin login and security event sends an email to the alert address on file.
        </p>
      </section>

      {/* ── Kill Other Sessions ─────────────────────────────────────────── */}
      <section className="border border-stone-200 bg-white p-6">
        <h2 className="text-sm font-semibold text-stone-900 mb-1">
          Log out other sessions
        </h2>
        <p className="text-sm text-stone-500 mb-5 leading-relaxed">
          Immediately invalidates all active admin sessions <em>except</em> this
          one. Use this if you suspect unauthorized access from another device.
          You will remain signed in.
        </p>
        <button
          onClick={() => runKill(true)}
          disabled={isPending}
          className="rounded border border-stone-900 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-stone-900 hover:bg-stone-900 hover:text-white transition-colors disabled:opacity-50"
        >
          {isPending ? "Working…" : "Log Out Other Sessions"}
        </button>
      </section>

      {/* ── Danger Zone ─────────────────────────────────────────────────── */}
      <section className="border border-red-200 bg-red-50 p-6">
        <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-red-400 mb-3">
          Danger Zone
        </p>
        <h2 className="text-sm font-semibold text-red-900 mb-1">
          Kill all sessions
        </h2>
        <p className="text-sm text-red-700 mb-5 leading-relaxed">
          Immediately invalidates <strong>every</strong> active admin session,
          including this one. You will be signed out and redirected to login.
          Use this only if your credentials may be compromised.
        </p>
        <button
          onClick={() => {
            if (!window.confirm(
              "This will end ALL admin sessions including yours.\n\nYou will be logged out immediately.\n\nContinue?"
            )) return;
            runKill(false);
          }}
          disabled={isPending}
          className="rounded border border-red-700 bg-red-700 px-5 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-white hover:bg-red-800 transition-colors disabled:opacity-50"
        >
          {isPending ? "Working…" : "Kill All Sessions"}
        </button>
      </section>

      {/* ── Feedback ────────────────────────────────────────────────────── */}
      {result && (
        <p className="text-sm text-stone-600 border border-stone-200 bg-white px-4 py-3">
          ✓ {result}
        </p>
      )}
      {error && (
        <p className="text-sm text-red-700 border border-red-200 bg-red-50 px-4 py-3">
          {error}
        </p>
      )}
    </div>
  );
}
