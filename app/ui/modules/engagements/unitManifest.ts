import heavyIntercessors from "#data/output/heavy-intercessor-squad.json";
import infernusSquad from "#data/output/infernus-squad.json";
import wingedTyranidPrime from "#data/output/winged-tyranid-prime.json";
import termagants from "#data/output/termagants.json";
import gargoyles from "#data/output/gargoyles.json";
import { TestUnit } from "#types/Test";

export interface UnitManifestEntry {
    label: string;
    data: TestUnit;
}

export const unitManifest: UnitManifestEntry[] = [
    {
        label: "Heavy Intercessor Squad",
        data: heavyIntercessors as unknown as TestUnit,
    },
    {
        label: "Infernus Squad",
        data: infernusSquad as unknown as TestUnit,
    },
    {
        label: "Winged Tyranid Prime",
        data: wingedTyranidPrime as unknown as TestUnit,
    },
    { label: "Termagants", data: termagants as unknown as TestUnit },
    { label: "Gargoyles", data: gargoyles as unknown as TestUnit },
];
