# Library Registry Single-Source Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the duplicated weapon-attribute registry and move each category's "which rules are active" allowlist into a self-describing **library folder index** (`app/library/<category>/index.ts`) — so activating a finished rule is a one-line edit in the same folder as the JSON, and the engine holds no rule lists. The explicit allowlist (which keeps unfinished stub files from going live) is preserved.

**Architecture:** Each consumed library folder exports an `index.ts` mapping lookup key → imported library JSON. Engine collectors import the folder index instead of declaring registries inline. The one cross-folder case — `benefitofcover` (a `combat-states/` file usable as an ability) — is composed explicitly in `expandAbilityMechanics`. A guard test validates every indexed entry.

**Tech Stack:** TypeScript, Vitest.

## Context (why)

Two residual pain points from the thin-engine review:
1. **Activating a finished rule costs an engine edit** — and the allowlist is entangled with engine logic. We keep the allowlist explicit (so half-finished stub JSON doesn't auto-activate), but it should live *with the library* and be a single, logic-free, one-line edit.
2. **The weapon-attribute registry is duplicated verbatim** in `collectWeaponMechanics.ts` and `expandWeaponAttributeMechanics.ts`.

Placement decision (chosen): **Option A — library-colocated folder index.** The allowlist is a library concern, so it lives in `app/library/<category>/index.ts`, not the engine tree. We are **not** auto-loading directories — that would activate stubs; the index stays explicit.

## Global Constraints

- **Commits are user-gated:** do NOT commit automatically; perform commit steps only on the user's explicit go-ahead.
- **Behaviour-preserving:** these are refactors. The existing suite is the safety net — it must stay green (currently 153 tests). Typecheck (`npx tsc --noEmit`) must show only the 8 pre-existing `operatorEvaluator` errors.
- **Test runner:** `npx vitest run [path]`.
- Folder-index keys are unchanged from today's registries: weapon-attributes keyed by the sanitised attribute key (matches `parseParameterisedName(attrName).key`, e.g. `"devastating-wounds"`); unit-abilities keyed by the sanitised ability name (matches `expandAbilityMechanics`'s `sanitize()`, e.g. `"stealth"`).

---

### Task 1: Self-describing weapon-attribute folder index

**Files:**
- Create: `app/library/weapon-attributes/index.ts`
- Modify: `app/engine/collectors/collectWeaponMechanics.ts` (remove local imports+map, import the folder index)
- Modify: `app/engine/collectors/expandWeaponAttributeMechanics.ts` (same)
- Safety net: `app/engine/collectors/__tests__/collectWeaponMechanics.test.ts`, `app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts` (existing — must stay green)

**Interfaces:**
- Produces: `export const weaponAttributeRegistry: Record<string, Mechanic>` from `@/app/library/weapon-attributes` — keyed by sanitised attribute key, value = the library mechanic template.

- [ ] **Step 1: Create the folder index**

```ts
// app/library/weapon-attributes/index.ts
import { Mechanic } from "@/app/types/Mechanic";

import anti from "./anti.json";
import assault from "./assault.json";
import blast from "./blast.json";
import devastatingWounds from "./devastating-wounds.json";
import heavy from "./heavy.json";
import ignoresCover from "./ignores-cover.json";
import lance from "./lance.json";
import lethalHits from "./lethal-hits.json";
import melta from "./melta.json";
import pistol from "./pistol.json";
import rapidFire from "./rapid-fire.json";
import sustainedHits from "./sustained-hits.json";
import torrent from "./torrent.json";
import twinLinked from "./twin-linked.json";

/**
 * Active weapon-attribute allowlist. To activate a finished weapon-attribute
 * rule, add ONE import above and ONE line here — no engine change required.
 * (precision.json is intentionally omitted: it is an unfinished stub.)
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

- [ ] **Step 2: Point `collectWeaponMechanics.ts` at the index**

Delete the 14 `import ... from "@/app/library/weapon-attributes/..."` lines (7–20) and the local `weaponAttributeRegistry` const (22–37). Add near the other imports:
```ts
import { weaponAttributeRegistry } from "@/app/library/weapon-attributes";
```
The body already references `weaponAttributeRegistry[parsed.key]` — leave it unchanged.

- [ ] **Step 3: Point `expandWeaponAttributeMechanics.ts` at the index**

Delete the 14 library imports (8–21) and the local `weaponAttributeRegistry` const (23–38). Add:
```ts
import { weaponAttributeRegistry } from "@/app/library/weapon-attributes";
```

- [ ] **Step 4: Verify behaviour unchanged**

Run: `npx vitest run app/engine/collectors/__tests__/collectWeaponMechanics.test.ts app/engine/collectors/__tests__/expandWeaponAttributeMechanics.test.ts`
Expected: PASS (9 + 5 tests, same as before).

- [ ] **Step 5: Commit** (on the user's go-ahead)

```bash
git add app/library/weapon-attributes/index.ts app/engine/collectors/collectWeaponMechanics.ts app/engine/collectors/expandWeaponAttributeMechanics.ts
git commit -m "refactor(library): self-describing weapon-attribute index; drop duplicated registry"
```

---

### Task 2: Self-describing unit-ability folder index

**Files:**
- Create: `app/library/unit-abilities/index.ts`
- Modify: `app/engine/collectors/expandAbilityMechanics.ts` (remove inline registry + its two library imports; import the folder index and compose the `benefitofcover` alias)
- Safety net: existing stealth/cover suites must stay green.

**Interfaces:**
- Produces: `export const unitAbilityRegistry: Record<string, Mechanic>` from `@/app/library/unit-abilities` — keyed by sanitised ability name.

**Note on the cross-folder alias:** `benefitofcover` maps to `combat-states/benefit-of-cover.json` (a combat-state usable as a granted ability). Under folder-self-indexing it doesn't belong in the unit-abilities index, so `expandAbilityMechanics` composes it in explicitly, importing the cover JSON directly (as it does today).

- [ ] **Step 1: Create the folder index**

```ts
// app/library/unit-abilities/index.ts
import { Mechanic } from "@/app/types/Mechanic";
import stealth from "./stealth.json";

/**
 * Active unit-ability allowlist (keyed by sanitised ability name). To activate
 * a finished ability, add ONE import above and ONE line here.
 * (deadly-demise, fights-first, fly, hover, infiltrators, leader, scouts,
 * lone-operative are intentionally omitted — unfinished stubs.)
 */
export const unitAbilityRegistry: Record<string, Mechanic> = {
    stealth: stealth as unknown as Mechanic,
};
```

- [ ] **Step 2: Rewire `expandAbilityMechanics.ts`**

Delete the two library imports (`stealth`, `benefitOfCover`) and the inline `abilityRegistry` const (lines 5–11). Add near the top:
```ts
import { unitAbilityRegistry } from "@/app/library/unit-abilities";
import benefitOfCover from "@/app/library/combat-states/benefit-of-cover.json";
```
Then compose the lookup (keep the `Mechanic` import already present):
```ts
const abilityRegistry: Record<string, Mechanic> = {
    ...unitAbilityRegistry,
    benefitofcover: benefitOfCover as unknown as Mechanic,
};
```
The `sanitize()` helper and the rest of the function are unchanged.

- [ ] **Step 3: Verify behaviour unchanged**

Run: `npx vitest run app/engine/pipeline/__tests__/runCombat.stealth.test.ts app/engine/pipeline/__tests__/runCombat.cover.test.ts`
Expected: PASS (7 tests).

- [ ] **Step 4: Commit** (on the user's go-ahead)

```bash
git add app/library/unit-abilities/index.ts app/engine/collectors/expandAbilityMechanics.ts
git commit -m "refactor(library): self-describing unit-ability index; compose benefitofcover alias"
```

---

### Task 3: Guard test — indexed entries must be valid mechanics

**Files:**
- Create: `app/library/__tests__/registries.test.ts`

**Interfaces:**
- Consumes: `weaponAttributeRegistry` (`@/app/library/weapon-attributes`), `unitAbilityRegistry` (`@/app/library/unit-abilities`).

**Why:** the folder index is the stub-gate; this test makes it self-enforcing — indexing an empty or malformed file (missing `effect`/`value`, or a non-string `entity`) fails the suite instead of misbehaving at runtime.

- [ ] **Step 1: Write the guard test**

```ts
// app/library/__tests__/registries.test.ts
import { describe, it, expect } from "vitest";
import { weaponAttributeRegistry } from "@/app/library/weapon-attributes";
import { unitAbilityRegistry } from "@/app/library/unit-abilities";

const VALID_EFFECTS = new Set([
    "addsAbility", "addsBehaviour", "addsKeyword", "addsWeaponAttribute",
    "autoSuccess", "criticalWound", "extraSuccess", "forceRoll", "halveDamage",
    "ignoreBehaviour", "ignoreModifier", "ignoreState", "minDamage",
    "mortalWounds", "rollBonus", "rollPenalty", "reroll", "rollBlock",
    "setsFnp", "staticNumber",
]);

const indexes = { weaponAttributeRegistry, unitAbilityRegistry };

describe("library folder indexes", () => {
    for (const [name, index] of Object.entries(indexes)) {
        describe(name, () => {
            for (const [key, mechanic] of Object.entries(index)) {
                it(`"${key}" points at a valid, non-empty mechanic`, () => {
                    expect(mechanic).toBeTypeOf("object");
                    expect(Object.keys(mechanic).length).toBeGreaterThan(0);
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

Run: `npx vitest run app/library/__tests__/registries.test.ts`
Expected: PASS (all indexed entries valid).

- [ ] **Step 3: Full suite + typecheck**

Run: `npx vitest run` — Expected: all pass (~168 tests: prior 153 + the 15 indexed-entry cases).
Run: `npx tsc --noEmit 2>&1 | grep "error TS"` — Expected: only the 8 pre-existing `operatorEvaluator` errors; nothing in the touched files.

- [ ] **Step 4: Commit** (on the user's go-ahead)

```bash
git add app/library/__tests__/registries.test.ts
git commit -m "test(library): guard that indexed entries are valid mechanics"
```

---

## Self-Review

**Coverage:** Pain point 2 (duplication) → Task 1 (single `weapon-attributes/index.ts`, both consumers import it). Pain point 1 (activation seam) → Tasks 1+2 move each allowlist into a self-describing library folder index; activating a rule is one import + one line in the folder itself, engine holds no rule list, stub-gate preserved. Task 3 makes the gate self-enforcing.

**Placeholder scan:** every step has full code and exact commands. No TBD.

**Type consistency:** indexes keep `Record<string, Mechanic>` and the exact keys the engine already looks up. Consumers reference `weaponAttributeRegistry` / the composed `abilityRegistry` by the same names as the removed inline consts, so call sites are unchanged. The `benefitofcover` alias remains available via explicit composition in `expandAbilityMechanics`.

**Explicitly out of scope:** directory auto-loading (would activate stubs); filling/wiring parked stub files; a `combat-states/index.ts` (only one dual-use entry — imported directly instead); the 3 files missing a `name` field.
