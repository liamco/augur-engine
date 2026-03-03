import { describe, it, expect } from "vitest";
import { getBehaviourAllows } from "../behaviourRegistry";

describe("behaviourRegistry", () => {
    it("returns allows array for advanceAndShoot", () => {
        expect(getBehaviourAllows("advanceAndShoot")).toEqual([
            "advance",
            "shoot",
        ]);
    });

    it("returns allows array for fallBackAndCharge", () => {
        expect(getBehaviourAllows("fallBackAndCharge")).toEqual([
            "fallBack",
            "charge",
        ]);
    });

    it("returns undefined for unknown behaviour", () => {
        expect(getBehaviourAllows("unknownBehaviour")).toBeUndefined();
    });

    it("returns undefined for behaviour without allows", () => {
        expect(getBehaviourAllows("embark")).toBeUndefined();
    });
});
