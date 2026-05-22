"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { signIn, signOut } from "@/lib/auth";
import { setActiveLocation } from "@/lib/scope";

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
  try {
    await signIn("credentials", {
      email: parsed.data.email,
      password: parsed.data.password,
      redirect: false,
    });
  } catch {
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
