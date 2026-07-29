# Parameterised Mechanic Support — Design

## Problem

Weapon attributes like `ANTI-INFANTRY 4+`, `SUSTAINED HITS 2`, `MELTA 2`, and `RAPID FIRE 1` encode parameters in their names. The library JSON templates use placeholders (`$param`, `$keyword`, `$halfRange`, `$critical`) for these values, but the engine has no logic to parse the attribute names or replace the placeholders. These weapon attributes are silently ignored.

## Scope

Engine-side parameterised support for weapon attributes only. Unit ability mechanics arrive at the engine already concrete (parameters resolved in datasheet data), so no engine changes are needed for unit abilities.

## Design Decisions

- All placeholders are resolved at collection time, not at condition resolution time.
- `$critical` is replaced with `6` (hardcoded). A future mechanic that lowers the critical threshold would modify the condition value at resolution time.
- `$halfRange` is computed from `weaponProfile.range / 2` at collection time. Melee weapons (where range is `"Melee"`) are guarded against.
- Parsing and hydration are shared utilities, not coupled to any specific collector.

## New Files

### `app/engine/utils/parseParameterisedName.ts`

Pure function that extracts a lookup key, numeric parameter, and optional keyword from a raw attribute name string.

**Parsing rules (priority order):**

1. Anti pattern — `ANTI-<KEYWORD> <N>+` → `{ key: "anti", param: N, keyword: "KEYWORD" }`
2. Trailing parameter — `<NAME> <N>` or `<NAME> <N>+` → `{ key: "<name-hyphenated>", param: N }`
3. No parameter — everything else → `{ key: "<name-hyphenated>" }`

**Return type:**

```ts
interface ParsedAttribute {
    key: string;
    param?: number | string;
    keyword?: string;
}
```

**Examples:**

```
"ASSAULT"              → { key: "assault" }
"IGNORES COVER"        → { key: "ignores-cover" }
"SUSTAINED HITS 2"     → { key: "sustained-hits", param: 2 }
"ANTI-INFANTRY 4+"     → { key: "anti", param: 4, keyword: "INFANTRY" }
"ANTI-PSYKER 4+"       → { key: "anti", param: 4, keyword: "PSYKER" }
"MELTA 2"              → { key: "melta", param: 2 }
"RAPID FIRE 1"         → { key: "rapid-fire", param: 1 }
```

### `app/engine/utils/hydrateMechanic.ts`

Pure function that deep-clones a template mechanic and replaces all placeholder values.

**Signature:**

```ts
hydrateMechanic(
    template: Mechanic,
    parsed: ParsedAttribute,
    options?: { halfRange?: number }
): Mechanic
```

**Placeholder replacement:**

| Placeholder    | Replaced with              | Source                          |
|----------------|----------------------------|---------------------------------|
| `"$param"`     | `parsed.param`             | Numeric value from name         |
| `"$keyword"`   | `parsed.keyword`           | Keyword from Anti-X             |
| `"$critical"`  | `6`                        | Hardcoded critical threshold    |
| `"$halfRange"` | `options.halfRange`        | `weaponProfile.range / 2`       |

Walks both top-level `value` and all entries in `conditions[]` (both `value` and `keywords[]` fields).

## Modified Files

### `app/engine/collectors/collectWeaponMechanics.ts`

1. Expand the registry to include all weapon attributes: `anti`, `blast`, `assault`, `devastatingwounds`, `heavy`, `ignorescover`, `lance`, `lethalhits`, `melta`, `pistol`, `rapidfire`, `sustainedhits`, `torrent`, `twinlinked`.
2. Replace the simple sanitize-and-lookup with parse-then-lookup-then-hydrate:
   - Call `parseParameterisedName` on the raw attribute string
   - Sanitize `parsed.key` for registry lookup
   - If template found and has placeholders, call `hydrateMechanic`
3. Compute `halfRange` once from `context.weaponProfile.range / 2` (guarding for `"Melee"`).

### `app/engine/collectors/expandWeaponAttributeMechanics.ts`

1. Expand the registry to match `collectWeaponMechanics` (all weapon attributes).
2. Replace the manual `$param` swap with `hydrateMechanic`.
3. Parse the attribute name from `weaponAttributes[]` with `parseParameterisedName` to extract keyword (for Anti-X granted by abilities).

## Testing

### Unit tests — `parseParameterisedName`

- Non-parameterised: `"ASSAULT"` → `{ key: "assault" }`
- Multi-word: `"IGNORES COVER"` → `{ key: "ignores-cover" }`
- Simple param: `"SUSTAINED HITS 2"` → `{ key: "sustained-hits", param: 2 }`
- Anti pattern: `"ANTI-INFANTRY 4+"` → `{ key: "anti", param: 4, keyword: "INFANTRY" }`
- Different keyword: `"ANTI-PSYKER 4+"` → `{ key: "anti", param: 4, keyword: "PSYKER" }`
- Melta: `"MELTA 2"` → `{ key: "melta", param: 2 }`
- Rapid Fire: `"RAPID FIRE 1"` → `{ key: "rapid-fire", param: 1 }`

### Unit tests — `hydrateMechanic`

- Replaces `$param` in top-level value
- Replaces `$keyword` in condition value and keywords array
- Replaces `$critical` with 6
- Replaces `$halfRange` when option provided
- Does not mutate the original template
- Returns template unchanged when no placeholders

### Integration tests — `collectWeaponMechanics`

- `"ANTI-INFANTRY 4+"` → hydrated anti mechanic (value: 4, keyword: INFANTRY in condition)
- `"SUSTAINED HITS 1"` → hydrated mechanic (value: 1, critical condition: 6)
- `"MELTA 2"` → hydrated mechanic (value: 2, halfRange in condition)
- Non-parameterised attributes continue to work

### Integration tests — `expandWeaponAttributeMechanics`

- Ability granting `"SUSTAINED HITS"` with value 2 → hydrated mechanic
