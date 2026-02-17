# Collectibles Content System

This folder is the source of truth for collectible content and unlock behavior.

## Files

- `catalog.json`: All collectible item definitions.
- `unlock-rules.json`: Event-driven unlock rules.
- `pools.json`: Weighted loot pools.

## Item IDs

Use stable IDs and never rename old IDs after launch.

Recommended pattern:

- `pet_<slug>`
- `avatar_<slug>`
- `ship_<slug>`
- `object_<slug>`

## Rarity values

- `common`
- `rare`
- `very-rare`
- `extremely-rare`
- `legendary`

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
