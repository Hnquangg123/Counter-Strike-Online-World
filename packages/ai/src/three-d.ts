import fs from 'node:fs/promises'
import path from 'node:path'
import { fal } from '@fal-ai/client'
import { DEFAULTS } from './config'

export type FigureResult = { path: string; bytes: number; model: string; sourceImage: string }

/**
 * Turn a character/weapon render into a glTF/GLB figure with fal.ai's
 * image-to-3D models (Hunyuan3D, TRELLIS, …). The endpoint id is configurable
 * because these models move fast — check https://fal.ai/models for the current
 * best and set AI_3D_MODEL.
 *
 * The output is a real GLB the site's viewer loads directly.
 */
export async function generateFigure(
  imageUrl: string,
  outDir: string,
  baseName: string,
  model = DEFAULTS.threeD.model,
): Promise<FigureResult> {
  fal.config({ credentials: process.env.FAL_KEY })
  const result = (await fal.subscribe(model, {
    input: { input_image_url: imageUrl, image_url: imageUrl, textured_mesh: true },
    logs: false,
  })) as { data?: Record<string, unknown> }

  const data = result.data ?? {}
  const candidate =
    (data.model_glb as { url?: string } | undefined)?.url ??
    (data.model_mesh as { url?: string } | undefined)?.url ??
    (data.glb as { url?: string } | undefined)?.url ??
    (typeof data.model_url === 'string' ? data.model_url : undefined)
  if (!candidate)
    throw new Error(`No GLB in response from ${model}: ${JSON.stringify(Object.keys(data))}`)

  const bytes = Buffer.from(await (await fetch(candidate)).arrayBuffer())
  await fs.mkdir(outDir, { recursive: true })
  const file = path.join(outDir, `${baseName}.glb`)
  await fs.writeFile(file, bytes)
  return { path: file, bytes: bytes.byteLength, model, sourceImage: imageUrl }
}
