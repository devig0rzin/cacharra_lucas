import { expect, test } from "@playwright/test";

const expectedPhotos = [
  "topo-chacara.jpg",
  "video-capa.jpg",
  "piscina.jpg",
  "natureza.jpg",
  "sala.jpg",
  "por-do-sol.jpg",
];

test("home exibe as seis fotografias sem placeholders", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("Foto aguardada")).toHaveCount(0);

  const loadedSources = await page.locator(".media-frame img").evaluateAll((images) =>
    images.map((image) => {
      const element = image as HTMLImageElement;
      return {
        src: element.currentSrc,
        loaded: element.complete && element.naturalWidth > 0,
      };
    }),
  );

  for (const photo of expectedPhotos) {
    const matches = loadedSources.filter(({ src }) => decodeURIComponent(src).includes(photo));
    expect(matches, `${photo} deve aparecer na página`).not.toHaveLength(0);
    expect(matches.every(({ loaded }) => loaded), `${photo} deve carregar sem erro`).toBe(true);
  }
});

for (const viewport of [
  { width: 375, height: 812 },
  { width: 768, height: 1024 },
  { width: 1440, height: 900 },
]) {
  test(`home preserva o layout e a galeria em ${viewport.width}px`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator(".hero-media img")).toBeVisible();
    const gallery = page.locator(".gallery-grid");
    await gallery.scrollIntoViewIfNeeded();
    await expect(gallery.locator(".media-frame")).toHaveCount(6);
    await expect.poll(async () => gallery.locator("img").evaluateAll((images) =>
      images.every((image) => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0),
    )).toBe(true);
    await expect(page.getByText("Foto aguardada")).toHaveCount(0);

    await page.screenshot({ path: testInfo.outputPath(`home-${viewport.width}.png`), fullPage: true });
  });
}
