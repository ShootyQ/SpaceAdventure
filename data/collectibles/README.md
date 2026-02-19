# Collectibles Content System

This folder is the source of truth for collectible content and unlock behavior.

## Files

- `catalog.json`: All collectible item definitions.
- `unlock-rules.json`: Event-driven unlock rules.
- `pools.json`: Weighted loot pools.
- `xp-unlocks.json`: Teacher-configurable XP unlock definitions for avatars/ships.

## Unlock channels

Use one of these channels for each collectible:

- `starter`: Available immediately.
- `chance`: Drop-based unlocks (configured in `unlock-rules.json` / `pools.json`).
- `xp`: Teacher-set XP thresholds (configured per planet).
- `shop`: Reserved for future currency-based unlocks.

## Item IDs

Use stable IDs and never rename old IDs after launch.

Recommended pattern:

- `pet_<slug>`
- `avatar_<slug>`
- `ship_<slug>`
- `object_<slug>`

## Rarity values

- `standard` (starter/default loadout)
- `common`
- `uncommon`
- `rare`
- `extremely-rare`

## Asset paths

Use public-relative paths, for example:

- `/images/collectibles/pets/common/my-pet.png`
- `/images/collectibles/avatars/rare/my-avatar.png`

## Authoring flow

1. Add asset file under `public/images/collectibles/...`
2. Add item to `catalog.json`
3. Add or update a rule in `unlock-rules.json`
4. (Optional) add to `pools.json` if it is part of weighted drops
5. Mark `active: true` when ready

## Notes

The current runtime still supports legacy paths while this content system is being phased in.

For now, legacy ship assets under `/images/ships/*` are still supported in UI components.
New collectible assets should be added under `/images/collectibles/<type>/<bucket>/...`.
