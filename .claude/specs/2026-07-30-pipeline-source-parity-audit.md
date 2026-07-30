# Audit: source → codex property parity

**Date:** 2026-07-30
**Status:** Reference. Four findings fixed; the rest are outstanding and unactioned.
**Scope:** What `data/pipeline` drops, empties or mangles when converting `data/src/factions/**` into `app/codex/factions/**`.

## Method

Recursive key-path diff of all 417 generated datasheets against their sources (dotted paths, `[]` for array-element merge), plus targeted value-level spot checks per finding. Counts below are whole-corpus, not samples. `data/src/factions/tyranids_old/` excluded.

Related: [2026-07-30-datasheet-pipeline-basics-design.md](2026-07-30-datasheet-pipeline-basics-design.md) — the design that deliberately deferred `mechanics`, `combatState` and loadout parsing. Anything that document already decided is marked *by design* below and is not a finding.

---

## Fixed

| Finding | Fix |
|---|---|
| `unitComposition` stripped entirely; `models[].composition` built by an unsound line-join | Emitted as a first-class array (`transformUnitComposition.ts`); 119 ranges parsed including 11 using a non-breaking hyphen (U+2011) that the old regex read as a fixed count |
| **Every** weapon attribute lost — 0 of 2207 profiles had any | `parseWeaponAttributes.ts` parses the real comma-separated prose format; 1578 profiles now carry 2370 attributes, of which 2101 instances resolve to a mechanic in `weaponAttributeRegistry` |
| `supplement.slug` / `supplement.name` hardcoded to `""` | Read from `raw.supplementSlug`/`raw.supplementName` (added to `RawDatasheet` as optional). All 296 datasheets that have them now match source; the 121 that omit them still default to `""` |
| Detachments kept only `abilities[0]` — 4 of 64 lost 8 abilities between them | Output shape changed from `ability` to `abilities[]` (`ParsedDetachment`); codex total went 64 → 72. Also guards the latent crash on a zero-ability detachment (confirmed: threw `TypeError` reading `.id`) |

---

## Outstanding — silently wrong or empty

These are the dangerous ones: the key exists in the output, so the data looks present.

### 1. `core-stratagems.json` is incomplete *and* duplicated

The source holds **11** distinct `Core`-typed stratagems. The file holds 12 records / 9 unique names, of which only **7** are actually Core. Three independent bugs:

- **Incomplete.** `index.ts:100-102` captures core stratagems "from first datasheet only" rather than unioning across datasheets. Whichever datasheet is processed first doesn't list all 11, so **GRENADE, TANK SHOCK, SMOKESCREEN and GO TO GROUND are absent from the codex entirely.**
- **Duplicated.** `extractCoreStratagems` filters on empty `factionId` *and* empty `detachmentId`, but *Boarding Actions* stratagems also have both empty. COMMAND RE-ROLL, INSANE BRAVERY and COUNTER-OFFENSIVE exist as both a Core and a Boarding Actions record, so each appears twice.
- **Wrong entries.** By the same filter, two names that are *only* Boarding Actions and never Core leak in: **BATTLEFIELD COMMAND** (`'Boarding Actions – Strategic Ploy Stratagem'`) and **EXPLOSIVE CLEARANCE** (`'Boarding Actions – Battle Tactic Stratagem'`).

The only discriminator for all three is the `type` prefix (`'Core – …'` vs `'Boarding Actions – …'`), which `parseStratagemType` (`transformDetachments.ts:14-19`) strips before anything can branch on it — so the fix is to filter on the raw prefix *before* normalising, and union across datasheets rather than trusting the first.

**When fixing, note:** `transformDetachments.test.ts:87` currently asserts that a *Boarding Actions* stratagem **is** extracted as core. That test encodes this bug as expected behaviour and must change alongside the implementation — a failure there is the fix working, not a regression.

---

## Outstanding — dropped relational data

### 2. Per-datasheet `stratagems`, `enhancements`, `detachmentAbilities`

Dropped from datasheet output entirely. **Not** redundant duplication, which is the easy assumption:

| Faction | sheets | distinct `stratagems` sets | distinct `enhancements` sets | distinct `detachmentAbilities` sets |
|---|---|---|---|---|
| space-marines | 298 | 146 | 54 | 61 |
| tyranids | 55 | 35 | 10 | 12 |
| necrons | 64 | 35 | 13 | 20 |

These arrays encode *which detachments each datasheet is eligible for*. The definitions survive in `app/codex/factions/{slug}/detachments/*.json`, but the datasheet → detachment relationship now exists nowhere in the codex. Needs a decision: reconstruct from keywords/restrictions, or carry an explicit eligibility list.

---

## Outstanding — minor drops

| Property | Present in | Notes |
|---|---|---|
| `wargear[].profiles[].profileName` | 20 profiles / 10 datasheets | `'standard'`/`'supercharge'`, `'strike'`/`'sweep'`, `'frag'`/`'krak'`. Recoverable from `name` (`"Plasma pistol - supercharge"`), so cosmetic. |
| `wargear[].line`, `profiles[].lineInWargear` | 417 | Datasheet ordering / profile-to-weapon linkage. |
| `abilities[].id`, `abilities[].factionId` | 417 | Gone for all abilities; no stable identifier survives for cross-referencing. |

---

## Confirmed deliberate — no action

Folded and renamed (nothing lost): `factionId`/`factionSlug` → `faction`; `sourceId`/`sourceName` → `source`; `damagedW`/`damagedDescription` → `damaged`; `leaders`/`leaderHead`/`leaderFooter` → `leader`; `modelCosts` → `pointsCosts` (its `description` parsed into `count`); nested `datasheetId` fields on `keywords`/`unitComposition`.

Intentionally binned: `link`, `virtual`, and `roleLabel` (verified byte-identical to `role` across all 417).

*By design* per the basics design doc: Core/Faction abilities reduced to `{name, type, parameter?}` shells with `description`/`legend` dropped (their rules live in the library); `abilities[].mechanics`, `damaged.mechanics` and `wargear.abilities` all empty; `loadout` and `options` preserved as raw at `wargear.loadouts.*.raw` with `parsed`/`byModelType` empty; no `combatState` emitted.

---

## Adjacent findings (not property loss)

Surfaced by the same audit; recorded here so they aren't rediscovered.

1. **Duplicate datasheet id `000002694`.** Present in both `data/src/factions/tyranids/` and `tyranids_old/`. The pipeline walks both, so 418 source files produce 417 outputs and one silently overwrites the other depending on walk order. Flagged in the basics plan (Task 3 Step 1), not actioned.
2. **`models[].composition` is still the unsound line-join.** `unitComposition` line numbers and `models` line numbers are independent ordinals, not a shared key — 77 of 418 datasheets have more composition lines than statlines. Kill Team Cassius assigns Chaplain Cassius's count to the Kill Team Veteran statline; Crusader Squad gives `NEOPHYTES` the Sword Brother's count of 1 and drops the real `4-8 Neophytes` line. Left in place because the lab currently reads it. Consumers should prefer `unitComposition`.
3. **Attributes with no library rule** — 269 instances / 11 distinct emit correctly but resolve to no mechanic: HAZARDOUS (110), PRECISION (51, a deliberately unregistered stub), ONE SHOT (38), EXTRA ATTACKS (33), INDIRECT FIRE (16), C'TAN POWER (3), CONVERSION (3), HARPOONED (1). Need library JSON files.
4. **Dice-valued attribute parameters don't resolve.** `parseParameterisedName` only matches `\d+`, so `SUSTAINED HITS D3` yields key `sustained-hits-d3` instead of `sustained-hits` + param `D3`. Affects 14 instances (10 `SUSTAINED HITS D3`, 3 `RAPID FIRE D3`, 1 `RAPID FIRE D6`). Blocked on how a dice-valued `$param` flows through a mechanic whose `value` is typed as a number — see ROADMAP item 2.
5. **Two composition lines are `"OR"` separators**, not model groups (Decimus Kill Team, Wolf Scouts). They parse to `min:0, max:0` so they can't inflate a total, but those datasheets hold two *alternative* compositions — summing all lines double-counts them.
6. **`models[].detectionRange`** exists in `TestUnit` but the pipeline never emits it (optional; engine defaults to 15).
