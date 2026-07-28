# Library Registry Single-Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicated weapon-attribute registry and make rule *activation* a single, logic-free, one-line edit in a dedicated manifest per library category — while keeping the explicit allowlist that stops unfinished stub files from going live.

**Architecture:** Extract each hand-maintained registry (`weaponAttributeRegistry`, `abilityRegistry`) into its own manifest module that only maps a lookup key → imported library JSON. The collector/expander functions import the manifest instead of declaring it inline. A guard test validates every manifested entry so a broken/stub file can't be wired silently.

**Tech Stack:** TypeScript, Vitest.

## Context (why)

Two residual pain points from the thin-engine review:
1. **Activating a finished rule costs an engine edit.** We deliberately keep an *explicit allowlist* (so half-finished stub JSON files don't auto-activate), but today the allowlist is entangled with engine logic and, for weapon attributes, duplicated. The goal is to keep the gate but make activation a single, obvious, data-like edit.
2. **The weapon-attribute registry is duplicated verbatim** in `collectWeaponMechanics.ts` and `expandWeaponAttributeMechanics.ts` — adding a weapon rule means editing the same 14-entry map twice.

We are **not** auto-loading directories: that would activate stub files. The manifest stays explicit — just single-sourced, logic-free, and consistent across categories.

## Global Constraints

- **Commits are user-gated:** do NOT commit automatically; perform commit steps only on the user's explicit go-ahead.
- **Behaviour-preserving:** these are refactors. The existing suite is the safety net — it must stay green (currently 153 tests). Typecheck (`npx tsc --noEmit`) must show only the 8 pre-existing `operatorEvaluator` errors.
- **Test runner:** `npx vitest run [path]`.

---

### Task 1: Single-source the weapon-attribute registry

**Files:**
- Create: `app/engine/collectors/weaponAttributeRegistry.ts`
- Modify: `app/engine/collectors/collectWeaponMechanics.ts` (remove local imports+map, import the manifest)
- Modify: `app/engine/collectors/expandWeaponAttributeMechanics.ts` (same)
- Safety net: `app/engine/collectors/__tests__/collectWeaponMechanics.test.ts`, `app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts` (existing — must stay green)

**Interfaces:**
- Produces: `export const weaponAttributeRegistry: Record<string, Mechanic>` — keyed by the sanitised attribute key (matches `parseParameterisedName(attrName).key`), value is the library mechanic template.

- [ ] **Step 1: Create the manifest module**

```ts
// app/engine/collectors/weaponAttributeRegistry.ts
import { Mechanic } from "@/app/types/Mechanic";

import anti from "@/app/library/weapon-attributes/anti.json";
import assault from "@/app/library/weapon-attributes/assault.json";
import blast from "@/app/library/weapon-attributes/blast.json";
import devastatingWounds from "@/app/library/weapon-attributes/devastating-wounds.json";
import heavy from "@/app/library/weapon-attributes/heavy.json";
import ignoresCover from "@/app/library/weapon-attributes/ignores-cover.json";
import lance from "@/app/library/weapon-attributes/lance.json";
import lethalHits from "@/app/library/weapon-attributes/lethal-hits.json";
import melta from "@/app/library/weapon-attributes/melta.json";
import pistol from "@/app/library/weapon-attributes/pistol.json";
import rapidFire from "@/app/library/weapon-attributes/rapid-fire.json";
import sustainedHits from "@/app/library/weapon-attributes/sustained-hits.json";
import torrent from "@/app/library/weapon-attributes/torrent.json";
import twinLinked from "@/app/library/weapon-attributes/twin-linked.json";

/**
 * The active weapon-attribute allowlist. To activate a finished
 * weapon-attribute rule, add ONE import above and ONE line here.
 */
export const weaponAttributeRegistry: Record<string, Mechanic> = {
    anti: anti as unknown as Mechanic,
    assault: assault as unknown as Mechanic,
    blast: blast as unknown as Mechanic,
    "devastating-wounds": devastatingWounds as unknown as Mechanic,
    heavy: heavy as unknown as Mechanic,
    "ignores-cover": ignoresCover as unknown as Mechanic,
    lance: lance as unknown as Mechanic,
    "lethal-hits": lethalHits as unknown as Mechanic,
    melta: melta as unknown as Mechanic,
    pistol: pistol as unknown as Mechanic,
    "rapid-fire": rapidFire as unknown as Mechanic,
    "sustained-hits": sustainedHits as unknown as Mechanic,
    torrent: torrent as unknown as Mechanic,
    "twin-linked": twinLinked as unknown as Mechanic,
};
```

- [ ] **Step 2: Point `collectWeaponMechanics.ts` at the manifest**

Delete the 14 `import ... from "@/app/library/weapon-attributes/..."` lines (7–20) and the local `weaponAttributeRegistry` const (22–37). Add near the other imports:
```ts
import { weaponAttributeRegistry } from "./weaponAttributeRegistry";
```
Leave the rest of the file unchanged (it already references `weaponAttributeRegistry[parsed.key]`).

- [ ] **Step 3: Point `expandWeaponAttributeMechanics.ts` at the manifest**

Same edit: delete the 14 library imports (8–21) and the local `weaponAttributeRegistry` const (23–38); add:
```ts
import { weaponAttributeRegistry } from "./weaponAttributeRegistry";
```

- [ ] **Step 4: Verify behaviour unchanged**

Run: `npx vitest run app/engine/collectors/__tests__/collectWeaponMechanics.test.ts app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts`
Expected: PASS (same as before — 9 + 5 tests).

- [ ] **Step 5: Commit** (on the user's go-ahead)

```bash
git add app/engine/collectors/weaponAttributeRegistry.ts app/engine/collectors/collectWeaponMechanics.ts app/engine/collectors/expandWeaponAttributeMechanics.ts
git commit -m "refactor(engine): single-source the weapon-attribute registry"
```

---

### Task 2: Extract the ability registry into its own manifest

**Files:**
- Create: `app/engine/collectors/abilityRegistry.ts`
- Modify: `app/engine/collectors/expandAbilityMechanics.ts` (remove the inline registry + its two library imports, import the manifest)
- Safety net: existing stealth/cover suites must stay green.

**Interfaces:**
- Produces: `export const abilityRegistry: Record<string, Mechanic>` — keyed by the sanitised ability name (as produced by `expandAbilityMechanics`'s `sanitize()`), value is the library mechanic.

- [ ] **Step 1: Create the manifest module**

```ts
// app/engine/collectors/abilityRegistry.ts
import { Mechanic } from "@/app/types/Mechanic";
import stealth from "@/app/library/unit-abilities/stealth.json";
import benefitOfCover from "@/app/library/combat-states/benefit-of-cover.json";

/**
 * The active unit-ability allowlist (keyed by sanitised ability name).
 * To activate a finished ability, add ONE import above and ONE line here.
 */
export const abilityRegistry: Record<string, Mechanic> = {
    stealth: stealth as unknown as Mechanic,
    benefitofcover: benefitOfCover as unknown as Mechanic,
};
```

- [ ] **Step 2: Point `expandAbilityMechanics.ts` at the manifest**

Delete the two library imports (`stealth`, `benefitOfCover`) and the inline `abilityRegistry` const (lines 5–11). Add near the top:
```ts
import { abilityRegistry } from "./abilityRegistry";
```
The `sanitize()` helper and the rest of the function stay unchanged.

- [ ] **Step 3: Verify behaviour unchanged**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.stealth.test.ts app/engine/pipeline/__tests__/runCombat.cover.test.ts`
Expected: PASS (7 tests — stealth applies, non-stacking, ignore-cover strips, granted path, stealthy-attacker inert).

- [ ] **Step 4: Commit** (on the user's go-ahead)

```bash
git add app/engine/collectors/abilityRegistry.ts app/engine/collectors/expandAbilityMechanics.ts
git commit -m "refactor(engine): extract abilityRegistry into a dedicated manifest"
```

---

### Task 3: Guard test — manifested entries must be valid mechanics

**Files:**
- Create: `app/engine/collectors/__tests__/registries.test.ts`

**Interfaces:**
- Consumes: `weaponAttributeRegistry` (Task 1), `abilityRegistry` (Task 2), and the `Effect`/`Entity` shapes from `@/app/types/Mechanic`.

**Why:** the explicit allowlist is our stub-gate; this test makes the gate self-enforcing — wiring an empty or malformed file (missing `effect`/`value`, or an entity that isn't `opposingUnit`/`thisUnit`/`targetUnit`/etc.) fails the suite instead of silently misbehaving.

- [ ] **Step 1: Write the guard test**

```ts
// app/engine/collectors/__tests__/registries.test.ts
import { describe, it, expect } from "vitest";
import { weaponAttributeRegistry } from "../weaponAttributeRegistry";
import { abilityRegistry } from "../abilityRegistry";

const VALID_EFFECTS = new Set([
    "addsAbility", "addsBehaviour", "addsKeyword", "addsWeaponAttribute",
    "autoSuccess", "criticalWound", "extraSuccess", "forceRoll", "halveDamage",
    "ignoreBehaviour", "ignoreModifier", "ignoreState", "minDamage",
    "mortalWounds", "rollBonus", "rollPenalty", "reroll", "rollBlock",
    "setsFnp", "staticNumber",
]);

const registries = {
    weaponAttributeRegistry,
    abilityRegistry,
};

describe("library manifests", () => {
    for (const [name, registry] of Object.entries(registries)) {
        describe(name, () => {
            for (const [key, mechanic] of Object.entries(registry)) {
                it(`"${key}" points at a valid, non-empty mechanic`, () => {
                    expect(mechanic).toBeTypeOf("object");
                    expect(Object.keys(mechanic).length).toBeGreaterThan(0);
                    expect(mechanic.effect).toBeDefined();
                    expect(VALID_EFFECTS.has(mechanic.effect)).toBe(true);
                    expect(mechanic.value).toBeDefined();
                    expect(typeof mechanic.entity).toBe("string");
                });
            }
        });
    }
});
```

- [ ] **Step 2: Run the guard test**

Run: `npx vitest run app/engine/collectors/__tests__/registries.test.ts`
Expected: PASS (all currently-manifested entries are valid).

- [ ] **Step 3: Full suite + typecheck**

Run: `npx vitest run` — Expected: all pass (155 tests: prior 153 + Task 3's cases).
Run: `npx tsc --noEmit 2>&1 | grep "error TS"` — Expected: only the 8 pre-existing `operatorEvaluator` errors; nothing in the touched collector files.

- [ ] **Step 4: Commit** (on the user's go-ahead)

```bash
git add app/engine/collectors/__tests__/registries.test.ts
git commit -m "test(engine): guard that manifested library entries are valid mechanics"
```

---

## Self-Review

**Coverage:** Pain point 2 (duplication) → Task 1 (single shared `weaponAttributeRegistry`). Pain point 1 (activation seam) → Tasks 1+2 make each category's allowlist a single, logic-free manifest so activation is one import + one line in one file, with the stub-gate preserved; Task 3 makes the gate self-enforcing.

**Placeholder scan:** every step has full code and exact commands. No TBD.

**Type consistency:** `weaponAttributeRegistry` / `abilityRegistry` keep their existing types (`Record<string, Mechanic>`) and exact keys; consumers (`collectWeaponMechanics`, `expandWeaponAttributeMechanics`, `expandAbilityMechanics`) reference them by the same names they used for the inline consts, so call sites are unchanged.

**Explicitly out of scope:** directory auto-loading (would activate stubs); filling/​wiring the parked stub files; the 3 files missing a `name` field (cosmetic, unrelated).
