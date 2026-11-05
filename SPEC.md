# Dollhouse World PWA: Build Spec for Claude Code

Prepared for Lee Harrison, 4 November 2026. Drop this file into the project root as SPEC.md and tell Claude Code to read it first.

## 1. Goal and scope

A mobile-first 2D dollhouse game, played in the browser and installable as a PWA. Players decorate houses with drag-and-drop furniture, dress characters, collect coins and unlock more items. The inspiration is the Toca Boca World style of play. The art, characters, names and branding must be original or properly licensed.

Version 1 (build first):
- One fully working house with drag-and-drop furniture
- A few whole-character sprites the player can swap between (no layered clothing yet)
- A coin economy: hidden coins to find, a daily gift, item prices in coins
- A mock rewarded-ad flow (no real ad network yet)
- Saves that survive closing the browser
- Installable PWA that works offline

Later (design for it, do not build yet):
- World map with 5 to 10 houses
- Real rewarded-ad provider
- Stripe coin packs (scaffolded in section 11, switched off by a feature flag)

## 2. Stack

| Part | Choice | Why |
|---|---|---|
| Build tool | Vite | Fast dev server, simple config |
| Engine | Phaser 3 | 2D scenes, input, depth sorting, tweens |
| Language | JavaScript with JSDoc comments (TypeScript optional) | Keep it approachable |
| PWA | vite-plugin-pwa (Workbox) | Manifest, service worker, cache versioning |
| Saves | IndexedDB via idb-keyval | More durable than localStorage on iOS Safari |
| Hosting | Vercel (free tier), GitHub-linked | Auto deploys, HTTPS, serverless functions for Stripe later |
| Payments (later) | Stripe Checkout + Vercel serverless functions | No card handling on our side |

Ask before adding any other dependency.

## 3. Working rules for Claude Code

1. Work in the milestones in section 14, in order. Finish and test one before starting the next.
2. Run the dev server and check the result yourself. Report errors and fix them rather than asking me to debug.
3. Make a git commit at the end of each milestone with a clear message.
4. Use placeholder graphics (coloured rectangles with labels) until real assets are in. The game must run end to end with placeholders.
5. Never hard-code item data. Everything comes from catalog.json (section 6).
6. Never commit secrets. API keys go in environment variables only.
7. Keep files small and single-purpose. Explain anything non-obvious in a short comment.
8. Tell me what you changed and how to test it at the end of each step, in plain language. I have no formal coding background.

## 4. Folder structure

```
/dollhouse-pwa/
  index.html
  vite.config.js
  package.json
  SPEC.md
  ASSETS.md <- every pack: source, licence, link
  /public/
    /icons/ <- PWA icons (192, 512, maskable)
    /assets/
      /houses/ <- room background images
      /furniture/ <- one PNG per item
      /characters/
        /body/ /hair/ /outfits/ /accessories/ /poses/
      /ui/ <- buttons, badges, coin icon
      catalog.json <- generated, see section 5
  /src/
    main.js <- Phaser config and boot
    /scenes/
      BootScene.js <- preload, load save, go to menu
      MapScene.js <- world map (stub in v1)
      HouseScene.js <- decorating engine
    /systems/
      Catalog.js <- loads and validates catalog.json
      SaveManager.js <- IndexedDB save/load/migrate
      Economy.js <- coins, prices, purchases
      DragDrop.js <- drag, snap, depth, item actions
      CharacterRig.js <- layered clothing and poses
      CoinHunt.js <- hidden coin spawning and pickup
      DailyGift.js <- timestamp-based gift
      AdManager.js <- provider interface plus mock provider
      PaymentManager.js <- Stripe client, disabled by flag
    /ui/ <- shop drawer, popups, parental gate (DOM)
    config.js <- feature flags
  /api/ <- Vercel serverless functions (Stripe, later)
  /scripts/
    build-manifest.mjs <- scans assets, writes catalog.json
```

## 5. Asset pipeline

The main risk in this project is art that does not match. Build the pipeline so assets can be swapped without code changes.

- Packs are unzipped into public/assets/ under the folders above.
- ASSETS.md records pack name, author, source URL, licence and whether commercial use is allowed. Only commercial-use-safe licences go in the project (CC0, or a paid licence that allows commercial games). Never use non-commercial licences.
- scripts/build-manifest.mjs scans the folders, reads each image's pixel size, and writes or updates catalog.json entries (id from file name, category from folder, default price from category). It must keep any hand-edited fields (name, price, locked state) when re-run.
- Rename messy file names before scanning (sofa_red.png, not IMG_0034.png).
- Later optimisation: pack each house's items into one texture atlas with free-tex-packer-core, loaded when that house opens.
- Background removal and any AI-generated art are done outside the project. Only finished PNGs with transparent backgrounds go in.

Image size guide (art is AI-generated, so these rules keep it usable)
- Backgrounds: about 2560x1440 (16:9) as PNG or WebP, under about 500 KB after compression. Keep anything important inside the centre 80% so wide and narrow phones can crop safely. Floors must be deep enough to place items in front of and behind each other. The first live version may use the existing 1400x770 house image; replace it with sharper room images later.
- Items: transparent PNG or WebP, longest side 300 to 600 px, under about 100 KB each. Use one flat front-on camera angle, one outline weight and the same lighting for every item, and keep relative scale believable (a sofa about three times the width of a chair).
- Characters: whole sprites, about 600 px tall, feet centred on the bottom edge so every sprite shares the same origin.
- House overview vs rooms: the full cutaway house image is only a menu. Each room gets its own full-screen background in the sizes above.
- Upscale any image that comes out small before it goes into the project, and run every item through background removal so edges are clean.
- Record the tool used and its commercial-use terms for each batch of images in ASSETS.md.

## 6. Data model: catalog.json

```json
{
  "economy": {
    "startingCoins": 100,
    "dailyGiftCoins": 25,
    "dailyGiftCooldownHours": 24,
    "adRewardCoins": 20,
    "adCooldownSeconds": 60,
    "coinsPerHouseVisit": { "min": 3, "max": 6 },
    "coinPickupValue": 5
  },
  "houses": [
    {
      "id": "cottage_01",
      "name": "Cozy Cottage",
      "background": "assets/houses/cottage_bg.png",
      "price": 0,
      "floorLine": 820,
      "walkableArea": [0, 780, 1920, 1080]
    }
  ],
  "items": [
    {
      "id": "sofa_red",
      "name": "Red Velvet Sofa",
      "category": "seating",
      "sprite": "assets/furniture/sofa_red.png",
      "price": 0,
      "tintable": true,
      "isSurface": false,
      "seatAnchor": { "x": 0.5, "y": 0.55 },
      "badge": null
    },
    {
      "id": "table_wood",
      "name": "Wooden Table",
      "category": "tables",
      "sprite": "assets/furniture/table_wood.png",
      "price": 40,
      "isSurface": true,
      "surfaceLine": 0.35
    }
  ],
  "characters": {
    "bodies": [{ "id": "body_a", "sprite": "assets/characters/body/body_a.png" }],
    "poses": ["stand", "sit", "lie"],
    "clothing": [
      {
        "id": "coat_red",
        "slot": "outfit",
        "sprite": "assets/characters/outfits/coat_red.png",
        "price": 30
      }
    ]
  }
}
```

Rules: price 0 means free. Prices are always in coins. Add new content by dropping a PNG in the folder, re-running the manifest script, and setting a price. No code change. In v1 the characters section lists whole sprites, one entry each with an id, name, sprite path and price; the layered bodies, poses and clothing fields shown above are for a later milestone.

## 7. Scenes

- BootScene: preload UI assets, load the save, start the menu or the last house.
- MapScene: in v1 a simple screen with one house icon. In v2 an island map with 5 to 10 house icons showing free, locked (price in coins), or NEW. Tapping a house stops this scene and starts HouseScene for that id, freeing memory. Later, each house can hold several rooms: the house overview image is a menu, and tapping a room opens that room's own full-screen background. v1 uses one image as the whole scene.
- HouseScene: background layer, a depth-sorted layer for items and characters, and a UI overlay. Loads only that house's assets.
- DOM overlays (shop drawer, popups, parental gate, settings) are plain HTML/CSS above the canvas. They are easier to make accessible and responsive than in-canvas UI.

UI conventions to follow (copied from successful games in the genre, pattern only): back button top-left, shop and gift top-right, coin counter with a plus button, character switcher bottom-right, red dot on anything new.

## 8. Core systems

### Drag and drop (DragDrop.js)

- Items are dragged from a sliding bottom drawer, filtered by category tabs, onto the house.
- Touch and mouse both work. Minimum touch target 44px.
- Depth: sort by the item's base Y so lower items draw in front. Items dropped on a surface item (isSurface) sit on its surfaceLine and move with it.
- Tapping a placed item shows small buttons: Flip, Delete (returns to drawer, no refund), Tint (cycle preset colours), Bring forward / Send back.
- Items stay inside the house bounds. A dragged item never disappears off-screen.
- Undo for the last action.

### Characters (CharacterRig.js)

- v1: each character is one finished sprite wearing its own outfit, and the player swaps between several characters. Layered clothing (body, hair, outfit, shoes, accessories) is a later milestone; build the rig so layers can be added without rewriting it.
- Every character sprite shares the same origin (feet centred at the bottom), so swapping characters never shifts position.
- v1 has standing sprites only. Sit and lie poses need their own sprites later; until then, dropping a character on a seat or bed just places them there, with no special pose.
- Dropping a character on an item with a seatAnchor snaps them into the sit pose at that anchor (later milestone, once sit sprites exist).

### Life and feedback

- Idle animations: gentle bob or blink on characters, slow float on decorative sprites.
- Tap reactions on items (small squash-and-stretch, sound if sound is added).
- A pet or wandering creature per house, simple random walk within walkableArea.

### Coin hunt (CoinHunt.js)

- On entering a house, spawn coinsPerHouseVisit coins at random positions inside walkableArea and behind or near scenery. Coins sparkle gently.
- Tapping a coin gives coinPickupValue coins with a small animation and updates the counter.
- Coins reset each visit but cap per day so exploring cannot be farmed forever (configurable).

### Daily gift (DailyGift.js)

- A gift icon with a countdown. When ready it shows a red dot. Uses a stored timestamp. Tolerate clock changes: never let the next gift time be in the past by more than the cooldown.

## 9. Save system (SaveManager.js)

- Stored in IndexedDB. On first launch, call navigator.storage.persist() so Safari is less likely to clear data.
- Save object, versioned:

```json
{
  "version": 1,
  "playerId": "uuid-v4",
  "coins": 100,
  "owned": { "items": [], "houses": ["cottage_01"], "clothing": [] },
  "houses": {
    "cottage_01": [
      { "itemId": "sofa_red", "x": 540, "y": 700, "flipX": false, "tint": null, "z": 3 }
    ]
  },
  "characters": { "main": { "body": "body_a", "outfit": "coat_red", "pose": "stand" } },
  "daily": { "nextGiftAt": 0, "coinsFoundToday": 0, "dayKey": "2026-11-05" },
  "purchases": []
}
```

- Autosave after every change (debounced about 500 ms) and when the page is hidden.
- Write a migrate(save) function from day one so future changes do not wipe players' houses.
- Add an Export save / Import save option in settings as a backup.
- Handle corrupted or missing saves without crashing: fall back to a fresh save and keep the old one under a backup key.

## 10. Economy and the ad interface

Coin sources (all free): hidden coins, daily gift, starting balance, and (optionally) a rewarded ad. Coin sinks: buying items, clothing and houses. Prices live in catalog.json.

AdManager.js defines a provider interface:

```js
// Every provider implements this.
// isReady(): boolean
// showRewarded(): Promise<{ completed: boolean }>
```

- MockProvider shows a 5-second countdown modal then resolves { completed: true }. It also supports a test mode that resolves { completed: false } to test the skip path.
- config.js has ADS_ENABLED = false. While false, the shop shows no "watch an ad" option at all.
- When a real network is chosen later, add a new provider file and change one config line. Do not touch game code.
- Rules for any ad flow: always player-initiated, never interrupts play, a cooldown between ads, coins granted only when completed is true, and a clear close/skip path if the ad fails to load.
- Do not use Google AdSense. Candidates for later (to be checked for minimum traffic, child-directed rules and tax paperwork before choosing): AppLixir, AdInPlay, ayeT-Studios, Playgama Ad.

## 11. Payments with Stripe (scaffold only, disabled)

Build this behind PAYMENTS_ENABLED = false. With the flag off, no payment UI is visible and no Stripe script loads. Everything must still work with the flag on in Stripe test mode only until I say otherwise.

Coin packs: defined in catalog.json under coinPacks, for example { "id": "pack_small", "coins": 200, "priceGBP": 199 } (price in pence). The shop shows the real price in pounds clearly next to the coin amount.

Flow (Stripe Checkout, hosted by Stripe, so no card data touches our code):

1. Player passes the parental gate (below), then taps a coin pack.
2. Client calls POST /api/create-checkout-session with { packId, playerId }.
3. The function looks up the pack on the server (never trust the price sent from the client), creates a Checkout Session in GBP with metadata: { playerId, packId }, and returns the session URL.
4. Player pays on Stripe's page and returns to /?checkout=success&session_id=....
5. Stripe calls POST /api/stripe-webhook on checkout.session.completed. The function verifies the webhook signature, then records a credit { sessionId, playerId, coins } in a small server-side store (Vercel KV, Upstash Redis or Supabase; ask me which before adding one).
6. When the player returns, the client calls POST /api/claim-credit with { sessionId, playerId }. The server confirms the credit exists, has not been claimed, and matches the player ID, marks it claimed, and returns the coins. The client then adds them and saves.

Safety and correctness requirements:
- Credits are idempotent. The same session can never grant coins twice.
- Coins are only added after the server confirms. Never from the success URL alone.
- No accounts: the anonymous playerId links purchases to a save. Warn in the UI that clearing browser data can lose coins, and keep the Export save option visible near the shop.
- Environment variables: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, plus the store credentials. Keep a .env.example. Never commit real keys.
- Log failures so I can refund manually if a webhook arrives but the claim fails.

Parental gate (required before any purchase screen):
- A simple adult check, such as answering a hard-enough arithmetic question or entering a parent's email for the receipt. Not just a tap.
- It appears every time, not once per session.
- No external links open without passing it.

Design rules for selling to children:
- Show the real price in money, always visible, before checkout.
- No countdown sales, "last chance" banners, guilt messages, or notifications nagging kids to buy.
- The free route must stay genuinely playable. Packs only speed things up.
- Make no purchases possible by accidental tap: separate buy confirmation step.

To check before turning it on (not legal advice; verify with current official guidance or an accountant): UK consumer rules on virtual currency sold to children (CMA), the ICO Children's Code, VAT registration thresholds and digital-goods VAT rules for a sole trader, and Stripe's own prohibited/restricted rules for selling to minors. Keep refunds and terms of sale on a simple public page.

## 12. Child safety and privacy

Assume children will play, even if the target is families.

- No accounts, no chat, no user-generated text shown to other players, no social features.
- No third-party analytics, tracking pixels, or ad scripts loaded by default. If analytics are added, use a privacy-first option with no personal data and no cookies, and say so in the privacy page.
- Collect no personal data. The only identifier is the random playerId stored on the device.
- Include a simple privacy page and a short "for grown-ups" page linked behind the parental gate.
- No outbound links from the game screen.

## 13. PWA and performance

- Manifest: name, short name, theme colour, display: standalone, orientation: landscape (or any if portrait is supported), icons including maskable.
- Service worker with versioned caches. When a new version is deployed, show a small "New items available, tap to update" prompt rather than silently serving old files.
- Precache the core shell and UI. Cache each house's assets the first time it is opened, then keep for offline.
- Lazy-load per house. Unload a house's textures when leaving it.
- Targets: first load under 3 seconds on a mid-range phone on 4G, stable 60 fps while dragging, under about 150 MB memory.
- Handle orientation change and different aspect ratios with Phaser's scale manager (FIT, centred). Safe-area insets respected for notched phones.
- iOS Safari: test Add to Home Screen, audio unlock on first tap, and no reliance on features iOS lacks.

## 14. Milestones and acceptance tests

### M0: Scaffold and deploy
- Vite + Phaser project runs locally, deploys to Vercel from GitHub, shows a coloured screen.
- Installable on a phone (manifest and service worker working).
- Test: Add to Home Screen on my phone, opens full screen, works in airplane mode after first load.

### M1: One house with placeholders
- Placeholder house background, 10 placeholder items across 3 categories, bottom drawer with tabs.
- Drag, drop, flip, delete, tint, depth ordering, surfaces.
- Test: Furnish the room, close the browser, reopen: everything is where I left it.

### M2: Real assets and manifest script
- Run build-manifest.mjs on the chosen pack. ASSETS.md filled in.
- Test: Adding a new PNG and re-running the script makes it appear in the drawer with no code change.

### M3: Characters (whole sprites)
- Several whole-character sprites with a character picker. Layered clothing and sit and lie poses move to a later milestone.
- Test: Swapping characters never shifts their position or flickers.

### M4: Economy
- Coin counter with plus button, hidden coins, daily gift, prices, purchase flow, mock ad popup (flag-controlled).
- Test: Coins persist across reloads; buying is blocked with too few coins; gift timer survives reload; ad skip path gives no coins.

### M5: World map
- Map screen with several houses, locked ones show price, memory freed when leaving a house.
- Test: Switch between two houses repeatedly without slowdown or leaks.

### M6: Polish
- Idle animations, tap reactions, sound with a mute button, first-time tutorial popup, settings (export/import save, reset), update prompt for new versions.

### M7: Payments (optional, only when I ask)
- Everything in section 11 in test mode first, then live after the pre-launch checks.

## 15. Testing checklist (every milestone)

- Works on a real phone, not just a desktop browser.
- Works installed from the home screen, in portrait and landscape if supported.
- Works offline after first load.
- Clearing the save and starting fresh works.
- No console errors.

## 16. First prompt to paste into Claude Code

Read SPEC.md fully. Start at milestone M0 and complete it: scaffold a Vite + Phaser 3 project with vite-plugin-pwa, set up the folder structure from section 4, add the feature flags in src/config.js (ADS_ENABLED=false, PAYMENTS_ENABLED=false), and deploy-ready config for Vercel. Use placeholder graphics only. Then continue through M1 using the background image I add at public/assets/houses/house_bg.png, commit, and stop so I can test dragging on my phone. After I say go, build M2 to M4 with placeholder sprites, then give me plain-language steps to deploy to Vercel and connect my domain.

## 17. Open decisions

- Which tool makes the AI art (it must allow commercial use, and the style must stay consistent across items)
- Game name and theme for v1 (winter and Christmas, or something else). Avoid any name or art too close to existing games.
- Portrait, landscape, or both
- Whether to add sound and music in v1
- Which ad network to use later, if any
- Which small server-side store to use if Stripe is switched on
