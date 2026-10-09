// Datas usadas nos testes E2E: sempre no mês seguinte ao atual (em São Paulo).
export function nextMonthDay(day) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const y = +today.slice(0, 4);
  const m = +today.slice(5, 7); // próximo mês (0-based = m)
  return new Date(Date.UTC(y, m, day)).toISOString().slice(0, 10);
}
