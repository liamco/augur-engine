import React, { useMemo, useState } from "react";

import { buildCombatContext } from "@/app/engine/pipeline/buildCombatContext";
import { runCombat } from "@/app/engine/pipeline/runCombat";
import { CombatResult, PhaseResult, DamageResult } from "#types/CombatResult";
import { ResolvedModifiers, MechanicSource } from "#types/ResolvedModifiers";
import { Attribute } from "#types/Mechanic";
import { WeaponProfile } from "#types/Weapon";
import { CombatState } from "#types/State";
import { EngagementPhase } from "#types/Engagement";
import { TestUnit } from "#types/Test";
import { unitManifest } from "./unitManifest";

const COMBAT_PHASES: EngagementPhase[] = ["shooting", "fight"];

const CRIT_KEYWORDS: { pattern: string; row: "hit" | "wound" }[] = [
    { pattern: "SUSTAINED HITS", row: "hit" },
    { pattern: "LETHAL HITS", row: "hit" },
    { pattern: "DEVASTATING WOUNDS", row: "wound" },
];

const Octagon = () => {
    const [attackerIndex, setAttackerIndex] = useState<number | null>(null);
    const [defenderIndex, setDefenderIndex] = useState<number | null>(null);
    const [weaponIndex, setWeaponIndex] = useState(0);
    const [profileIndex, setProfileIndex] = useState(0);
    const [attackerState, setAttackerState] = useState<CombatState | null>(
        null,
    );
    const [defenderState, setDefenderState] = useState<CombatState | null>(
        null,
    );
    const [attackerLeaderIndex, setAttackerLeaderIndex] = useState<
        number | null
    >(null);
    const [defenderLeaderIndex, setDefenderLeaderIndex] = useState<
        number | null
    >(null);
    const [phase, setPhase] = useState<EngagementPhase>("shooting");

    const attackerBase =
        attackerIndex !== null ? unitManifest[attackerIndex].data : null;
    const defenderBase =
        defenderIndex !== null ? unitManifest[defenderIndex].data : null;

    const attackerLeaderOptions = useMemo(() => {
        if (!attackerBase) return [];
        return unitManifest
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) =>
                entry.data.leader?.canLead.some(
                    (ref) => ref.id === attackerBase.id,
                ),
            );
    }, [attackerBase]);

    const defenderLeaderOptions = useMemo(() => {
        if (!defenderBase) return [];
        return unitManifest
            .map((entry, index) => ({ entry, index }))
            .filter(({ entry }) =>
                entry.data.leader?.canLead.some(
                    (ref) => ref.id === defenderBase.id,
                ),
            );
    }, [defenderBase]);

    const attackerWithState =
        attackerBase && attackerState
            ? { ...attackerBase, combatState: attackerState }
            : attackerBase;
    const defenderWithState =
        defenderBase && defenderState
            ? { ...defenderBase, combatState: defenderState }
            : defenderBase;

    const selectedAttackerLeader =
        attackerLeaderIndex !== null
            ? unitManifest[attackerLeaderIndex].data
            : null;
    const selectedDefenderLeader =
        defenderLeaderIndex !== null
            ? unitManifest[defenderLeaderIndex].data
            : null;

    const attacker =
        attackerWithState && selectedAttackerLeader
            ? attachLeader(attackerWithState, selectedAttackerLeader)
            : attackerWithState;
    const defender =
        defenderWithState && selectedDefenderLeader
            ? attachLeader(defenderWithState, selectedDefenderLeader)
            : defenderWithState;

    const allWeapons = attacker?.wargear.weapons ?? [];
    const weaponTypeFilter = phase === "fight" ? "Melee" : "Ranged";
    const weapons = allWeapons.filter((w) => w.type === weaponTypeFilter);
    const selectedWeapon = weapons[weaponIndex] ?? null;
    const profiles = selectedWeapon?.profiles ?? [];
    const selectedProfile = profiles[profileIndex] ?? null;

    const critKeywordTags = useMemo(() => {
        const hit: string[] = [];
        const wound: string[] = [];
        if (!selectedProfile) return { hit, wound };
        for (const attr of selectedProfile.attributes) {
            for (const kw of CRIT_KEYWORDS) {
                if (attr.toUpperCase().startsWith(kw.pattern)) {
                    const target = kw.row === "hit" ? hit : wound;
                    target.push(attr);
                }
            }
        }
        return { hit, wound };
    }, [selectedProfile]);

    const result = useMemo<CombatResult | null>(() => {
        if (!attacker || !defender || !selectedProfile || !selectedWeapon)
            return null;

        const profile: WeaponProfile = {
            ...selectedProfile,
            type: selectedProfile.type ?? selectedWeapon.type,
        };

        const context = buildCombatContext({
            attacker,
            defender,
            weaponProfile: profile,
            engagementPhase: phase,
        });

        return runCombat(context);
    }, [attacker, defender, selectedProfile, selectedWeapon, phase]);

    const handleAttackerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const idx = val === "" ? null : Number(val);
        setAttackerIndex(idx);
        setAttackerLeaderIndex(null);
        setAttackerState(
            idx !== null ? { ...unitManifest[idx].data.combatState } : null,
        );
        setWeaponIndex(0);
        setProfileIndex(0);
    };

    const handleDefenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const idx = val === "" ? null : Number(val);
        setDefenderIndex(idx);
        setDefenderLeaderIndex(null);
        setDefenderState(
            idx !== null ? { ...unitManifest[idx].data.combatState } : null,
        );
    };

    const handleAttackerLeaderChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setAttackerLeaderIndex(
            e.target.value === "" ? null : Number(e.target.value),
        );
    };
    const handleDefenderLeaderChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setDefenderLeaderIndex(
            e.target.value === "" ? null : Number(e.target.value),
        );
    };

    const handleWeaponChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setWeaponIndex(Number(e.target.value));
        setProfileIndex(0);
    };

    const handleProfileChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setProfileIndex(Number(e.target.value));
    };

    return (
        <div className="space-y-6 overflow-auto FullScreenHeight">
            <header className="flex justify-between items-center">
                <h1 className="text-blockcaps-l text-center col-span-3">
                    Test Lab
                </h1>
                {/* Phase selector */}
                <div className="col-span-3 flex justify-center gap-4">
                    {COMBAT_PHASES.map((p) => (
                        <label
                            key={p}
                            className={`flex items-center gap-1.5 cursor-pointer text-blockcaps-xs ${phase === p ? "text-skarsnikGreen" : "text-skarsnikGreen/40"}`}
                        >
                            <input
                                type="radio"
                                name="engagementPhase"
                                value={p}
                                checked={phase === p}
                                onChange={() => {
                                    setPhase(p);
                                    setWeaponIndex(0);
                                    setProfileIndex(0);
                                }}
                                className="accent-skarsnikGreen"
                            />
                            {p}
                        </label>
                    ))}
                </div>
            </header>
            <div className="w-full grid grid-cols-10 gap-6">
                <aside className="col-span-3 flex flex-col gap-6">
                    <SelectGroup
                        label="Attacker"
                        value={attackerIndex}
                        onChange={handleAttackerChange}
                    >
                        {unitManifest.map((entry, i) => (
                            <option key={i} value={i}>
                                {entry.label}
                            </option>
                        ))}
                    </SelectGroup>
                    {attackerBase && attackerLeaderOptions.length > 0 && (
                        <SelectGroup
                            label="Attached Leader"
                            value={attackerLeaderIndex}
                            onChange={handleAttackerLeaderChange}
                        >
                            {attackerLeaderOptions.map(({ entry, index }) => (
                                <option key={index} value={index}>
                                    {entry.label}
                                </option>
                            ))}
                        </SelectGroup>
                    )}
                    {attacker && (
                        <div className="grid grid-cols-2 gap-4">
                            <SelectGroup
                                label="Weapon"
                                value={weaponIndex}
                                onChange={handleWeaponChange}
                                placeholder={false}
                            >
                                {weapons.map((w, i) => (
                                    <option key={i} value={i}>
                                        {w.name}
                                    </option>
                                ))}
                            </SelectGroup>
                            {profiles.length > 1 && (
                                <SelectGroup
                                    label="Profile"
                                    value={profileIndex}
                                    onChange={handleProfileChange}
                                    placeholder={false}
                                >
                                    {profiles.map((p, i) => (
                                        <option key={i} value={i}>
                                            {p.name}
                                        </option>
                                    ))}
                                </SelectGroup>
                            )}
                        </div>
                    )}

                    {/* Weapon stat line */}
                    {selectedProfile && (
                        <div className="border border-deathWorldForest p-3">
                            <div className="grid grid-cols-6 gap-2 text-center text-blockcaps-xs">
                                <StatCell label="A" value={selectedProfile.a} />
                                <StatCell
                                    label="BS/WS"
                                    value={`${selectedProfile.bsWs}+`}
                                />
                                <StatCell label="S" value={selectedProfile.s} />
                                <StatCell
                                    label="AP"
                                    value={selectedProfile.ap}
                                />
                                <StatCell label="D" value={selectedProfile.d} />
                                <StatCell
                                    label="Range"
                                    value={
                                        selectedProfile.range === "Melee"
                                            ? "Melee"
                                            : `${selectedProfile.range}"`
                                    }
                                />
                            </div>
                            {selectedProfile.attributes.length > 0 && (
                                <div className="mt-2 text-blockcaps-xs text-skarsnikGreen/60">
                                    [{selectedProfile.attributes.join(", ")}]
                                </div>
                            )}
                        </div>
                    )}

                    {attackerState && (
                        <CombatStatePanel
                            label="Attacker State"
                            state={attackerState}
                            onChange={setAttackerState}
                        />
                    )}
                </aside>

                {result ? (
                    <div className="col-span-4 flex flex-col gap-6 border border-deathWorldForest">
                        <div className="text-blockcaps-s p-3 border-b border-deathWorldForest bg-deathWorldForest/20">
                            Results
                        </div>
                        <div className="divide-y divide-deathWorldForest/50">
                            <PhaseRow
                                label="Attacks"
                                phase={result.attackCount}
                                attributes={["attacks"]}
                            />
                            <PhaseRow
                                label="To Hit"
                                phase={result.hitPhase}
                                showTarget
                                attributes={["hit"]}
                                keywords={critKeywordTags.hit}
                            />
                            <PhaseRow
                                label="To Wound"
                                phase={result.woundPhase}
                                showTarget
                                attributes={["wound", "strength", "toughness"]}
                                keywords={critKeywordTags.wound}
                            />
                            <PhaseRow
                                label="To Save"
                                phase={result.savePhase}
                                showTarget
                                attributes={[
                                    "save",
                                    "armourPenetration",
                                    "invulnSave",
                                ]}
                                extraTags={
                                    selectedProfile && selectedProfile.ap !== 0
                                        ? [`AP ${selectedProfile.ap}`]
                                        : undefined
                                }
                            />
                            <DamageRow
                                label="Damage"
                                damage={result.damagePhase}
                            />
                            {result.feelNoPain ? (
                                <PhaseRow
                                    label="Feel No Pain"
                                    phase={result.feelNoPain}
                                    showTarget
                                    attributes={["feelNoPain"]}
                                />
                            ) : (
                                <ResultRow label="Feel No Pain" value="--" />
                            )}
                        </div>
                    </div>
                ) : (
                    <main className="col-span-4 flex items-center justify-center">
                        Awaiting selections
                    </main>
                )}

                <aside className="col-span-3 flex flex-col gap-6">
                    <SelectGroup
                        label="Defender"
                        value={defenderIndex}
                        onChange={handleDefenderChange}
                    >
                        {unitManifest.map((entry, i) => (
                            <option key={i} value={i}>
                                {entry.label}
                            </option>
                        ))}
                    </SelectGroup>
                    {defenderBase && defenderLeaderOptions.length > 0 && (
                        <SelectGroup
                            label="Attached Leader"
                            value={defenderLeaderIndex}
                            onChange={handleDefenderLeaderChange}
                        >
                            {defenderLeaderOptions.map(({ entry, index }) => (
                                <option key={index} value={index}>
                                    {entry.label}
                                </option>
                            ))}
                        </SelectGroup>
                    )}
                    {defender && (
                        <div className="border border-deathWorldForest p-3">
                            {defender.models.map((model, i) => (
                                <div key={i} className={i > 0 ? "mt-3" : ""}>
                                    {defender.models.length > 1 && (
                                        <div className="text-blockcaps-xs text-skarsnikGreen/60 mb-1">
                                            {model.name}
                                        </div>
                                    )}
                                    <div className="grid grid-cols-6 gap-2 text-center text-blockcaps-xs">
                                        <StatCell
                                            label="M"
                                            value={`${model.m}"`}
                                        />
                                        <StatCell label="T" value={model.t} />
                                        <StatCell
                                            label="SV"
                                            value={`${model.sv}+`}
                                        />
                                        <StatCell label="W" value={model.w} />
                                        <StatCell
                                            label="LD"
                                            value={`${model.ld}+`}
                                        />
                                        <StatCell label="OC" value={model.oc} />
                                    </div>
                                    {model.invSv !== null && (
                                        <div className="mt-1 text-blockcaps-xs text-skarsnikGreen/60">
                                            Invuln: {model.invSv}+
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                    {defenderState && (
                        <CombatStatePanel
                            label="Defender State"
                            state={defenderState}
                            onChange={setDefenderState}
                        />
                    )}
                </aside>
            </div>
        </div>
    );
};

/* ── Subcomponents ────────────────────────────────────────────────── */

function SelectGroup({
    label,
    value,
    onChange,
    placeholder = true,
    children,
}: {
    label: string;
    value: number | null;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    placeholder?: boolean;
    children: React.ReactNode;
}) {
    return (
        <div className="flex flex-col gap-1">
            <label className="text-blockcaps-xs text-skarsnikGreen/60">
                {label}
            </label>
            <select
                value={value ?? ""}
                onChange={onChange}
                className="bg-nocturneGreen border border-deathWorldForest text-skarsnikGreen py-1.5 px-2 text-blockcaps-xs"
            >
                {placeholder && <option value="">-- Select --</option>}
                {children}
            </select>
        </div>
    );
}

function StatCell({ label, value }: { label: string; value: string | number }) {
    return (
        <div>
            <div className="text-skarsnikGreen/40 mb-0.5">{label}</div>
            <div className="text-skarsnikGreen">{value}</div>
        </div>
    );
}

function ResultRow({
    label,
    value,
}: {
    label: string;
    value: React.ReactNode;
}) {
    return (
        <div className="grid grid-cols-[100px_40px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-blockcaps-xs text-skarsnikGreen/60">
                {label}
            </span>
            <span />
            <span />
            <span className="text-blockcaps-s text-skarsnikGreen/60 text-center">
                {value}
            </span>
        </div>
    );
}

function formatSourceTag(src: MechanicSource): string {
    const name = src.mechanicName ?? src.effect;
    const val = src.originalValue;
    switch (src.effect) {
        case "rollBonus":
            return `${name} +${val}`;
        case "rollPenalty":
            return `${name} -${val}`;
        case "reroll":
            return `${name} reroll ${val}`;
        case "staticNumber":
            return `${name} +${val}`;
        case "setsFnp":
            return `${name} ${val}+`;
        case "minDamage":
            return `${name} min ${val}`;
        case "mortalWounds":
            return name;
        case "autoSuccess":
        case "ignoreBehaviour":
        case "ignoreModifier":
        case "halveDamage":
        case "rollBlock":
        default:
            return name;
    }
}

function summariseModifiers(
    modifiers: ResolvedModifiers,
    attributes: Attribute[],
    extraTags?: string[],
): string[] {
    const tags: string[] = [];
    for (const attr of attributes) {
        const effectSet = modifiers.get(attr);
        if (!effectSet) continue;
        for (const src of effectSet.sources) {
            tags.push(formatSourceTag(src));
        }
    }
    if (extraTags) tags.push(...extraTags);
    return [...new Set(tags)];
}

function ModifierTags({
    modifiers,
    attributes,
    extraTags,
}: {
    modifiers: ResolvedModifiers;
    attributes: Attribute[];
    extraTags?: string[];
}) {
    const tags = summariseModifiers(modifiers, attributes, extraTags);
    if (tags.length === 0) return null;
    return (
        <span className="flex flex-wrap gap-1 mt-1">
            {tags.map((tag, i) => (
                <span
                    key={i}
                    className="text-[0.6rem] uppercase tracking-widest px-1.5 py-0.5 border border-skarsnikGreen/30 text-skarsnikGreen/70"
                >
                    {tag}
                </span>
            ))}
        </span>
    );
}

function PhaseRow({
    label,
    phase,
    showTarget,
    attributes,
    extraTags,
    keywords,
}: {
    label: string;
    phase: PhaseResult;
    showTarget?: boolean;
    attributes: Attribute[];
    extraTags?: string[];
    keywords?: string[];
}) {
    const isAutoSuccess = attributes.some(
        (attr) => phase.modifiers.get(attr)?.autoSuccess,
    );
    const baseDisplay = isAutoSuccess
        ? "Auto"
        : phase.baseDisplay
          ?? (showTarget ? `${phase.baseValue}+` : `${phase.baseValue}`);
    const finalDisplay = isAutoSuccess
        ? "Auto"
        : phase.modifiedDisplay
          ?? (showTarget ? `${phase.modifiedValue}+` : `${phase.modifiedValue}`);

    return (
        <div className="grid grid-cols-[100px_40px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-blockcaps-xs text-skarsnikGreen/60">
                {label}
            </span>
            <span className="text-blockcaps-s text-skarsnikGreen/60 text-center">
                {baseDisplay}
            </span>
            <span className="flex flex-col gap-1">
                <ModifierTags
                    modifiers={phase.modifiers}
                    attributes={attributes}
                    extraTags={extraTags}
                />
                {keywords && keywords.length > 0 && (
                    <span className="flex flex-wrap gap-1">
                        {keywords.map((kw, i) => (
                            <span
                                key={i}
                                className="text-[0.6rem] uppercase tracking-widest px-1.5 py-0.5 border border-dashed border-skarsnikGreen/30 text-skarsnikGreen/40"
                            >
                                {kw} (on crit 6)
                            </span>
                        ))}
                    </span>
                )}
            </span>
            <span
                className={`text-blockcaps-s text-center ${phase.baseValue !== phase.modifiedValue ? "text-skarsnikGreen" : "text-skarsnikGreen/60"}`}
            >
                {finalDisplay}
            </span>
        </div>
    );
}

function DamageRow({ label, damage }: { label: string; damage: DamageResult }) {
    return (
        <div className="grid grid-cols-[100px_40px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-blockcaps-xs text-skarsnikGreen/60">
                {label}
            </span>
            <span className="text-blockcaps-s text-skarsnikGreen/60 text-center">
                {damage.baseDamage}
            </span>
            <span className="flex flex-col gap-1">
                <ModifierTags
                    modifiers={damage.modifiers}
                    attributes={["damage"]}
                />
            </span>
            <span
                className={`text-blockcaps-s text-center ${damage.baseDamage !== damage.resolvedDamage ? "text-skarsnikGreen" : "text-skarsnikGreen/60"}`}
            >
                {damage.resolvedDamage}
            </span>
        </div>
    );
}

function CombatStatePanel({
    label,
    state,
    onChange,
}: {
    label: string;
    state: CombatState;
    onChange: (next: CombatState) => void;
}) {
    const update = <K extends keyof CombatState>(
        key: K,
        value: CombatState[K],
    ) => {
        onChange({ ...state, [key]: value });
    };

    return (
        <div className="border border-deathWorldForest/50 p-3">
            <div className="text-blockcaps-xs text-skarsnikGreen/60 mb-2">
                {label}
            </div>
            <div className="flex flex-col gap-1.5 text-blockcaps-xs">
                <StateNumberRow
                    label="Models"
                    value={state.modelCount}
                    onChange={(v) => update("modelCount", v)}
                />
                <StateNumberRow
                    label="Wounds"
                    value={state.currentWounds}
                    onChange={(v) => update("currentWounds", v)}
                />
                <StateSelectRow
                    label="Strength"
                    value={state.unitStrength}
                    options={["full", "belowStarting", "belowHalf"]}
                    onChange={(v) =>
                        update("unitStrength", v as CombatState["unitStrength"])
                    }
                />
                <StateSelectRow
                    label="Movement"
                    value={state.movementBehaviour ?? "null"}
                    options={["hold", "move", "advance", "fallBack", "null"]}
                    onChange={(v) =>
                        update(
                            "movementBehaviour",
                            v === "null"
                                ? null
                                : (v as CombatState["movementBehaviour"]),
                        )
                    }
                />
                <StateSelectRow
                    label="Charge"
                    value={state.chargeBehaviour ?? "null"}
                    options={["hold", "charge", "null"]}
                    onChange={(v) =>
                        update(
                            "chargeBehaviour",
                            v === "null"
                                ? null
                                : (v as CombatState["chargeBehaviour"]),
                        )
                    }
                />
                <StateSelectRow
                    label="Objective"
                    value={state.isInObjectiveRange}
                    options={["none", "friendly", "enemy", "contested"]}
                    onChange={(v) =>
                        update(
                            "isInObjectiveRange",
                            v as CombatState["isInObjectiveRange"],
                        )
                    }
                />
                <StateBoolRow
                    label="Engagement"
                    value={state.isInEngagementRange}
                    onChange={(v) => update("isInEngagementRange", v)}
                />
                <StateBoolRow
                    label="Cover"
                    value={state.isInCover}
                    onChange={(v) => update("isInCover", v)}
                />
                <StateBoolRow
                    label="Damaged"
                    value={state.isDamaged}
                    onChange={(v) => update("isDamaged", v)}
                />
                <StateBoolRow
                    label="Battle Shocked"
                    value={state.isBattleShocked}
                    onChange={(v) => update("isBattleShocked", v)}
                />
            </div>
        </div>
    );
}

const stateRowCls = "grid grid-cols-[100px_1fr] items-center";
const stateLabelCls = "text-skarsnikGreen/40";
const stateInputCls =
    "bg-nocturneGreen border border-deathWorldForest text-skarsnikGreen py-0.5 px-1.5 text-blockcaps-xs w-full";

function StateBoolRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className={stateRowCls}>
            <span className={stateLabelCls}>{label}</span>
            <button
                type="button"
                onClick={() => onChange(!value)}
                className={`text-left px-1.5 py-0.5 border border-deathWorldForest ${value ? "text-skarsnikGreen" : "text-skarsnikGreen/30"}`}
            >
                {value ? "Yes" : "No"}
            </button>
        </div>
    );
}

function StateSelectRow({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value: string;
    options: string[];
    onChange: (v: string) => void;
}) {
    return (
        <div className={stateRowCls}>
            <span className={stateLabelCls}>{label}</span>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className={stateInputCls}
            >
                {options.map((opt) => (
                    <option key={opt} value={opt}>
                        {opt === "null" ? "--" : opt}
                    </option>
                ))}
            </select>
        </div>
    );
}

function StateNumberRow({
    label,
    value,
    onChange,
}: {
    label: string;
    value: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className={stateRowCls}>
            <span className={stateLabelCls}>{label}</span>
            <input
                type="number"
                value={value}
                min={0}
                onChange={(e) => onChange(Number(e.target.value) || 0)}
                className={stateInputCls}
            />
        </div>
    );
}

/* ── Helpers ──────────────────────────────────────────────────────── */

function attachLeader(unit: TestUnit, leader: TestUnit): TestUnit {
    const leaderAbilities = leader.abilities
        .filter((a) => a.mechanics && a.mechanics.length > 0)
        .map((a) => ({
            ...a,
            isFromLeader: true as const,
            sourceUnitName: leader.name,
        }));

    return {
        ...unit,
        abilities: [...unit.abilities, ...leaderAbilities],
        combatState: {
            ...unit.combatState,
            customState: {
                ...unit.combatState.customState,
                isLeadingUnit: true,
            },
        },
    };
}

export default Octagon;
