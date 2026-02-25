# Collectibles Content System

This folder stores the base collectible definitions used by the app.

Runtime uses a hybrid model:

- Base defaults from this folder (in git)
- Live overrides from Firestore (`game-config/*`)

## Files

- `catalog.json`: Collectible identity/metadata (active items and assets).
- `xp-unlocks.json`: Baseline unlock config for starter + XP channels.
- `unlock-rules.json`: Legacy chance rule definitions (transitioning to unified config).
- `pools.json`: Legacy weighted pools (transitioning to unified config).

## Unlock channels

Use exactly one channel for each collectible:

- `starter`: Available immediately.
- `xp`: Teacher-set XP thresholds (configured per planet).
- `chance`: Drop-based unlocks.
- `shop`: Currency-based unlocks.

Do not assign the same item to multiple channels.

## Item IDs

Use stable IDs and never rename old IDs after launch.

Canonical format (new items):

- `ship_<slug>`
- `avatar_<slug>`
- `pet_<slug>`
- `object_<slug>`

Legacy IDs are still supported during migration.

## Rarity values

- `standard` (starter/default loadout)
- `common`
- `uncommon`
- `rare`
- `extremely-rare`

## Asset paths

Use public-relative paths under type-first folders:

- `/images/collectibles/ships/<variant>/my-ship.png`
- `/images/collectibles/avatars/<variant>/my-avatar.png`
- `/images/collectibles/pets/<variant>/my-pet.png`
- `/images/collectibles/objects/<variant>/my-object.png`

`<variant>` can represent rarity or acquisition bucket (for example `starter`, `shop`, `common`, `rare`).

## Authoring flow

1. Add asset file under `public/images/collectibles/<type>/<variant>/...`
2. Add item metadata to `catalog.json`
3. Assign exactly one unlock channel in config
4. If channel is `xp`, set the unlock rule in `xp-unlocks.json` (or Firestore override)
5. Mark `active: true` when ready

## Notes

The runtime currently supports legacy paths and IDs while migration completes.

For now, some hardcoded registries still exist for ships/avatars. New assets should always be added under `/images/collectibles/<type>/<variant>/...`.
