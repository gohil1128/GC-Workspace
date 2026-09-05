import { prisma } from "@/lib/prisma";

/*
  Login throttling.

  The credentials provider had no limit, so a password could be guessed as fast
  as requests could be made. Counters live in the database rather than memory
  because the app runs on serverless instances that do not share state.

  Two keys are checked per attempt:
    email:<address>  — an attack against one account
    ip:<addr>        — spraying one password across many accounts

  Failures older than the window are forgiven, so an honest user who mistypes
  today is not still one attempt from a lockout next week.
*/

const WINDOW_MS = 15 * 60 * 1000; // failures older than this are forgiven
const EMAIL_MAX = 5; // failures per address before lockout
const IP_MAX = 20; // higher: an office or phone network shares one address
const LOCK_MS = 15 * 60 * 1000;
// Repeat offenders get a longer lock. Expressed as a multiple of the key's own
// threshold: a fixed number would trip before IP_MAX and make that limit dead,
// locking a shared office address for an hour after 10 fumbled staff logins.
const LONG_LOCK_MULTIPLE = 2;
const LONG_LOCK_MS = 60 * 60 * 1000;

export type RateLimitState = { locked: true; retryAfterSec: number } | { locked: false };

export function loginKeys(email: string, ip: string | null): string[] {
  const keys = [`email:${email.trim().toLowerCase()}`];
  if (ip) keys.push(`ip:${ip}`);
  return keys;
}

/** Best-effort client address from the proxy chain. */
export function clientIpFrom(headers: Headers): string | null {
  const fwd = headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return headers.get("x-real-ip");
}

/**
 * Is this attempt currently locked out? Checked BEFORE verifying the password,
 * and deliberately identical whether or not the address exists — otherwise the
 * lockout itself would reveal which addresses are real.
 */
export async function checkLoginAllowed(keys: string[]): Promise<RateLimitState> {
  const now = new Date();
  const rows = await prisma.loginAttempt.findMany({ where: { key: { in: keys } } });
  let until: Date | null = null;
  for (const r of rows) {
    if (r.lockedUntil && r.lockedUntil > now && (!until || r.lockedUntil > until)) {
      until = r.lockedUntil;
    }
  }
  if (!until) return { locked: false };
  return { locked: true, retryAfterSec: Math.ceil((until.getTime() - now.getTime()) / 1000) };
}

/** Record a failed attempt against every key, locking once a threshold trips. */
export async function recordLoginFailure(keys: string[], email: string): Promise<void> {
  const now = new Date();
  await Promise.all(
    keys.map(async (key) => {
      const isEmailKey = key.startsWith("email:");
      const max = isEmailKey ? EMAIL_MAX : IP_MAX;
      const existing = await prisma.loginAttempt.findUnique({ where: { key } });

      // Stale counters reset so an old mistake does not linger.
      const stale = existing ? now.getTime() - existing.updatedAt.getTime() > WINDOW_MS : false;
      const failures = (stale || !existing ? 0 : existing.failures) + 1;
      const lockedUntil =
        failures >= max * LONG_LOCK_MULTIPLE
          ? new Date(now.getTime() + LONG_LOCK_MS)
          : failures >= max
            ? new Date(now.getTime() + LOCK_MS)
            : null;

      await prisma.loginAttempt.upsert({
        where: { key },
        create: { key, failures, lockedUntil },
        update: { failures, lockedUntil },
      });
    }),
  );
  void email;
}

/** A correct password clears the record for that address (and its address). */
export async function clearLoginFailures(keys: string[]): Promise<void> {
  await prisma.loginAttempt.deleteMany({ where: { key: { in: keys } } });
}

/** Thrown by `authorize` so the sign-in form can explain the wait. */
export class LoginLockedError extends Error {
  constructor(public retryAfterSec: number) {
    super("LOGIN_LOCKED");
    this.name = "LoginLockedError";
  }
}
