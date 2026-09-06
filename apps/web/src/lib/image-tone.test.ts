import { describe, expect, it } from 'vitest'
import { classifyTone, probeUrlFor } from './image-tone'

const SIZE = 24

/** Build a SIZE×SIZE RGBA buffer from a per-pixel painter. */
const paint = (px: (x: number, y: number) => [number, number, number, number]) => {
  const data = new Uint8ClampedArray(SIZE * SIZE * 4)
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const [r, g, b, a] = px(x, y)
      const i = (y * SIZE + x) * 4
      data[i] = r
      data[i + 1] = g
      data[i + 2] = b
      data[i + 3] = a
    }
  }
  return data
}

const centre = (x: number, y: number) => x > 6 && x < 18 && y > 4 && y < 22

describe('classifyTone', () => {
  it('flags a shop-model capture on white as light', () => {
    const data = paint((x, y) => (centre(x, y) ? [40, 60, 80, 255] : [250, 250, 248, 255]))
    expect(classifyTone(data, SIZE)).toBe('light')
  })

  it('flags a light-grey studio sweep as light', () => {
    const data = paint((x, y) => (centre(x, y) ? [120, 40, 20, 255] : [222, 222, 220, 255]))
    expect(classifyTone(data, SIZE)).toBe('light')
  })

  it('recognises an official cutout with a transparent border', () => {
    const data = paint((x, y) => (centre(x, y) ? [200, 120, 40, 255] : [0, 0, 0, 0]))
    expect(classifyTone(data, SIZE)).toBe('transparent')
  })

  it('leaves dark artwork and busy screenshots alone', () => {
    const dark = paint(() => [12, 14, 18, 255])
    expect(classifyTone(dark, SIZE)).toBe('dark')
    // A bright but noisy border (e.g. a sky with clouds and buildings) is not a plate.
    const busy = paint((x, y) => ((x + y) % 2 ? [255, 255, 255, 255] : [30, 30, 30, 255]))
    expect(classifyTone(busy, SIZE)).toBe('dark')
  })

  it('returns unknown for empty input', () => {
    expect(classifyTone([], 0)).toBe('unknown')
  })
})

describe('probeUrlFor', () => {
  it('asks the wiki CDN for a 64px rendition', () => {
    expect(
      probeUrlFor({
        id: 'x',
        kind: 'render',
        url: 'https://static.wikia.nocookie.net/cso/images/a/ab/Anemone.png/revision/latest?cb=123',
      }),
    ).toBe(
      'https://static.wikia.nocookie.net/cso/images/a/ab/Anemone.png/revision/latest/scale-to-width-down/64',
    )
  })

  it('uses the smallest local size when available', () => {
    expect(
      probeUrlFor({
        id: 'x',
        kind: 'render',
        url: '/media/anemone.png',
        sizes: {
          card: { url: '/media/anemone-640.png', width: 640 },
          thumb: { url: '/media/anemone-160.png', width: 160 },
        },
      }),
    ).toBe('/media/anemone-160.png')
  })
})
