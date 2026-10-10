# customrules.readysetink.com

Static page, no build step on Vercel. Served from `/customrules/` on the main domain too (handy for previewing).

| File | What |
| --- | --- |
| `formats/*.json` | One file per official format. **Add a format = add a file**, then `python3 public/customrules/build.py`. |
| `formats.json` | Generated bundle of the above. Don't hand-edit. |
| `rules.js` | Deck parsing + legality (no DOM). Base rules live in `BASE`. |
| `app.js` / `app.css` / `index.html` | The UI: tiles, format page, deck image, pull sheet, builder, share links. |
| `test.js` | `node customrules/test.js` — checks the engine against the real card list and all four formats. |

Format fields (all optional except `id`, `name`; `null` = no limit): `blurb`, `rarities`, `maxInks`, `minCards`, `maxCards`, `maxCopies`, `banned` (`{"Name - Version": qty}`, qty ignored for now), `only` (list of names), `text`, `order`.

Hosting: `vercel.json` rewrites `/` and the four asset files to `/customrules/` **only when the host is `customrules.readysetink.com`**; `/card-db.json`, `/img/...` and `/icons/...` fall through to the main site untouched.
