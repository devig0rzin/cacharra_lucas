import { expect, test } from "@playwright/test";
import { nextMonthDay } from "./dates.mjs";

const CRON = "e2e-cron-secret-0000000000";
const EXPORT_TOKEN = "e2e-export-token-0000000000";

test.describe.configure({ mode: "serial" });

test("navegação da home é acessível no celular", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Pular para o conteúdo" })).toBeAttached();
  const menu = page.locator('button[aria-controls="mobile-menu"]');
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  // O clique só funciona depois que o React assume a página (hidratação);
  // repete até o menu responder, sem depender de tempo fixo.
  await expect(async () => {
    if ((await menu.getAttribute("aria-expanded")) !== "true") await menu.click();
    await expect(menu).toHaveAttribute("aria-expanded", "true", { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  await expect(page.getByRole("navigation", { name: "Menu móvel" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
});

test("home mostra a busca de datas e leva para a reserva", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator('input[name="entrada"]').fill(nextMonthDay(10));
  await page.locator('input[name="saida"]').fill(nextMonthDay(13));
  await page.getByRole("button", { name: "Ver disponibilidade" }).click();
  await expect(page).toHaveURL(/\/reservar\?entrada=/);
  await expect(page.getByTestId("quote")).toContainText("R$ 1.800,00");
});

test("home apresenta todas as seções previstas sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto("/");
  for (const heading of ["Bem-vindo à Chácara Serra Verde", "Destaques da sua estadia", "Acomodações", "Experiências", "Galeria de fotos", "Localização e como chegar", "Regras da casa", "Fale com a gente"]) {
    await expect(page.getByRole("heading", { name: heading, exact: true })).toBeAttached();
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(360);
});

test("topo no celular: sem botão espremido, selos visíveis e WhatsApp fora do formulário", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  // o botão "Reservar agora" do topo fica no menu, não no cabeçalho (como no mockup)
  await expect(page.locator("header a.button-primary")).toBeHidden();
  // o cartão de reserva não cobre os selos
  const badges = await page.locator(".hero-badges").boundingBox();
  const card = await page.locator(".booking-overlap").boundingBox();
  expect(badges && card && badges.y + badges.height <= card.y).toBeTruthy();
  // o WhatsApp não aparece por cima do formulário; surge depois de rolar
  const whatsapp = page.locator(".whatsapp-button");
  await expect(whatsapp).toHaveAttribute("data-hidden", "true");
  await page.locator("#a-chacara").scrollIntoViewIfNeeded();
  await page.mouse.wheel(0, 900);
  await expect(whatsapp).not.toHaveAttribute("data-hidden", "true");
});

test("reserva completa: datas → dados → pagamento → confirmada", async ({ page }) => {
  // Em `next dev`, a primeira consulta pode inicializar o PGlite e compilar a rota.
  test.setTimeout(120_000);
  await page.goto("/reservar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.locator(`[data-date="${nextMonthDay(10)}"]`).click();
  await page.locator(`[data-date="${nextMonthDay(13)}"]`).click();
  await expect(page.getByTestId("quote")).toContainText("R$ 1.800,00");

  await page.getByLabel("Nome completo").fill("Maria Silva");
  await page.getByLabel("E-mail").fill("maria@example.com");
  await page.getByLabel("WhatsApp").fill("(11) 98888-7777");
  await page.getByRole("button", { name: "Ir para o pagamento" }).click();

  await expect(page).toHaveURL(/pagamento-simulado/);
  await page.getByRole("button", { name: "Aprovar pagamento" }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Reserva confirmada");
  await expect(page.getByTestId("booking-code")).toHaveText(/^SV-/);
  await expect(page.getByRole("link", { name: "Como chegar" })).toHaveAttribute("href", /maps/);
  await expect(page.getByRole("link", { name: "Falar pelo WhatsApp" })).toHaveAttribute("href", /wa\.me/);
});

test("datas reservadas ficam bloqueadas para o próximo hóspede", async ({ page }) => {
  await page.goto("/reservar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  for (const d of [10, 11, 12]) {
    await expect(page.locator(`[data-date="${nextMonthDay(d)}"]`)).toHaveAttribute("data-state", "blocked");
  }
  // o dia da saída (13) fica livre para uma nova entrada
  await expect(page.locator(`[data-date="${nextMonthDay(13)}"]`)).toHaveAttribute("data-state", "free");

  // tentar atravessar a reserva existente não é permitido
  await page.locator(`[data-date="${nextMonthDay(8)}"]`).click();
  await page.locator(`[data-date="${nextMonthDay(12)}"]`).click();
  await expect(page.getByRole("status")).toContainText("noites ocupadas");
});

test("mínimo de 2 noites", async ({ page }) => {
  await page.goto("/reservar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.locator(`[data-date="${nextMonthDay(15)}"]`).click();
  await page.locator(`[data-date="${nextMonthDay(16)}"]`).click();
  await expect(page.getByRole("status")).toContainText("mínimo é de 2 noites");
  await expect(page.getByRole("button", { name: "Ir para o pagamento" })).toHaveCount(0);
});

test("calendário adapta meses e permite selecionar pelo teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reservar");
  await expect(page.locator("[data-calendar-month]:visible")).toHaveCount(1);
  await expect(page.locator(".calendar-grid")).toHaveAttribute("aria-busy", "false");
  const firstFree = page.locator('[data-state="free"][tabindex="0"]').first();
  await firstFree.focus();
  await page.keyboard.press("ArrowRight");
  const focusedDate = await page.locator(":focus").getAttribute("data-date");
  expect(focusedDate).toBeTruthy();
  await page.keyboard.press("Enter");
  await expect(page.locator(`button[data-date="${focusedDate}"]`)).toHaveAttribute("data-state", "selected");
});

test("teclado atravessa o fim do mês sem perder o foco (celular)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/reservar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await expect(page.locator(".calendar-grid")).toHaveAttribute("aria-busy", "false");
  const lastDay = page.locator("[data-calendar-month]:visible button[data-date]").last();
  const lastDate = await lastDay.getAttribute("data-date");
  await lastDay.focus();
  await page.keyboard.press("ArrowRight");
  const nextMonthFirst = await page.evaluate((d) => {
    const dt = new Date(`${d}T00:00:00Z`);
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString().slice(0, 10);
  }, lastDate);
  await expect(page.locator(":focus")).toHaveAttribute("data-date", nextMonthFirst);
  await expect(page.locator("[data-calendar-month]:visible")).toHaveCount(1);
});

test("reserva do site aparece no calendário que o Airbnb importa", async ({ request }) => {
  const res = await request.get(`/api/calendario/${EXPORT_TOKEN}.ics`);
  expect(res.status()).toBe(200);
  const ics = await res.text();
  expect(ics).toContain(`DTSTART;VALUE=DATE:${nextMonthDay(10).replace(/-/g, "")}`);
  expect(ics).toContain(`DTEND;VALUE=DATE:${nextMonthDay(13).replace(/-/g, "")}`);
  expect(ics).not.toContain("Maria");

  expect((await request.get(`/api/calendario/token-errado.ics`)).status()).toBe(404);
});

test("reserva feita no Airbnb bloqueia o site após a sincronização", async ({ page, request }) => {
  expect((await request.post("/api/cron/sincronizar")).status()).toBe(401);
  const sync = await request.post("/api/cron/sincronizar", { headers: { authorization: `Bearer ${CRON}` } });
  expect(sync.status()).toBe(200);
  expect(await sync.json()).toMatchObject({ ok: true, channels: [{ channel: "airbnb", ok: true, events: 1 }] });

  await page.goto("/reservar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  for (const d of [20, 21, 22]) {
    await expect(page.locator(`[data-date="${nextMonthDay(d)}"]`)).toHaveAttribute("data-state", "blocked");
  }
});

test("painel do proprietário exige senha e lista a reserva", async ({ page }) => {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Senha").fill("errada");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByText("Senha incorreta.")).toBeVisible();

  await page.getByLabel("Senha").fill("senha-e2e-123");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page).toHaveURL(/\/admin$/);
  await expect(page.getByText("Maria Silva")).toBeVisible();
  await expect(page.getByText("Confirmada")).toBeVisible();
  await expect(page.getByText("Última sincronização")).toBeVisible();
});

// Capturas para revisão visual (não falham o teste)
test("capturas de tela", async ({ page }) => {
  const dir = process.env.SCREENSHOT_DIR;
  test.skip(!dir, "defina SCREENSHOT_DIR para gerar capturas");
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.screenshot({ path: `${dir}/home-desktop.png` });
  await page.goto("/reservar");
  await page.getByRole("button", { name: "Próximo mês" }).click();
  await page.locator(`[data-date="${nextMonthDay(14)}"]`).click();
  await page.locator(`[data-date="${nextMonthDay(17)}"]`).click();
  await page.screenshot({ path: `${dir}/reservar-desktop.png`, fullPage: true });
  await page.getByLabel("Nome completo").fill("Ana Costa");
  await page.getByLabel("E-mail").fill("ana@example.com");
  await page.getByLabel("WhatsApp").fill("(11) 97777-6666");
  await page.getByRole("button", { name: "Ir para o pagamento" }).click();
  await page.getByRole("button", { name: "Aprovar pagamento" }).click();
  await expect(page.getByTestId("booking-status")).toHaveText("Reserva confirmada");
  const confirmedUrl = page.url();
  await page.screenshot({ path: `${dir}/reserva-confirmada-desktop.png`, fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.screenshot({ path: `${dir}/home-mobile.png` });
  await page.goto("/reservar");
  await page.screenshot({ path: `${dir}/reservar-mobile.png`, fullPage: true });
  await page.goto(confirmedUrl);
  await expect(page.getByTestId("booking-status")).toHaveText("Reserva confirmada");
  await page.screenshot({ path: `${dir}/reserva-confirmada-mobile.png`, fullPage: true });
});
