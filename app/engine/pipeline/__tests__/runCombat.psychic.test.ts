import { describe, it, expect } from "vitest";
import { buildCombatContext } from "../buildCombatContext";
import { runCombat } from "../runCombat";
import { TestUnit } from "@/app/types/Test";
import { WeaponProfile } from "@/app/types/Weapon";
import heavyIntercessors from "@/app/codex/heavy-intercessor-squad.json";
import infernusSquad from "@/app/codex/infernus-squad.json";

const attacker = heavyIntercessors as unknown as TestUnit;

// A Psychic ranged weapon (like the Librarian's Smite) — BS 3+, AP -1.
const smite: WeaponProfile = {
    datasheetId: "x",
    line: 1,
    name: "Smite",
    type: "Ranged",
    attributes: ["PSYCHIC"],
    range: 18,
    a: 1,
    bsWs: 3,
    s: 5,
    ap: -1,
    d: 1,
};

// Same profile without PSYCHIC — the control.
const plainGun: WeaponProfile = { ...smite, name: "Plain", attributes: [] };

// Infernus in cover, with its innate STEALTH stripped so the only BS modifier
// under test is cover's -1.
const defenderInCover = {
    ...(infernusSquad as unknown as TestUnit),
    abilities: ((infernusSquad as unknown as TestUnit).abilities ?? []).filter(
        (a) => a.name !== "STEALTH",
    ),
    combatState: {
        ...(infernusSquad as unknown as TestUnit).combatState,
        isInCover: true,
    },
} as unknown as TestUnit;

const shoot = (weaponProfile: WeaponProfile) =>
    runCombat(
        buildCombatContext({
            attacker,
            defender: defenderInCover,
            weaponProfile,
            engagementPhase: "shooting",
        }),
    );

describe("runCombat — Psychic ignores hit-chance modifiers", () => {
    it("ignores cover's -1 BS on a Psychic weapon (hit stays at base)", () => {
        expect(shoot(smite).hitPhase.targetRoll).toBe(3);
    });

    it("a non-Psychic weapon in the same cover is still modified", () => {
        expect(shoot(plainGun).hitPhase.targetRoll).toBe(4);
    });
});
