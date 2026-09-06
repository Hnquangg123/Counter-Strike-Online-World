# AI providers — what each one does for the world, and how to get set up

Every AI pipeline in this project goes through the **Vercel AI SDK** (`ai` v7), so providers and models are swappable
configuration, not code. Defaults live in `packages/ai/src/config.ts`; every one can be overridden with an environment
variable (see the table at the end). Run `pnpm ai -- status` to see which keys are present.

Principle: **AI drafts, humans publish.** Every generated text lands as a draft overlay (`data/seed/ai/*.json`) or as a
media file with full provenance (`aiGeneration`: provider, model, prompt, seed). Curated content always wins on merge.
Nothing AI-generated is ever presented as canon without a person looking at it in the Payload studio.

---

## The four you chose

### 1. Anthropic — Claude (text)

**Role in the world**
- `pnpm ai -- enrich`: rewrites wiki text into polished lore prose, taglines, summaries, tags and SEO descriptions, faithful to the facts.
- `pnpm ai -- translate --to vi`: English → Vietnamese for every localized field (taglines, summaries, stories, quotes, abilities).
- Future: "Ask the Archivist" — a RAG chat over the whole archive (embeddings below + Claude with citations).

**Models (Sept 2026)** — defaults: `claude-sonnet-5` for bulk work, `claude-opus-5` behind `--premium` for the final lore pass.
`claude-fable-5-1` is available if you want the strongest model for the most important pages (Anemone, the storyline).
Use Haiku 4.5 for cheap tag-only passes.

**Get a key** — https://console.anthropic.com → API keys → `ANTHROPIC_API_KEY`. Pay-as-you-go; a full enrichment pass over
~200 entities with Sonnet costs on the order of a few dollars; Opus is roughly 5× that.

**Why Claude for text** — best-in-class long-form writing that stays faithful to source material, strong structured output
(we use Zod schemas), and excellent Vietnamese. It is also the engine of the coding assistant building this repo, so the
prompts in `packages/ai/src/prompts.ts` can be iterated in the same conversation.

### 2. OpenAI (images + embeddings)

**Role in the world**
- `pnpm ai -- art --provider openai`: character and weapon key art with `gpt-image-2` — very strong prompt adherence and
  text-free clean renders; accepts reference images for consistency.
- Embeddings (`text-embedding-3-large`) for semantic search — default embedding provider.

**Get a key** — https://platform.openai.com → API keys → `OPENAI_API_KEY`. Image generation requires a verified
organisation. Images cost per output (roughly $0.04–0.25 each depending on quality/size); embeddings are near-free.

**Notes** — `gpt-image-2` is the most "art director-friendly" model for iterative refinement in natural language, and it
handles our long art-direction prompt well. Slower than Flux.

### 3. Google — Gemini image models + embeddings

**Role in the world**
- `pnpm ai -- art --provider google`: `gemini-3.1-flash-image-preview` (the "Nano Banana" line) — fast, cheap, and the
  best at **editing with references**: give it the wiki portrait of Anemone and ask for a new pose/scene and it keeps her
  face and outfit. Ideal for producing a *set* of consistent images per character.
- Embeddings (`gemini-embedding-2`) as an alternative to OpenAI.
- Future: Veo for short cinematic loops behind hero sections (not wired yet — expensive; decide later).

**Get a key** — https://aistudio.google.com → Get API key → `GOOGLE_GENERATIVE_AI_API_KEY`. Generous free tier for
experimentation.

### 4. fal.ai (and Replicate) — Flux images and image-to-3D

**Role in the world**
- `pnpm ai -- art` (default provider): `fal-ai/flux-pro/v1.1-ultra` — the highest-fidelity photoreal/cinematic renders,
  fast (seconds), cheap (~$0.06/image). `fal-ai/flux-pro/kontext/max` is used automatically when you pass `--reference`
  URLs, for character-consistent variations.
- `pnpm ai -- figure --slug anemone --image <render>`: **image → GLB** with Hunyuan3D / TRELLIS-class models so the
  character page's 3D stage shows a real, rotatable figure instead of the hologram placeholder. Verify the current
  endpoint id at https://fal.ai/models (they iterate monthly) and set `AI_3D_MODEL`.
- Replicate is wired as an alternative image host (`black-forest-labs/flux-2-pro`); useful if fal has capacity issues.

**Get a key** — https://fal.ai/dashboard/keys → `FAL_KEY`. https://replicate.com/account/api-tokens → `REPLICATE_API_TOKEN`.
Both are pay-per-second/per-image with no subscription.

---

## Recommended additions (not wired yet — worth a look)

| Provider | What it would add | Why it matters for CSO World | Status |
| --- | --- | --- | --- |
| **Vercel AI Gateway** | One key, one bill, automatic fallback across all of the above | Simplifies ops once deployed on Vercel; set `AI_GATEWAY_API_KEY` and the SDKs route through it | Supported by `config.ts` today |
| **Black Forest Labs — FLUX.2 (direct API)** | Newest Flux family with multi-reference consistency | If you want a Flux-only stack without fal, `@ai-sdk/replicate` already exposes `flux-2-pro`; a direct BFL provider is a small adapter | Consider after the first art batch |
| **Meshy / Tripo3D** | Dedicated 3D generation with rigging and PBR textures | Better topology than generic image-to-3D; Tripo offers rigged characters — could animate idle poses on the stage | Adapter needed (`packages/ai/src/three-d.ts` is the template) |
| **Recraft V3** | Vector/SVG and icon generation | Weapon *icons* in the exact side-profile silhouette style, and UI glyphs, as crisp SVG | Available through fal (`fal-ai/recraft/v3/text-to-image`) |
| **Ideogram Character** | Character-consistent generation from one reference | Another strong option for "same character, many scenes"; on fal as `fal-ai/ideogram/character` | Available through fal |
| **ElevenLabs** | Voice | *Not recommended* for recreating characters' voices (actors' rights). Could narrate the storyline page in an original narrator voice | Decide later |
| **Suno / Udio** | Music | The CSO OST is Nexon's; generating "inspired by" tracks is a legal grey area. Prefer licensing or original compositions | Not recommended |
| **Upscalers (fal `clarity-upscaler`, `aura-sr`)** | 2–4× upscale of small wiki renders | Many wiki assets are 512px; upscaling before display would help hero images | Cheap; add a `pnpm ai -- upscale` command later |

## Environment variables

```
ANTHROPIC_API_KEY=            # Claude
OPENAI_API_KEY=               # gpt-image-2, text-embedding-3-large
GOOGLE_GENERATIVE_AI_API_KEY= # Gemini image + embeddings
FAL_KEY=                      # Flux, Kontext, Hunyuan3D/TRELLIS, Recraft, Ideogram
REPLICATE_API_TOKEN=          # Flux via Replicate
AI_GATEWAY_API_KEY=           # optional: route Anthropic/OpenAI through Vercel AI Gateway

# Overrides (all optional)
AI_TEXT_PROVIDER=anthropic          AI_TEXT_MODEL=claude-sonnet-5      AI_TEXT_PREMIUM_MODEL=claude-opus-5
AI_IMAGE_PROVIDER=fal               AI_IMAGE_MODEL_FAL=fal-ai/flux-pro/v1.1-ultra
AI_IMAGE_EDIT_MODEL_FAL=fal-ai/flux-pro/kontext/max
AI_IMAGE_MODEL_OPENAI=gpt-image-2   AI_IMAGE_MODEL_GOOGLE=gemini-3.1-flash-image-preview
AI_IMAGE_MODEL_REPLICATE=black-forest-labs/flux-2-pro
AI_3D_MODEL=fal-ai/hunyuan3d/v2
AI_EMBEDDING_PROVIDER=openai        AI_EMBEDDING_MODEL_OPENAI=text-embedding-3-large   AI_EMBEDDING_MODEL_GOOGLE=gemini-embedding-2
```

Put keys in `apps/web/.env` (never committed) — the AI CLI reads the same file via `node --env-file`.

## Suggested first session with the tools

1. `pnpm ai -- status` — confirm keys.
2. `pnpm ai -- art --type characters --slug anemone --dry-run` — read the prompt; tweak `packages/ai/src/prompts.ts` until it describes her the way you see her.
3. `pnpm ai -- art --type characters --slug anemone --variant hero` then `--variant portrait --reference <the hero file URL>` for a consistent set.
4. `pnpm ai -- figure --slug anemone --image <hero URL>` — a GLB appears in `data/media/generated/figures/anemone/`; set `model3d` on the character (or let the seed pick it up).
5. `pnpm ai -- enrich --type characters --slug anemone --premium` and `pnpm ai -- translate --type characters --slug anemone --to vi`, then `pnpm seed` and review in `/admin`.
6. Scale up with `--limit 20` batches once the outputs look right.

## Legal note

Characters, weapon designs and music are Nexon's (and Valve's) intellectual property. This archive is a non-commercial
fan tribute: keep attribution, never sell generated art, keep the "unofficial" notice, and treat generated images as fan
art clearly labelled as such (`license: ai-generated` in the media collection). Voice cloning of the original actors is
off the table.
