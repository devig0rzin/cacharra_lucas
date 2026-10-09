"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { DatesUnavailableError, InvalidStayError } from "@/modules/booking/errors";
import { getServices } from "@/server/container";
import { startReservation } from "@/server/reservations";

export interface ReserveState {
  error?: string;
  fieldErrors?: Partial<Record<"guestName" | "guestEmail" | "guestPhone" | "notes", string>>;
  unavailable?: boolean;
  /** muda a cada tentativa, para o calendário recarregar a disponibilidade */
  attempt?: number;
}

export async function reserve(prev: ReserveState, formData: FormData): Promise<ReserveState> {
  const attempt = (prev.attempt ?? 0) + 1;

  // Campo invisível: robôs costumam preencher tudo.
  if (formData.get("website")) return { error: "Não foi possível concluir.", attempt };

  const field = (name: string) => String(formData.get(name) ?? "");
  let checkoutUrl: string;
  try {
    const services = await getServices();
    const result = await startReservation(services, {
      checkIn: field("checkIn"),
      checkOut: field("checkOut"),
      guests: Number(field("guests")),
      guest: {
        guestName: field("guestName"),
        guestEmail: field("guestEmail"),
        guestPhone: field("guestPhone"),
        notes: field("notes"),
      },
    });
    checkoutUrl = result.checkoutUrl;
  } catch (err) {
    if (err instanceof DatesUnavailableError) return { error: err.message, unavailable: true, attempt };
    if (err instanceof InvalidStayError) return { error: err.message, attempt };
    if (err instanceof z.ZodError) {
      const fieldErrors: ReserveState["fieldErrors"] = {};
      for (const issue of err.issues) {
        const key = issue.path[0] as keyof NonNullable<ReserveState["fieldErrors"]>;
        fieldErrors[key] ??= issue.message;
      }
      return { error: "Confira os dados destacados.", fieldErrors, attempt };
    }
    console.error("[reservar] erro inesperado", err);
    return { error: "Não conseguimos iniciar a reserva agora. Tente de novo em instantes ou fale no WhatsApp.", attempt };
  }
  redirect(checkoutUrl);
}
