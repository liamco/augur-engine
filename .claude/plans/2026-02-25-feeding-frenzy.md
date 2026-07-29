# Feeding Frenzy (Psychophage) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Enable the Psychophage's Feeding Frenzy ability — +1 to hit vs targets below starting strength, +1 to wound vs targets below half strength (melee only).

**Architecture:** The Psychophage data (`app/data/output/psychophage.json`) already defines two mechanics with conditions on `state: "isBelowStartingStrength"` and `state: "isBelowHalfStrength"`. The engine's condition resolver already routes state-based conditions through `resolveState()`. The only missing piece is that `resolveState` doesn't map those two keys — they return `null`, causing the conditions to silently fail. We add two derived boolean entries to the state map.

**Tech Stack:** TypeScript, existing engine resolver pipeline

---

## Changes

### Task 1: Add derived strength-state keys to stateResolver

**Files:**
- Modify: `app/engine/resolvers/stateResolver.ts:7-20`

**Step 1: Add the two derived state entries**

Inside the `stateMap` object in `resolveState`, add these two entries after the existing `unitStrength` line:

```ts
isBelowStartingStrength: combatState.unitStrength !== "full",
isBelowHalfStrength: combatState.unitStrength === "belowHalf",
```

The full `stateMap` should then read:

```ts
const stateMap: Record<string, boolean | number | string | null> = {
    activeModels: combatState.modelCount - combatState.deadModelIds.length,
    battleShock: combatState.isBattleShocked,
    damaged: combatState.isDamaged,
    benefitOfCover: combatState.isInCover,
    unitStrength: combatState.unitStrength,
    isBelowStartingStrength: combatState.unitStrength !== "full",
    isBelowHalfStrength: combatState.unitStrength === "belowHalf",
    movementBehaviour: combatState.movementBehaviour,
    isInEngagementRange: combatState.isInEngagementRange,
    isInObjectiveRange: combatState.isInObjectiveRange,
    chargeBehaviour: combatState.chargeBehaviour,
    isDestroyed: combatState.isDestroyed,
    modelCount: combatState.modelCount,
    currentWounds: combatState.currentWounds,
};
```

**Step 2: Run type check**

Run: `npx tsc --noEmit`
Expected: No errors (both entries are `boolean`, which fits the map's value type).

**Step 3: Commit**

```bash
git add app/engine/resolvers/stateResolver.ts
git commit -m "feat: add isBelowStartingStrength/isBelowHalfStrength derived state keys"
```

---

## No other changes required

- **Data:** `app/data/output/psychophage.json` already has the correct Feeding Frenzy mechanics with `phase: ["fight"]`, the right state keys, and `entity: "targetUnit"`.
- **UI:** The Psychophage is already in `unitManifest.ts`. The `CombatStatePanel` already derives `unitStrength` from starting/current values and syncs it back to `CombatState` via `useEffect`.
- **Engine:** `conditionResolver.ts` → `extractConditionValue` → `resolveState` → new keys. No pipeline changes needed.

---

## Verification

### Manual test in dev server

1. Select **Psychophage** as attacker, any multi-model unit (e.g. Termagants) as defender.
2. Switch to **Fight** phase, select **Talons and betentacled maw**.
3. Set defender Starting Models = 10, Current Models = 10.
   - Strength shows "full". Hit roll should show **no** Feeding Frenzy modifier.
4. Set defender Current Models = 9.
   - Strength shows "belowStarting". Hit roll should show **+1 Feeding Frenzy** tag. Wound roll unchanged.
5. Set defender Current Models = 4 (below half of 10).
   - Strength shows "belowHalf". Hit roll shows **+1 Feeding Frenzy**. Wound roll also shows **+1 Feeding Frenzy**.
6. Switch to **Shooting** phase.
   - Feeding Frenzy modifiers should **not** appear (melee-only ability).
