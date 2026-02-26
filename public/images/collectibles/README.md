# Collectibles Asset Layout

Use this structure for all collectible image assets:

- `<type>/<rarity>/...` for rarity buckets:
  - `standard`
  - `common`
  - `uncommon`
  - `rare`
  - `extremely-rare`
  - `testing`
- `<type>/<channel>/...` for acquisition buckets:
  - `starter`
  - `xp-unlocks`
  - `shop`

Types:

- `pets`
- `avatars`
- `ships`
- `objects`

Notes:

- Existing legacy ship images in `/images/ships/*` still work.
- Prefer placing all new collectible art in `/images/collectibles/*`.
