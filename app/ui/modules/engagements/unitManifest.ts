import heavyIntercessors from "#data/output/heavy-intercessor-squad.json";
import wingedTyranidPrime from "#data/output/winged-tyranid-prime.json";
import { TestUnit } from "#types/Test";

export interface UnitManifestEntry {
    label: string;
    data: TestUnit;
}

export const unitManifest: UnitManifestEntry[] = [
    { label: "Heavy Intercessor Squad", data: heavyIntercessors as unknown as TestUnit },
    { label: "Winged Tyranid Prime", data: wingedTyranidPrime as unknown as TestUnit },
];
