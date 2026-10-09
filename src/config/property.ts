/**
 * Dados da chácara e regras de reserva.
 *
 * ⚠️ VALORES PROVISÓRIOS — confirmar com o cliente (preço, capacidade,
 * horários, endereço, regras). Tudo que é "negócio" fica aqui, num lugar só,
 * para que ajustes não exijam mexer no motor de reservas.
 */
export const property = {
  name: "Chácara Serra Verde",
  tagline: "Sua chácara no coração da natureza",
  description:
    "Um refúgio exclusivo para quem busca descanso, natureza e momentos inesquecíveis. " +
    "Pensada para receber famílias, amigos e grupos com conforto, privacidade e o charme do campo.",
  timeZone: "America/Sao_Paulo",
  address: {
    line: "Endereço a confirmar",
    city: "Cidade — SP",
    mapsUrl: "https://maps.google.com",
    distanceNote: "Aproximadamente 90 min de São Paulo",
  },
  contact: {
    whatsapp: "5511999999999", // só dígitos, com DDI
    email: "contato@exemplo.com.br",
    instagram: "https://instagram.com/",
  },
  checkInTime: "14:00",
  checkOutTime: "12:00",
  highlights: [
    { title: "Piscina com vista", text: "Relaxe com uma vista privilegiada para as montanhas." },
    { title: "Área gourmet", text: "Churrasqueira, forno de pizza e espaço para grandes encontros." },
    { title: "Acomodações confortáveis", text: "Quartos amplos e aconchegantes para toda a família." },
    { title: "Muito verde", text: "Trilhas, árvores e a tranquilidade do campo." },
  ],
  houseRules: [
    "Check-in a partir das 14h e check-out até as 12h.",
    "Respeite a capacidade máxima de hóspedes informada na reserva.",
    "Som moderado após as 22h.",
    "Animais de estimação: a confirmar.",
  ],
} as const;

export interface BookingRules {
  minNights: number;
  maxNights: number;
  bookingWindowDays: number;
  maxGuests: number;
  nightlyRateCents: number;
  cleaningFeeCents: number;
  holdMinutes: number;
}

export const bookingRules: BookingRules = {
  /** Mínimo de noites por reserva. */
  minNights: 2,
  /** Máximo de noites por reserva. */
  maxNights: 30,
  /** Até quantos dias no futuro aceitamos reservas. */
  bookingWindowDays: 365,
  /** Capacidade máxima de hóspedes. */
  maxGuests: 15,
  /** Valor por noite, em centavos (R$ 600,00 — provisório). */
  nightlyRateCents: 60000,
  /** Taxa de limpeza, em centavos (provisório). */
  cleaningFeeCents: 0,
  /** Por quantos minutos as datas ficam seguradas aguardando o pagamento. */
  holdMinutes: 30,
};
