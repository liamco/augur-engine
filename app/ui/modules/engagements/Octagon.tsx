import React, { useMemo, useState } from "react";

import { buildCombatContext } from "@/app/engine/pipeline/buildCombatContext";
import { runCombat } from "@/app/engine/pipeline/runCombat";
import { CombatResult, PhaseResult, DamageResult } from "#types/CombatResult";
import { ResolvedModifiers } from "#types/ResolvedModifiers";
import { Attribute } from "#types/Mechanic";
import { WeaponProfile } from "#types/Weapon";
import { CombatState } from "#types/State";
import { unitManifest } from "./unitManifest";

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

    const attackerBase =
        attackerIndex !== null ? unitManifest[attackerIndex].data : null;
    const defenderBase =
        defenderIndex !== null ? unitManifest[defenderIndex].data : null;

    const attacker =
        attackerBase && attackerState
            ? { ...attackerBase, combatState: attackerState }
            : attackerBase;
    const defender =
        defenderBase && defenderState
            ? { ...defenderBase, combatState: defenderState }
            : defenderBase;

    const weapons = attacker?.wargear.weapons ?? [];
    const selectedWeapon = weapons[weaponIndex] ?? null;
    const profiles = selectedWeapon?.profiles ?? [];
    const selectedProfile = profiles[profileIndex] ?? null;

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
        });

        return runCombat(context);
    }, [attacker, defender, selectedProfile, selectedWeapon]);

    const handleAttackerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const idx = val === "" ? null : Number(val);
        setAttackerIndex(idx);
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
        setDefenderState(
            idx !== null ? { ...unitManifest[idx].data.combatState } : null,
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
        <div className="w-full grid grid-cols-3 gap-6 overflow-auto FullScreenHeight">
            {/* Header */}
            <h1 className="text-blockcaps-l text-center col-span-3">
                Test Lab
            </h1>

            <aside className="flex flex-col gap-6">
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
                {attackerState && (
                    <CombatStatePanel
                        label="Attacker State"
                        state={attackerState}
                        onChange={setAttackerState}
                    />
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
                                    {w.name} ({w.type})
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
                        <div className="text-blockcaps-xs text-skarsnikGreen/60 mb-2">
                            Weapon Profile
                        </div>
                        <div className="grid grid-cols-6 gap-2 text-center text-blockcaps-xs">
                            <StatCell label="A" value={selectedProfile.a} />
                            <StatCell
                                label="BS/WS"
                                value={`${selectedProfile.bsWs}+`}
                            />
                            <StatCell label="S" value={selectedProfile.s} />
                            <StatCell label="AP" value={selectedProfile.ap} />
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
            </aside>

            {result ? (
                <div className="flex flex-col gap-6 border border-deathWorldForest">
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
                        />
                        <PhaseRow
                            label="To Wound"
                            phase={result.woundPhase}
                            showTarget
                            attributes={["wound", "strength", "toughness"]}
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
                            note={
                                selectedProfile
                                    ? `AP ${selectedProfile.ap}`
                                    : undefined
                            }
                        />
                        <DamageRow label="Damage" damage={result.damagePhase} />
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
                <main>Awaiting selections</main>
            )}

            <aside className="flex flex-col gap-6">
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
                {defenderState && (
                    <CombatStatePanel
                        label="Defender State"
                        state={defenderState}
                        onChange={setDefenderState}
                    />
                )}
            </aside>

            {/* Weapon selectors */}

            {/* Results */}
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
        <div className="grid grid-cols-[140px_1fr] items-center px-3 py-2">
            <span className="text-blockcaps-xs text-skarsnikGreen/60">
                {label}
            </span>
            <span className="text-blockcaps-xs">{value}</span>
        </div>
    );
}

function summariseModifiers(
    modifiers: ResolvedModifiers,
    attributes: Attribute[],
): string[] {
    const tags: string[] = [];
    for (const attr of attributes) {
        const effectSet = modifiers.get(attr);
        if (!effectSet) continue;
        for (const src of effectSet.sources) {
            if (src.mechanicName) {
                tags.push(src.mechanicName);
            }
        }
        if (effectSet.rollBonus) tags.push(`+${effectSet.rollBonus} bonus`);
        if (effectSet.rollPenalty)
            tags.push(`-${effectSet.rollPenalty} penalty`);
        if (effectSet.reroll) tags.push(`reroll ${effectSet.reroll.scope}`);
        if (effectSet.autoSuccess) tags.push("auto-success");
        if (effectSet.ignoreModifier) tags.push("ignore modifier");
        if (effectSet.halveDamage) tags.push("halve damage");
        if (effectSet.minDamage !== undefined)
            tags.push(`min damage ${effectSet.minDamage}`);
        if (effectSet.mortalWounds)
            tags.push(`mortal wounds ${effectSet.mortalWounds.count}`);
        if (effectSet.setsFnp !== undefined)
            tags.push(`FNP ${effectSet.setsFnp}+`);
        if (effectSet.rollBlock) tags.push("roll blocked");
    }
    return [...new Set(tags)];
}

function ModifierTags({
    modifiers,
    attributes,
}: {
    modifiers: ResolvedModifiers;
    attributes: Attribute[];
}) {
    const tags = summariseModifiers(modifiers, attributes);
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
    note,
}: {
    label: string;
    phase: PhaseResult;
    showTarget?: boolean;
    attributes: Attribute[];
    note?: string;
}) {
    const parts: string[] = [];
    if (showTarget && phase.targetRoll !== undefined) {
        parts.push(`${phase.targetRoll}+`);
    }
    if (phase.baseValue !== phase.modifiedValue) {
        parts.push(
            `base: ${phase.baseValue}, modified: ${phase.modifiedValue}`,
        );
    } else {
        parts.push(`${phase.modifiedValue}`);
    }
    if (note) {
        parts.push(note);
    }
    return (
        <ResultRow
            label={label}
            value={
                <>
                    {parts.join(" · ")}
                    <ModifierTags
                        modifiers={phase.modifiers}
                        attributes={attributes}
                    />
                </>
            }
        />
    );
}

function DamageRow({ label, damage }: { label: string; damage: DamageResult }) {
    const parts: string[] = [];
    if (damage.baseDamage !== damage.resolvedDamage) {
        parts.push(
            `base: ${damage.baseDamage}, resolved: ${damage.resolvedDamage}`,
        );
    } else {
        parts.push(`${damage.resolvedDamage}`);
    }
    return (
        <ResultRow
            label={label}
            value={
                <>
                    {parts.join(" · ")}
                    <ModifierTags
                        modifiers={damage.modifiers}
                        attributes={["damage"]}
                    />
                </>
            }
        />
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

export default Octagon;
