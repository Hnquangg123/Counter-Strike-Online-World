import { expect, test } from '@playwright/test'
import sharp from 'sharp'

/**
 * Tile treatments (docs/MEDIA_PIPELINE.md). Wiki CDN requests are answered with
 * synthetic images so the test is deterministic and works offline:
 *   files that look like shop/in-game model captures → white studio capture
 *   everything else                                  → transparent cutout
 */
const figure = (background: 'white' | 'clear') =>
  (background === 'clear'
    ? sharp({
        create: {
          width: 400,
          height: 400,
          channels: 4,
          background: { r: 0, g: 0, b: 0, alpha: 0 },
        },
      })
    : sharp({ create: { width: 400, height: 400, channels: 3, background: '#f6f6f4' } })
  )
    .composite([
      {
        input: {
          create: {
            width: 120,
            height: 260,
            channels: 4,
            background: { r: 68, g: 52, b: 44, alpha: 1 },
          },
        },
        left: 140,
        top: 80,
      },
    ])
    .png()
    .toBuffer()

const CAPTURE = /_shopmodel|_ingamemdl|_model\b|_hd\b|Buffclass21s2tr\.png/i

test.describe('entity tiles', () => {
  test.beforeEach(async ({ page }) => {
    const [white, clear] = await Promise.all([figure('white'), figure('clear')])
    await page.route(/static\.wikia\.nocookie\.net/, (route) =>
      route.fulfill({
        status: 200,
        headers: { 'content-type': 'image/png', 'access-control-allow-origin': '*' },
        body: CAPTURE.test(route.request().url()) ? white : clear,
      }),
    )
  })

  test('cutouts stay on the dark stage, white captures get a studio plate', async ({ page }) => {
    await page.goto('/characters', { waitUntil: 'load' })
    const anemone = page.locator('a.group\\/card', { hasText: 'Anemone' }).first()
    await expect(anemone.locator('[data-tone]')).toHaveAttribute('data-tone', 'light', {
      timeout: 15_000,
    })
    await expect(anemone.locator('img')).toHaveClass(/mix-blend-multiply/)
    await expect(anemone.locator('img')).toHaveClass(/object-contain/)

    const oberon = page.locator('a.group\\/card', { hasText: 'Oberon' }).first()
    await expect(oberon.locator('[data-tone]')).toHaveAttribute('data-tone', 'transparent', {
      timeout: 15_000,
    })
    await expect(oberon.locator('img')).not.toHaveClass(/mix-blend-multiply/)
  })

  test('a dead remote image shows the designed fallback, not alt text', async ({ page }) => {
    await page.unroute(/static\.wikia\.nocookie\.net/)
    await page.route(/static\.wikia\.nocookie\.net/, (route) => route.fulfill({ status: 404 }))
    await page.goto('/characters', { waitUntil: 'load' })
    const first = page.locator('a.group\\/card').first()
    await expect(first.locator('.tac-grid')).toBeVisible({ timeout: 15_000 })
    await expect(first.locator('img')).toHaveCount(0)
  })
})
