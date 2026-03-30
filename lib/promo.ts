// ── Promo / popup state ───────────────────────────────────────────────────────
//
// State model:
//   "unseen"     — visitor has never interacted with the popup
//   "dismissed"  — visitor closed the popup; respect dismissedUntil cooldown
//   "subscribed" — email captured; never show popup or checkout promo again
//
// Persisted in localStorage under PROMO_KEY.
// The v1 schema (emailSubmitted, popupDismissedAt) is migrated on first read.

export interface PromoState {
  status: "unseen" | "dismissed" | "subscribed";
  /** Unix ms timestamp until when the popup must stay hidden after a dismiss. */
  dismissedUntil: number | null;
  /** Unix ms timestamp of the last time the popup was shown. */
  lastShownAt: number | null;
  /** Promo code saved when user subscribed. */
  promoCode: string | null;
}

const PROMO_KEY = "tierra_promo_v2";

// ── Cooldown helpers ─────────────────────────────────────────────────────────

/** Random cooldown between 3 and 7 days (inclusive), in milliseconds. */
function randomCooldownMs(): number {
  const minDays = 3;
  const maxDays = 7;
  const ms = (minDays + Math.random() * (maxDays - minDays)) * 24 * 60 * 60 * 1000;
  return Math.round(ms);
}

// ── Default / migration ──────────────────────────────────────────────────────

function defaultPromo(): PromoState {
  return { status: "unseen", dismissedUntil: null, lastShownAt: null, promoCode: null };
}

/**
 * Migrate the old v1 shape (emailSubmitted, popupDismissedAt, promoActive, promoCode)
 * to the current v2 shape.
 */
function migrateV1(raw: Record<string, unknown>): PromoState {
  const base = defaultPromo();
  if (raw.emailSubmitted === true) {
    return { ...base, status: "subscribed", promoCode: (raw.promoCode as string) ?? null };
  }
  if (typeof raw.popupDismissedAt === "number") {
    // Preserve the old fixed 3-day cooldown for existing dismissed users
    const cooldown = 3 * 24 * 60 * 60 * 1000;
    return {
      ...base,
      status: "dismissed",
      dismissedUntil: raw.popupDismissedAt + cooldown,
    };
  }
  return base;
}

// ── Persistence ──────────────────────────────────────────────────────────────

export function loadPromo(): PromoState {
  if (typeof window === "undefined") return defaultPromo();
  try {
    // Try v2 first
    const raw2 = localStorage.getItem(PROMO_KEY);
    if (raw2) return JSON.parse(raw2) as PromoState;

    // Try to migrate v1
    const raw1 = localStorage.getItem("tierra_promo_v1");
    if (raw1) {
      const migrated = migrateV1(JSON.parse(raw1) as Record<string, unknown>);
      savePromo(migrated);
      return migrated;
    }
  } catch {
    // Corrupt data — start fresh
  }
  return defaultPromo();
}

export function savePromo(state: PromoState): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PROMO_KEY, JSON.stringify(state));
  } catch {
    // Quota exceeded — fail silently
  }
}

// ── State helpers (return new state, never mutate) ───────────────────────────

/** Mark popup as shown right now. */
export function markShown(state: PromoState): PromoState {
  return { ...state, lastShownAt: Date.now() };
}

/** Dismiss popup and apply a random 3–7 day cooldown. */
export function dismissWithCooldown(state: PromoState): PromoState {
  return {
    ...state,
    status: "dismissed",
    dismissedUntil: Date.now() + randomCooldownMs(),
  };
}

/** Mark user as subscribed and save their promo code. */
export function markSubscribed(state: PromoState, promoCode: string | null): PromoState {
  return { ...state, status: "subscribed", promoCode };
}

// ── Predicates ───────────────────────────────────────────────────────────────

/** True if the full-page popup should be shown to this visitor right now. */
export function shouldShowPopup(state: PromoState): boolean {
  if (state.status === "subscribed") return false;
  if (state.status === "dismissed" && state.dismissedUntil !== null) {
    return Date.now() >= state.dismissedUntil;
  }
  return true;
}

/** True if the user has already subscribed (suppress all promo UI). */
export function isSubscribed(state: PromoState): boolean {
  return state.status === "subscribed";
}
