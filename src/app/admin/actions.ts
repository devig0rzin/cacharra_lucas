"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { DatesUnavailableError, InvalidStayError } from "@/modules/booking/errors";
import { checkPassword, endAdminSession, requireAdmin, startAdminSession } from "@/server/admin-auth";
import { getServices } from "@/server/container";

export async function login(_prev: { error?: string }, formData: FormData): Promise<{ error?: string }> {
  if (!checkPassword(String(formData.get("password") ?? ""))) {
    await new Promise((r) => setTimeout(r, 600)); // freia tentativa e erro
    return { error: "Senha incorreta." };
  }
  await startAdminSession();
  redirect("/admin");
}

export async function logout() {
  await endAdminSession();
  redirect("/admin/login");
}

export async function syncNow() {
  await requireAdmin();
  const { channels, bookings } = await getServices();
  await bookings.expireStaleHolds();
  await channels.syncAll();
  revalidatePath("/admin");
}

export async function cancelBooking(formData: FormData) {
  await requireAdmin();
  const { bookings } = await getServices();
  await bookings.cancel(String(formData.get("id")));
  revalidatePath("/admin");
}

export interface BlockState {
  error?: string;
  ok?: boolean;
}

export async function blockDates(_prev: BlockState, formData: FormData): Promise<BlockState> {
  await requireAdmin();
  const { bookings } = await getServices();
  try {
    await bookings.blockDates(
      String(formData.get("checkIn")),
      String(formData.get("checkOut")),
      String(formData.get("note") ?? "") || null,
    );
  } catch (err) {
    if (err instanceof DatesUnavailableError || err instanceof InvalidStayError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin");
  return { ok: true };
}
