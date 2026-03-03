import { describe, it, expect } from "vitest";
import hold from "@/app/library/unit-behaviours/hold.json";
import move from "@/app/library/unit-behaviours/move.json";
import advance from "@/app/library/unit-behaviours/advance.json";
import fallBack from "@/app/library/unit-behaviours/fallBack.json";

const movementBehaviours = [hold, move, advance, fallBack];

// These must match CombatState.movementBehaviour union (excluding null).
// If this set changes, update the union in app/types/State.ts.
const EXPECTED_MOVEMENT_NAMES = ["hold", "move", "advance", "fallBack"];

describe("movement behaviour validity", () => {
    it("contains exactly the expected movement behaviour names", () => {
        const names = movementBehaviours.map(
            (m: { name: string }) => m.name,
        );
        expect(names.sort()).toEqual([...EXPECTED_MOVEMENT_NAMES].sort());
    });

    it("every entry has a string name", () => {
        for (const entry of movementBehaviours) {
            expect(typeof (entry as { name: string }).name).toBe("string");
        }
    });

    it("restricts arrays only contain valid action strings", () => {
        const validActions = ["shoot", "charge"];
        for (const entry of movementBehaviours as {
            name: string;
            restricts?: string[];
        }[]) {
            if (entry.restricts) {
                for (const action of entry.restricts) {
                    expect(validActions).toContain(action);
                }
            }
        }
    });
});
