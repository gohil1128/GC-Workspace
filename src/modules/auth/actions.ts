"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { setActiveLocation } from "@/lib/scope";
import { checkLoginAllowed, clientIpFrom, loginKeys } from "@/modules/auth/rate-limit";
import { headers } from "next/headers";

function waitText(sec: number): string {
  const mins = Math.ceil(sec / 60);
  return mins <= 1 ? "a minute" : `${mins} minutes`;
}

const loginSchema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Password too short"),
});

export async function loginAction(_prev: unknown, formData: FormData) {
  const raw = Object.fromEntries(formData);
  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  // Read the lock here too, so the form can say how long to wait instead of
  // repeating "invalid password" at someone who is already locked out.
  const ip = clientIpFrom(await headers());
  const keys = loginKeys(parsed.data.email, ip);
  const pre = await checkLoginAllowed(keys);
  if (pre.locked) {
    return { error: `Too many attempts. Try again in ${waitText(pre.retryAfterSec)}.` };
  }

  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch (err) {
    // authorize() throws LoginLockedError when this attempt trips the limit.
    if (err instanceof Error && /LOGIN_LOCKED/.test(err.message)) {
      const now = await checkLoginAllowed(keys);
      const wait = now.locked ? waitText(now.retryAfterSec) : "a few minutes";
      return { error: `Too many attempts. Try again in ${wait}.` };
    }
    const after = await checkLoginAllowed(keys);
    if (after.locked) {
      return { error: `Too many attempts. Try again in ${waitText(after.retryAfterSec)}.` };
    }
    return { error: "Invalid email or password." };
  }
  redirect("/dashboard");
}

export async function signOutAction() {
  await signOut({ redirectTo: "/login" });
}

export async function switchLocationAction(locationId: string) {
  if (!locationId) return;
  await setActiveLocation(locationId);
}

export async function requestPasswordResetAction(_prev: unknown, formData: FormData) {
  const email = String(formData.get("email") ?? "");
  if (!z.string().email().safeParse(email).success) {
    return { error: "Enter a valid email." };
  }
  // Placeholder — production would send email via transactional provider.
  return { ok: true };
}
