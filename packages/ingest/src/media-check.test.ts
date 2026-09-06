import { describe, expect, it } from 'vitest'
import { classifyTone, originalUrl, sampleUrl } from './media-check'

const SIZE = 24
const paint = (px: (x: number, y: number) => [number, number, number, number]) => {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++)
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = px(x, y)
      data.set([r, g, b, a], (y * SIZE + x) * 4)
    }
  return data
}
const subject = (x: number, y: number) => x > 6 && x < 18 && y > 4 && y < 22

describe('classifyTone', () => {
  it('detects white studio captures', () => {
    expect(
      classifyTone(paint((x, y) => (subject(x, y) ? [40, 60, 80, 255] : [250, 250, 248, 255]))),
    ).toBe('light')
  })
  it('detects transparent cutouts', () => {
    expect(
      classifyTone(paint((x, y) => (subject(x, y) ? [200, 120, 40, 255] : [0, 0, 0, 0]))),
    ).toBe('transparent')
  })
  it('leaves dark art alone', () => {
    expect(classifyTone(paint(() => [12, 14, 18, 255]))).toBe('dark')
  })
})

describe('urls', () => {
  const url =
    'https://static.wikia.nocookie.net/cso/images/5/55/Buffclass21s2tr.png/revision/latest?cb=1'
  it('samples a small rendition from the wiki CDN', () => {
    expect(sampleUrl(url)).toBe(
      'https://static.wikia.nocookie.net/cso/images/5/55/Buffclass21s2tr.png/revision/latest/scale-to-width-down/128',
    )
    expect(sampleUrl('https://example.com/a.png')).toBe('https://example.com/a.png')
  })
  it('resolves the original', () => {
    expect(originalUrl(url)).toBe(
      'https://static.wikia.nocookie.net/cso/images/5/55/Buffclass21s2tr.png/revision/latest',
    )
  })
})

describe('mediaKind (ingest mappers)', async () => {
  const { mediaKind } = await import('./mappers')
  it('classifies wiki file patterns', () => {
    expect(mediaKind('Buffclass21s2tr.png', 'Anemone', 'portrait', true)).toBe('portrait')
    expect(mediaKind('Buffclass21s2tr_shopmodel.png', 'Shop model', 'portrait')).toBe('render')
    expect(mediaKind('V_mgsm_anemo.png', 'View model', 'render')).toBe('screenshot')
    expect(mediaKind('Anemone_ingamemdl.png', undefined, 'portrait')).toBe('render')
    expect(mediaKind('Choijiyoonicon.png', undefined, 'portrait')).toBe('icon')
    expect(mediaKind('Wall06_800_600.jpg', 'Wallpaper', 'portrait')).toBe('artwork')
    expect(mediaKind('Anemone_voice1.ogg', undefined, 'portrait')).toBe('audio')
    expect(mediaKind('Jacob_msg.png', undefined, 'artwork')).toBe('portrait')
    expect(mediaKind('Buffm2.png', 'M2HB Devastator', 'render', true)).toBe('render')
    // Non-infobox character images with no hint are artwork, not portraits.
    expect(mediaKind('Something.png', 'Season 2 promo', 'portrait')).toBe('artwork')
  })
})
