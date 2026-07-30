import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
    parseWeaponAttributes,
    isRecognisedWeaponAttribute,
} from "../utils/parseWeaponAttributes";
import type { RawDatasheet } from "../types";

// Guards the source's attribute vocabulary. The engine only acts on attributes
// it recognises, and the source ships them as free-text prose — so a wording or
// format change upstream would otherwise silently empty the codex's attributes
// (as it did when the parser expected a bracketed form the source never used).
const FACTIONS_DIR = join(process.cwd(), "data", "src", "factions");

function everyProfileDescription(): string[] {
    const out: string[] = [];
    for (const entry of readdirSync(FACTIONS_DIR, { withFileTypes: true })) {
        if (!entry.isDirectory() || entry.name === "tyranids_old") continue;
        const dir = join(FACTIONS_DIR, entry.name, "datasheets");
        for (const file of readdirSync(dir)) {
            if (!file.endsWith(".json")) continue;
            const raw = JSON.parse(
                readFileSync(join(dir, file), "utf-8"),
            ) as RawDatasheet;
            for (const weapon of raw.wargear) {
                for (const profile of weapon.profiles) {
                    out.push(profile.description ?? "");
                }
            }
        }
    }
    return out;
}

describe("weapon attribute vocabulary (whole corpus)", () => {
    const parsed = everyProfileDescription().flatMap(parseWeaponAttributes);

    it("extracts an attribute from every profile that has one", () => {
        // 1578 of 2207 profiles carry attributes; the total attribute count is
        // higher still. A floor here fails loudly if extraction breaks.
        expect(parsed.length).toBeGreaterThan(2000);
    });

    it("recognises every attribute the source ships", () => {
        const unrecognised = [
            ...new Set(parsed.filter((a) => !isRecognisedWeaponAttribute(a))),
        ].sort();

        expect(unrecognised).toEqual([]);
    });
});
