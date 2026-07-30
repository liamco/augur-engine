# Audit: source → codex property parity

**Date:** 2026-07-30
**Status:** Reference. Five findings fixed; one retracted as wrong (see Adjacent #1). The rest are outstanding and unactioned.
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
| `core-stratagems.json` incomplete, duplicated, non-deterministic | `extractCoreStratagems` now filters on the raw `type` prefix `"Core"`; `index.ts` accumulates across the whole run into a Map keyed by id and writes once from `main()`, sorted by id. Now 11 entries / 11 unique names, matching the source's Core set exactly (0 missing, 0 extra). Writing is skipped on a `--faction`/`--datasheet` run, which previously truncated the file |

---

## Outstanding — dropped relational data

### 1. Per-datasheet `stratagems`, `enhancements`, `detachmentAbilities`

Dropped from datasheet output entirely. The definitions survive in `app/codex/factions/{slug}/detachments/*.json`, but the datasheet → detachment relationship exists nowhere in the codex.

> **Correction.** An earlier revision of this doc cited "146 distinct `stratagems` sets across 298 Space Marine datasheets" and concluded the arrays encode rich per-datasheet eligibility. That counted distinct sets of stratagem *ids*, which vary incidentally. At the level that matters — which **detachments** a datasheet references — Space Marines has only **15** distinct sets, of size 35–39 out of 40. The loss is much smaller than first documented.

#### Detachment eligibility — small, but not reconstructible

| Faction | detachments | effectively universal | genuinely varying |
|---|---|---|---|
| space-marines | 40 | 35 (on 297 of 298 datasheets) | 5 |
| tyranids | 12 | 6 | 6 |
| necrons | 12 | 6 | 6 |

Sole Space Marine outlier: **Kill Team Cassius** (Legends kill team, 2 detachments). The five that vary: Black Spear Task Force (284/298), Saga of the Bold (132), Boarding Strike (112), Terminator Assault (17), Pilum Strike Team (10). Tyranids/Necrons carry proportionally more signal — Crusher Stampede 27/55 down to Infestation Swarm 2/55; Cursed Legion 52/64 down to Deranged Outcasts 5/64.

Not derivable from keywords. Terminator Assault vs the `TERMINATOR` keyword fails both directions — Njal Stormcaller and Terminator Assault Squad have the detachment without the keyword; Wolf Guard Terminators, Deathwatch Terminator Squad, Deathwing Command Squad, Deathwing Strikemaster, Relic Terminator Squad and Marneus Calgar in Armour of Antilochus have the keyword without the detachment. Nor from supplement (Terminator Assault spans codex, dark-angels, space-wolves, black-templars). `PHOBOS` comes closest for Pilum Strike Team (14 have the keyword, 4 of those lack the detachment) but is still inexact. Unclear whether the residue is an unspotted rule or source imperfection.

#### Enhancement eligibility — almost fully reconstructible

| CHARACTER | EPIC HERO | datasheets | enhancement-list size |
|---|---|---|---|
| no | no | 181 | 1–2 |
| no | yes | 2 | 0 |
| yes | no | 58 | 78–103 |
| yes | yes | 57 | 0 |

`CHARACTER && !EPIC HERO` reconstructs the eligible pool exactly for 115 of 298 datasheets — the zero on every Epic Hero is the 10th-ed rule that Epic Heroes cannot take Enhancements. The only real loss is the 1–2 entries on the 181 non-character datasheets (e.g. Eliminator Squad ← *Calibanite Armaments*).

#### Proposed shape (deferred)

Store exceptions on the **detachment**, not the datasheet — 35 of 40 collapse to nothing:

```json
{ "name": "Gladius Task Force",  "eligibleDatasheets": "all" }
{ "name": "Terminator Assault",  "eligibleDatasheets": { "include": ["000000123", "…"] } }
```

Exhaustive storage is ~11,000 pairs on either side; as `all`/`include`/`exclude` it collapses to five short lists plus one exclusion. Detachment files already exist, are slug-keyed, and are regenerated each run. For enhancements, derive from `CHARACTER`/`EPIC HERO` and carry only the non-character residue.

**Deferred:** nothing consumes detachments yet. This becomes concrete when the detachment-points list building in `todo.md` lands, since that needs to know which units a detachment can take.

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

1. ~~**Duplicate datasheet id `000002694`.**~~ **Retracted — this was wrong.** `index.ts:15` declares `IGNORE_FACTIONS = new Set(["tyranids_old"])` and the faction walk filters on it, so `tyranids_old/` is never processed. It holds exactly one datasheet, which is the whole of the 418-source → 417-output gap. Handled by design; nothing to fix.
2. **`models[].composition` is still the unsound line-join.** `unitComposition` line numbers and `models` line numbers are independent ordinals, not a shared key — 77 of 418 datasheets have more composition lines than statlines. Kill Team Cassius assigns Chaplain Cassius's count to the Kill Team Veteran statline; Crusader Squad gives `NEOPHYTES` the Sword Brother's count of 1 and drops the real `4-8 Neophytes` line. Left in place because the lab currently reads it. Consumers should prefer `unitComposition`.
3. **Attributes with no library rule** — 269 instances / 11 distinct emit correctly but resolve to no mechanic: HAZARDOUS (110), PRECISION (51, a deliberately unregistered stub), ONE SHOT (38), EXTRA ATTACKS (33), INDIRECT FIRE (16), C'TAN POWER (3), CONVERSION (3), HARPOONED (1). Need library JSON files.
4. **Dice-valued attribute parameters don't resolve.** `parseParameterisedName` only matches `\d+`, so `SUSTAINED HITS D3` yields key `sustained-hits-d3` instead of `sustained-hits` + param `D3`. Affects 14 instances (10 `SUSTAINED HITS D3`, 3 `RAPID FIRE D3`, 1 `RAPID FIRE D6`). Blocked on how a dice-valued `$param` flows through a mechanic whose `value` is typed as a number — see ROADMAP item 2.
5. **Two composition lines are `"OR"` separators**, not model groups (Decimus Kill Team, Wolf Scouts). They parse to `min:0, max:0` so they can't inflate a total, but those datasheets hold two *alternative* compositions — summing all lines double-counts them.
6. **`models[].detectionRange`** exists in `TestUnit` but the pipeline never emits it (optional; engine defaults to 15).
