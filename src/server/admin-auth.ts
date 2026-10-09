/**
 * Acesso do proprietário ao painel: senha única + cookie assinado (HMAC).
 * Simples de propósito para o esqueleto. Evolução natural: Supabase Auth
 * (login por e-mail) quando houver mais de uma pessoa administrando.
 */
import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { env } from "./env";

const COOKIE = "sv_admin";
const MAX_AGE_S = 60 * 60 * 12; // 12 horas

function sign(expiresAt: number): string {
  return createHmac("sha256", env().ADMIN_SESSION_SECRET).update(`admin:${expiresAt}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

export function checkPassword(password: string): boolean {
  return safeEqual(password, env().ADMIN_PASSWORD);
}

export async function startAdminSession(): Promise<void> {
  const expiresAt = Date.now() + MAX_AGE_S * 1000;
  (await cookies()).set(COOKIE, `${expiresAt}.${sign(expiresAt)}`, {
    httpOnly: true,
    secure: env().NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_S,
  });
}

export async function endAdminSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

export async function isAdmin(): Promise<boolean> {
  const value = (await cookies()).get(COOKIE)?.value;
  if (!value) return false;
  const [exp, sig] = value.split(".");
  const expiresAt = Number(exp);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now() || !sig) return false;
  return safeEqual(sig, sign(expiresAt));
}

/** Use no topo de toda página e ação do painel. */
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}
