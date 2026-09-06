# @csow/sdk

Typed TypeScript/JavaScript client for the **Counter-Strike Online World** public API (v1).

```ts
import { CsowClient } from '@csow/sdk'

const csow = new CsowClient({ baseUrl: 'https://csow.world', locale: 'en' })

// One entity
const anemone = await csow.characters.get('anemone')
console.log(anemone.tagline, anemone.grade, anemone.signatureWeapon?.name)

// Filtered, paginated lists
const transcendent = await csow.weapons.list({ grade: 'transcendent', limit: 12 })

// Walk every page lazily
for await (const chapter of csow.scenarios.iterate({ gameMode: 'zombie-scenario' })) {
  console.log(chapter.season, chapter.chapter, chapter.name)
}

// Search the whole world
const hits = await csow.search('rex', { types: ['characters', 'factions'] })

// Vietnamese text
const viAnemone = await csow.characters.get('anemone', { locale: 'vi' })
```

Every resource (`characters`, `weapons`, `scenarios`, `gameModes`, `maps`, `factions`, `music`) exposes `list()`, `get(slug)`, `iterate()` and `all()`. Errors are thrown as `CsowApiError` with `status` and `code`.

The interactive API reference lives at `/api/v1/docs` on any deployment and the OpenAPI 3.1 document at `/api/v1/openapi.json`.

## Licence

Code: MIT. Content served by the API is adapted from the Counter-Strike Online Wiki under CC BY-SA 3.0 — keep the `wikiSource` attribution when you republish it. Counter-Strike Online World is an unofficial fan project, not affiliated with Nexon or Valve.
