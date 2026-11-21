# Optional painted art

The game draws everything in code. Where the eye lingers, a painted image can stand in:

- `portraits/<character-id>.webp` — 96×96 dialogue portraits (rama, lakshmana, sita, vishvamitra, hanuman, ravana, ...)
- `plates/<kanda>.webp` — kanda cover plates (bala, ayodhya, aranya, kishkindha, sundara, yuddha)

List each file you add in that folder's `index.json` (e.g. `["rama", "sita"]`). Anything not listed
falls back to the drawn version, so the game never asks for a file that isn't there.
