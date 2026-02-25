import heavyIntercessors from "#data/output/heavy-intercessor-squad.json";
import infernusSquad from "#data/output/infernus-squad.json";
import librarianInTerminatorArmour from "#data/output/librarian-in-terminator-armour.json";
import wingedTyranidPrime from "#data/output/winged-tyranid-prime.json";
import termagants from "#data/output/termagants.json";
import gargoyles from "#data/output/gargoyles.json";
import psychophage from "#data/output/psychophage.json";
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
        label: "Librarian in Terminator armour",
        data: librarianInTerminatorArmour as unknown as TestUnit,
    },
    {
        label: "Winged Tyranid Prime",
        data: wingedTyranidPrime as unknown as TestUnit,
    },
    { label: "Termagants", data: termagants as unknown as TestUnit },
    { label: "Gargoyles", data: gargoyles as unknown as TestUnit },
    { label: "Psychophage", data: psychophage as unknown as TestUnit },
];
