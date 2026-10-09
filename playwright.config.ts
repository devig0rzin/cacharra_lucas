import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const FAKE_AIRBNB_PORT = 3199;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: "pt-BR",
    timezoneId: "America/Sao_Paulo",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: [
    {
      // "Airbnb" falso servindo um calendário iCal de teste
      command: `node tests/e2e/fake-airbnb.mjs ${FAKE_AIRBNB_PORT}`,
      port: FAKE_AIRBNB_PORT,
      reuseExistingServer: false,
    },
    {
      command: `node scripts/prepare-e2e.mjs && npx next dev -p ${PORT}`,
      port: PORT,
      timeout: 120_000,
      reuseExistingServer: false,
      env: {
        // Nunca deixe o .env.local apontar os testes para o Supabase real.
        DATABASE_URL: "",
        PGLITE_DIR: ".data/e2e",
        SITE_URL: `http://localhost:${PORT}`,
        PAYMENTS_PROVIDER: "mock",
        AIRBNB_ICAL_URL: `http://localhost:${FAKE_AIRBNB_PORT}/airbnb.ics`,
        CRON_SECRET: "e2e-cron-secret-0000000000",
        ICAL_EXPORT_TOKEN: "e2e-export-token-0000000000",
        ADMIN_PASSWORD: "senha-e2e-123",
      },
    },
  ],
});
