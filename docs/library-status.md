# Library Status Report

_Generated 2026-07-28. Summarises the mechanic library (`app/library/`) against the Library brief — what exists, what's wired into the engine, what was just created, and what remains._

## Legend

| Status | Meaning |
|---|---|
| ✅ **Wired** | Valid and actually loaded/consumed by the engine at runtime |
| 🆕 **Created — unwired** | Authored this pass; valid; not yet added to a folder index (activation is a deliberate one-line edit) |
| ⚪ **Orphaned** | Valid JSON, authored previously, but nothing loads it |
| ⬛ **Stub/empty** | 0-byte or placeholder — not usable |
| ⚠️ **Mismatch** | File exists but its behaviour doesn't match the brief's intent |

**Activation model:** the engine holds no rule lists. Each category is wired through a self-describing library index (`app/library/<category>/index.ts`) — the explicit allowlist. Creating a file does nothing until it's added there; this intentionally keeps unfinished stubs out of runtime.

## Headline

- **Total library files:** 52 (was 46; +6 new files, plus the empty `battle-shock` stub filled).
- **Wired / active:** 24.
- **Created this pass:** 7 (2 ready to activate, 5 pending engine work or sibling wiring).
- **Brief items with no usable file yet:** 13 (all blocked on an engine subsystem or a new effect verb — see below).

---

## By category

### Weapon attributes (18 files)

| File | Status | Notes |
|---|---|---|
| anti, assault, blast, devastating-wounds, heavy, ignores-cover, lance, lethal-hits, melta, pistol, rapid-fire, sustained-hits, torrent, twin-linked | ✅ Wired | In `weapon-attributes/index.ts` (14) |
| cleave | 🆕 Created — unwired | Melee "+1 attack per 5 target models". **Ready** — add to index to activate |
| close-quarters | 🆕 Created — unwired | Grants `shootInEngagement` (as functional as `pistol`) |
| psychic | 🆕 Created — unwired | `ignoreModifier` on hit — needs `resolveHitRoll` to honour `ignoreModifier` |
| precision | ⬛ Empty | Targeting specific models — needs a targeting subsystem |

### Core abilities — `unit-abilities/` (12 files)

| File | Status | Notes |
|---|---|---|
| stealth | ✅ Wired | In `unit-abilities/index.ts`; grants Benefit of Cover (-1 BS) |
| smoke | 🆕 Created — unwired | -1 to **hit** vs a SMOKE-keyword bearer. **Ready** — add to index |
| feel-no-pain | 🆕 Created — unwired | `setsFnp $param`; works via granted path (innate FNP is read directly off datasheets) |
| support | 🆕 Created — unwired | Mirrors `leader` (grants `support`) |
| deadly-demise, fights-first, fly, hover, infiltrators, leader, lone-operative, scouts | ⚪ Orphaned | Authored earlier; not in the index. Some (deadly-demise, fights-first) are combat-consumable if wired; others (infiltrators, scouts, leader) describe deployment/attachment rules with no engine subsystem |

### Combat states — `combat-states/` (3 files)

| File | Status | Notes |
|---|---|---|
| benefit-of-cover | ✅ Wired | Injected by `collectCoreRuleMechanics` + registered as `benefitofcover` |
| battle-shock | 🆕 Created — unwired | Fills the empty stub: OC → 0 when battle-shocked. Definition only — the combat resolver has no OC/scoring phase, and states need injection wiring like cover |
| hidden | ⚠️ Mismatch / orphaned | Currently a `-1 BS` cover-clone; the brief's Hidden (not a valid target outside 15in) needs the targeting subsystem |

### Unit behaviours (11 files)

| File | Status | Notes |
|---|---|---|
| hold, move, advance, fallBack | ✅ Wired | Imported by `restrictionResolver` |
| action, charge, disembark, embark, engage, fight, shoot | ⚪ Orphaned | Defined with `restricts`, but only the four above are consumed |

_All 9 behaviours named in the brief exist._

### Unit tactics (7 files)

| File | Status | Notes |
|---|---|---|
| advance-and-shoot, advance-and-charge, fall-back-and-shoot, fall-back-and-charge | ✅ Wired | In `behaviourRegistry`. **All 4 brief items present** |
| disembark-and-advance, disembark-and-charge, shoot-while-engaged | ⚪ Orphaned | Not in the registry (the disembark pair also lack the `allows` array) |

### Core stratagems (1 file)

| File | Status | Notes |
|---|---|---|
| grenade | ⚪ Orphaned | Stratagems are read from runtime `context.activeStratagems`, not this file |

---

## Created this pass (detail)

Seven files authored from the brief, using current conventions (relative `this*`/`opposing*` entities, `ballisticSkill`/`weaponSkill`, `$param`). None auto-wired.

| File | Ready to activate? |
|---|---|
| `weapon-attributes/cleave.json` | ✅ Yes — add `cleave` to the weapon index; needs a datasheet with the CLEAVE attribute |
| `unit-abilities/smoke.json` | ✅ Yes — add `smoke` to the ability index |
| `weapon-attributes/close-quarters.json` | Grants an unwired sub-ability (`shootInEngagement`), same as `pistol` |
| `unit-abilities/support.json` | Mirrors `leader` (attachment subsystem not modelled) |
| `weapon-attributes/psychic.json` | Needs `resolveHitRoll` to honour `ignoreModifier` (only `resolveSaveRoll` does today) |
| `unit-abilities/feel-no-pain.json` | Works via granted path; reconcile with the direct-from-datasheet FNP read |
| `combat-states/battle-shock.json` | Needs an OC/scoring phase + state-injection wiring |

---

## Not created — blocked on engine capability

Brief items with no usable file, grouped by the capability they require:

- **Deployment / movement subsystem:** Deep strike, Firing deck, (and the positioning halves of Infiltrators, Scouts).
- **Targeting-eligibility / range-to-target subsystem:** Valid target, Hidden (real rule), In Engagement Range, In Objective Range, Precision, Lone operative (proper form).
- **Per-battle usage tracking:** One shot.
- **New effect verb — self-damage roll:** Hazardous.
- **Line-of-sight + "hit capped at 4+" primitive:** Indirect fire.
- **Multi-weapon attack sequencing:** Extra attacks.
- **Already handled elsewhere (no file needed):** Damaged (via `collectDamagedMechanics` from datasheet data).

---

## Recommended next steps

1. **Activate the two ready files** — add `cleave` and `smoke` to their folder indexes and reference them on a test datasheet to verify end-to-end.
2. **Small engine win:** make `resolveHitRoll` honour `ignoreModifier`, which lights up `psychic` (and any future "ignores modifiers" rule).
3. **Pick a subsystem** from the blocked list to unlock a whole cluster at once — the **targeting/range subsystem** would unblock the most brief items (Valid target, Hidden, engagement/objective range, Precision, Lone operative).
