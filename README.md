# Unit Lens — Auto Unit Converter (Chrome Extension)

Automatically rewrites measurements on any web page into the units **you**
prefer. Reading a US recipe but you think in metric? Browsing a hiking site in
miles when you want kilometers? Unit Lens converts them inline as the page
loads, and shows the original value on hover.

Supports six measurement families, each with its own configurable target unit:

| Family       | Detected units                                   |
| ------------ | ------------------------------------------------ |
| Length       | mm, cm, m, km, in, ft, yd, mi                    |
| Mass         | mg, g, kg, t, oz, lb, st                         |
| Temperature  | °C, °F, K                                        |
| Volume       | ml, l, fl oz, cup, pt, qt, gal                   |
| Speed        | m/s, km/h, mph, kn                               |
| Area         | cm², m², km², ha, sq ft, acre, sq mi             |

## Install (unpacked, for development)

1. Open `chrome://extensions` in Chrome (or any Chromium browser).
2. Toggle **Developer mode** on (top-right).
3. Click **Load unpacked** and select this folder
   (`unit-measure-chrome-ext`).
4. Pin the **Unit Lens** icon and click it to choose your target units.
5. Refresh any open tab — measurements are converted on the next load.

## How to use

Click the toolbar icon to open the popup:

- The **master switch** turns all conversions on/off.
- Each row is one measurement family. The **checkbox** enables/disables that
  family; the **dropdown** picks the unit everything in that family converts to.

Settings sync via `chrome.storage.sync`, so they follow your Chrome profile.
Converted values get a subtle dotted underline — hover to see the original.

## Project layout

```
manifest.json        Manifest V3 config
src/units.js         Unit tables, aliases, conversion factors, defaults
src/converter.js     Detection regexes + conversion math (scan/convert)
src/content.js       DOM walker, MutationObserver, inline replacement
src/popup.html/.css/.js   Settings UI
icons/               PNG icons (16/48/128)
test/demo.html       Standalone demo — open in a browser, no install needed
```

## Try it without installing

Open [`test/demo.html`](test/demo.html) directly in a browser. It loads the
real `units.js` / `converter.js` / `content.js` with a tiny `chrome.storage`
shim so you can watch live conversion and flip target units.

## Design notes & known limits

- **One target unit per family.** Picking `m` for length converts `5 km` to
  `5,000 m`; pick `km` if you'd rather large distances stay readable.
- Single-letter unit spellings (`g`, `m`, `l`, `t`) require a space before them
  (`5 g`, not `5g`) so cellular/video terms like `5G` and `4K` aren't mistaken
  for measurements. Multi-letter units (`5kg`) and symbols (`6'2"`) may attach.
- Temperature requires a degree symbol or a spelled-out word, so `5K` stays
  "five thousand" rather than 5 kelvin.
- Editable fields, code blocks, and `<script>`/`<style>` are never touched.
