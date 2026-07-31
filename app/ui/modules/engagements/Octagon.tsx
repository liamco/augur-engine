import React, { useEffect, useMemo, useState } from "react";

import { buildCombatContext } from "@/app/engine/pipeline/buildCombatContext";
import { runCombat } from "@/app/engine/pipeline/runCombat";
import { CombatResult, PhaseResult, DamageResult } from "#types/CombatResult";
import { ResolvedModifiers, MechanicSource } from "#types/ResolvedModifiers";
import { Attribute, Mechanic } from "#types/Mechanic";
import { WeaponProfile } from "#types/Weapon";
import { CombatState } from "#types/State";
import { EngagementPhase } from "#types/Engagement";
import { TestUnit } from "#types/Test";
import { Detachment } from "#types/Detachment";
import { Enhancement } from "#types/Enhancement";
import { resolveRestrictions } from "@/app/engine/resolvers/restrictionResolver";
import { collectWeaponBehaviours } from "@/app/engine/utils/collectWeaponBehaviours";
import { createDefaultCombatState } from "@/app/engine/utils/createDefaultCombatState";
import { deriveUnitStrength } from "@/app/engine/utils/deriveUnitStrength";
import { isCharacter } from "@/app/engine/utils/isCharacter";
import { unitManifest } from "./unitManifest";
import {
    detachmentsByFaction,
    findDetachment,
} from "./detachmentManifest";

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
    const [attackerDetachmentSlug, setAttackerDetachmentSlug] = useState<
        string | null
    >(null);
    const [defenderDetachmentSlug, setDefenderDetachmentSlug] = useState<
        string | null
    >(null);
    const [attackerEnhancementId, setAttackerEnhancementId] = useState<
        string | null
    >(null);
    const [defenderEnhancementId, setDefenderEnhancementId] = useState<
        string | null
    >(null);
    const [phase, setPhase] = useState<EngagementPhase>("shooting");
    const [rangeToTarget, setRangeToTarget] = useState<number | undefined>(
        undefined,
    );

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

    const attackerDetachment = findDetachment(attackerDetachmentSlug);
    const defenderDetachment = findDetachment(defenderDetachmentSlug);

    // An Enhancement is given to a CHARACTER model. In the lab that model is
    // either the selected unit itself or the leader attached to it, so a
    // bodyguard unit becomes eligible the moment a character joins it.
    const attackerTakesEnhancement =
        (!!attackerBase && isCharacter(attackerBase)) ||
        (!!selectedAttackerLeader && isCharacter(selectedAttackerLeader));
    const defenderTakesEnhancement =
        (!!defenderBase && isCharacter(defenderBase)) ||
        (!!selectedDefenderLeader && isCharacter(selectedDefenderLeader));

    const attackerEnhancement = attackerTakesEnhancement
        ? (attackerDetachment?.enhancements.find(
              (e) => e.id === attackerEnhancementId,
          ) ?? null)
        : null;
    const defenderEnhancement = defenderTakesEnhancement
        ? (defenderDetachment?.enhancements.find(
              (e) => e.id === defenderEnhancementId,
          ) ?? null)
        : null;

    const attackerLed =
        attackerWithState && selectedAttackerLeader
            ? attachLeader(attackerWithState, selectedAttackerLeader)
            : attackerWithState;
    const defenderLed =
        defenderWithState && selectedDefenderLeader
            ? attachLeader(defenderWithState, selectedDefenderLeader)
            : defenderWithState;

    const attacker =
        attackerLed && attackerEnhancement
            ? { ...attackerLed, enhancement: attackerEnhancement }
            : attackerLed;
    const defender =
        defenderLed && defenderEnhancement
            ? { ...defenderLed, enhancement: defenderEnhancement }
            : defenderLed;

    const attackerBehaviourMechanics = useMemo(() => {
        if (!attacker) return [];
        return attacker.abilities
            .flatMap((a) => a.mechanics ?? [])
            .filter((m) => m.effect === "addsBehaviour");
    }, [attacker]);

    // Weapon attributes conferred onto the attacker via abilities (e.g. a
    // leader's addsWeaponAttribute) — these aren't on the weapon profile, so
    // they'd otherwise be missing from the crit-keyword display.
    const conferredWeaponAttributes = useMemo(() => {
        if (!attacker) return [] as string[];
        return attacker.abilities
            .flatMap((a) => a.mechanics ?? [])
            .filter((m) => m.effect === "addsWeaponAttribute")
            .flatMap((m) => m.weaponAttributes ?? []);
    }, [attacker]);

    const allWeapons = attacker?.wargear.weapons ?? [];
    const weaponTypeFilter = phase === "fight" ? "Melee" : "Ranged";
    const movementBehaviour = attacker?.combatState.movementBehaviour ?? null;

    const { weapons, weaponRestrictions } = useMemo(() => {
        const typed = allWeapons.filter((w) => w.type === weaponTypeFilter);
        const restrictions = new Map<number, boolean>();

        for (let i = 0; i < typed.length; i++) {
            const weapon = typed[i];
            const attrs = weapon.profiles[0]?.attributes ?? [];
            const behaviours = collectWeaponBehaviours(
                attrs,
                attackerBehaviourMechanics,
            );
            const result = resolveRestrictions(movementBehaviour, behaviours);
            const canUse =
                phase === "fight" ? result.charge : result.shoot;
            restrictions.set(i, canUse);
        }

        return { weapons: typed, weaponRestrictions: restrictions };
    }, [allWeapons, weaponTypeFilter, movementBehaviour, attackerBehaviourMechanics, phase]);
    const selectedWeapon = weapons[weaponIndex] ?? null;
    const profiles = selectedWeapon?.profiles ?? [];
    const selectedProfile = profiles[profileIndex] ?? null;

    const critKeywordTags = useMemo(() => {
        const hit: string[] = [];
        const wound: string[] = [];
        if (!selectedProfile) return { hit, wound };
        const effectiveAttributes = [
            ...selectedProfile.attributes,
            ...conferredWeaponAttributes,
        ];
        for (const attr of effectiveAttributes) {
            for (const kw of CRIT_KEYWORDS) {
                if (attr.toUpperCase().startsWith(kw.pattern)) {
                    const target = kw.row === "hit" ? hit : wound;
                    target.push(attr);
                }
            }
        }
        return { hit, wound };
    }, [selectedProfile, conferredWeaponAttributes]);

    const result = useMemo<CombatResult | null>(() => {
        if (!attacker || !defender || !selectedProfile || !selectedWeapon)
            return null;

        const isRestricted = weaponRestrictions.get(weaponIndex) === false;
        if (isRestricted) return null;

        const profile: WeaponProfile = {
            ...selectedProfile,
            type: selectedProfile.type ?? selectedWeapon.type,
        };

        const context = buildCombatContext({
            attacker,
            defender,
            weaponProfile: profile,
            engagementPhase: phase,
            rangeToTarget,
            // Detachment rules are a mechanic layer of their own. None of the 77
            // detachment abilities carry mechanics yet — they are step 3/4 work —
            // so today these resolve to empty arrays.
            attackerDetachmentMechanics: detachmentMechanics(attackerDetachment),
            defenderDetachmentMechanics: detachmentMechanics(defenderDetachment),
        });

        return runCombat(context);
    }, [attacker, defender, selectedProfile, selectedWeapon, phase, weaponRestrictions, weaponIndex, rangeToTarget, attackerDetachment, defenderDetachment]);

    const handleAttackerChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const idx = val === "" ? null : Number(val);
        setAttackerIndex(idx);
        setAttackerLeaderIndex(null);
        // The new unit may not be a character, or may not be eligible for the
        // enhancement that was chosen for the old one.
        setAttackerEnhancementId(null);
        setAttackerState(
            idx !== null
                ? createDefaultCombatState(unitManifest[idx].data)
                : null,
        );
        setWeaponIndex(0);
        setProfileIndex(0);
    };

    const handleDefenderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const val = e.target.value;
        const idx = val === "" ? null : Number(val);
        setDefenderIndex(idx);
        setDefenderLeaderIndex(null);
        setDefenderEnhancementId(null);
        setDefenderState(
            idx !== null
                ? createDefaultCombatState(unitManifest[idx].data)
                : null,
        );
    };

    const handleAttackerLeaderChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setAttackerLeaderIndex(
            e.target.value === "" ? null : Number(e.target.value),
        );
        // Detaching the leader can remove the only character in the unit, which
        // would leave a stale enhancement selected on a unit that cannot take one.
        setAttackerEnhancementId(null);
    };
    const handleDefenderLeaderChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setDefenderLeaderIndex(
            e.target.value === "" ? null : Number(e.target.value),
        );
        setDefenderEnhancementId(null);
    };

    const handleAttackerDetachmentChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setAttackerDetachmentSlug(e.target.value === "" ? null : e.target.value);
        // Enhancements belong to a detachment, so the old id means nothing here.
        setAttackerEnhancementId(null);
    };
    const handleDefenderDetachmentChange = (
        e: React.ChangeEvent<HTMLSelectElement>,
    ) => {
        setDefenderDetachmentSlug(e.target.value === "" ? null : e.target.value);
        setDefenderEnhancementId(null);
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
            <div className="w-full grid grid-cols-9 gap-6">
                <aside className="col-span-3 flex flex-col gap-6">
                    <ArmyFields
                        detachmentSlug={attackerDetachmentSlug}
                        onDetachmentChange={handleAttackerDetachmentChange}
                        detachment={attackerDetachment}
                        enhancementId={attackerEnhancementId}
                        onEnhancementChange={(e) =>
                            setAttackerEnhancementId(
                                e.target.value === "" ? null : e.target.value,
                            )
                        }
                        selectedEnhancement={attackerEnhancement}
                        showEnhancement={attackerTakesEnhancement}
                    />
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
                                    <option
                                        key={i}
                                        value={i}
                                        disabled={!weaponRestrictions.get(i)}
                                    >
                                        {w.name}
                                        {!weaponRestrictions.get(i) ? " (restricted)" : ""}
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

                    {attackerState && attackerBase && (
                        <CombatStatePanel
                            label="Attacker State"
                            state={attackerState}
                            onChange={setAttackerState}
                            unit={attackerBase}
                        />
                    )}
                </aside>

                {result ? (
                    <div className="col-span-3 flex flex-col gap-6 border border-deathWorldForest">
                        <div className="text-blockcaps-s p-3 border-b border-deathWorldForest bg-deathWorldForest/20">
                            Results
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2 border-b border-deathWorldForest/50 text-blockcaps-xs">
                            <label className="text-skarsnikGreen/60">
                                Range to target (in)
                            </label>
                            <input
                                type="number"
                                className={stateInputCls}
                                value={rangeToTarget ?? ""}
                                onChange={(e) =>
                                    setRangeToTarget(
                                        e.target.value === ""
                                            ? undefined
                                            : Number(e.target.value),
                                    )
                                }
                            />
                        </div>
                        {result.eligibility && !result.eligibility.eligible && (
                            <div className="mx-3 mt-3 p-2 border border-red-500/60 text-red-400 text-blockcaps-xs">
                                ✕ Not a valid target — {result.eligibility.reason}{" "}
                                beyond detection range
                            </div>
                        )}
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
                                attributes={["hit", "ballisticSkill", "weaponSkill"]}
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
                    <main className="col-span-3 flex items-center justify-center">
                        Awaiting selections
                    </main>
                )}

                <aside className="col-span-3 flex flex-col gap-6">
                    <ArmyFields
                        detachmentSlug={defenderDetachmentSlug}
                        onDetachmentChange={handleDefenderDetachmentChange}
                        detachment={defenderDetachment}
                        enhancementId={defenderEnhancementId}
                        onEnhancementChange={(e) =>
                            setDefenderEnhancementId(
                                e.target.value === "" ? null : e.target.value,
                            )
                        }
                        selectedEnhancement={defenderEnhancement}
                        showEnhancement={defenderTakesEnhancement}
                    />
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
                    {defenderState && defenderBase && (
                        <CombatStatePanel
                            label="Defender State"
                            state={defenderState}
                            onChange={setDefenderState}
                            unit={defenderBase}
                        />
                    )}
                </aside>
            </div>
        </div>
    );
};

/* ── Helpers ──────────────────────────────────────────────────────── */

/** Every mechanic a detachment's rules contribute, flattened for the context. */
function detachmentMechanics(detachment: Detachment | null): Mechanic[] {
    return detachment?.abilities.flatMap((a) => a.mechanics ?? []) ?? [];
}

/* ── Subcomponents ────────────────────────────────────────────────── */

/**
 * The army-level fields at the top of a combatant column: which detachment the
 * unit is fielded in, and which of that detachment's Enhancements it carries.
 *
 * The enhancement field is hidden unless the unit can actually take one — an
 * Enhancement goes on a CHARACTER model — so an empty select never appears for
 * a rank-and-file unit.
 */
function ArmyFields({
    detachmentSlug,
    onDetachmentChange,
    detachment,
    enhancementId,
    onEnhancementChange,
    selectedEnhancement,
    showEnhancement,
}: {
    detachmentSlug: string | null;
    onDetachmentChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    detachment: Detachment | null;
    enhancementId: string | null;
    onEnhancementChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    selectedEnhancement: Enhancement | null;
    showEnhancement: boolean;
}) {
    const enhancements = detachment?.enhancements ?? [];

    return (
        <>
            <SelectGroup
                label="Detachment"
                value={detachmentSlug}
                onChange={onDetachmentChange}
            >
                {detachmentsByFaction.map((group) => (
                    <optgroup key={group.slug} label={group.name}>
                        {group.detachments.map((det) => (
                            <option key={det.slug} value={det.slug}>
                                {det.name}
                            </option>
                        ))}
                    </optgroup>
                ))}
            </SelectGroup>
            {showEnhancement && enhancements.length > 0 && (
                <div className="flex flex-col gap-1">
                    <SelectGroup
                        label="Enhancement"
                        value={enhancementId}
                        onChange={onEnhancementChange}
                    >
                        {enhancements.map((enhancement) => (
                            <option key={enhancement.id} value={enhancement.id}>
                                {enhancement.name}
                                {enhancement.cost !== undefined
                                    ? ` (${enhancement.cost} pts)`
                                    : ""}
                            </option>
                        ))}
                    </SelectGroup>
                    {selectedEnhancement?.description && (
                        <p className="text-blockcaps-xs text-skarsnikGreen/50 leading-snug">
                            {selectedEnhancement.description}
                        </p>
                    )}
                </div>
            )}
        </>
    );
}

function SelectGroup({
    label,
    value,
    onChange,
    placeholder = true,
    children,
}: {
    label: string;
    // Unit/weapon fields select by manifest index; detachments and enhancements
    // select by slug and id, which are stable across data refreshes.
    value: string | number | null;
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
        <div className="grid grid-cols-[120px_40px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-blockcaps-m text-skarsnikGreen/60">
                {label}
            </span>
            <span />
            <span />
            <span className="text-blockcaps-m text-skarsnikGreen/60 text-center">
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
        case "criticalWound":
            return `${name} ${val}+`;
        case "autoSuccess":
        case "ignoreBehaviour":
        case "ignoreModifier":
        case "ignoreState":
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
    // Either an ability granted automatic success, or the roll is never made at
    // all — a target of 0 is the engine's auto-hit signal, used by Torrent
    // weapons, which have no Ballistic Skill to roll against.
    const isAutoSuccess =
        attributes.some((attr) => phase.modifiers.get(attr)?.autoSuccess) ||
        (showTarget && phase.modifiedValue === 0);
    const critThreshold = attributes.reduce((threshold, attr) => {
        const crit = phase.modifiers.get(attr)?.criticalWound;
        return crit !== undefined ? Math.min(threshold, crit) : threshold;
    }, 6);
    // A target worse than 6+ is unreachable on a D6 — a save stripped away by
    // AP, or a blocked hit roll. Show "-" rather than an impossible "7+".
    const isUnmakeable = showTarget && phase.modifiedValue > 6;
    const baseDisplay = isAutoSuccess
        ? "Auto"
        : phase.baseDisplay
          ?? (showTarget ? `${phase.baseValue}+` : `${phase.baseValue}`);
    const finalDisplay = isAutoSuccess
        ? "Auto"
        : phase.modifiedDisplay
          ?? (isUnmakeable
              ? "-"
              : showTarget
                ? `${phase.modifiedValue}+`
                : `${phase.modifiedValue}`);

    return (
        <div className="grid grid-cols-[120px_60px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-blockcaps-m text-skarsnikGreen/60">
                {label}
            </span>
            <span className="text-blockcaps-m text-skarsnikGreen/60 text-center">
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
                                className="text-[0.7rem] uppercase tracking-widest px-1.5 py-0.5 border border-dashed border-skarsnikGreen/30 text-skarsnikGreen/40"
                            >
                                {kw} (on crit {critThreshold}+)
                            </span>
                        ))}
                    </span>
                )}
            </span>
            <span
                className={`text-blockcaps-m text-center ${phase.baseValue !== phase.modifiedValue ? "text-skarsnikGreen" : "text-skarsnikGreen/60"}`}
            >
                {finalDisplay}
            </span>
        </div>
    );
}

function DamageRow({ label, damage }: { label: string; damage: DamageResult }) {
    return (
        <div className="grid grid-cols-[120px_40px_1fr_auto] items-center gap-2 px-3 py-2">
            <span className="text-blockcaps-m text-skarsnikGreen/60">
                {label}
            </span>
            <span className="text-blockcaps-m text-skarsnikGreen/60 text-center">
                {damage.baseDamage}
            </span>
            <span className="flex flex-col gap-1">
                <ModifierTags
                    modifiers={damage.modifiers}
                    attributes={["damage"]}
                />
            </span>
            <span
                className={`text-blockcaps-m text-center ${damage.baseDamage !== damage.resolvedDamage ? "text-skarsnikGreen" : "text-skarsnikGreen/60"}`}
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
    unit,
}: {
    label: string;
    state: CombatState;
    onChange: (next: CombatState) => void;
    unit: TestUnit;
}) {
    const update = <K extends keyof CombatState>(
        key: K,
        value: CombatState[K],
    ) => {
        onChange({ ...state, [key]: value });
    };

    // From unitComposition, summed across its lines. models[].composition is
    // built by an unsound index-join and reports max 1 for a 5-10 model squad,
    // which sent every Space Marine squad down the single-model branch below.
    const maxModels = unit.unitComposition.reduce(
        (total, line) => total + line.max,
        0,
    );
    const woundsPerModel = unit.models[0].w;
    const isSingleModelMultiWound = maxModels === 1 && woundsPerModel > 1;

    // Starting values live on the combat state rather than in local React state,
    // so the engine can derive unit strength from the same numbers the panel shows.
    const starting = isSingleModelMultiWound
        ? woundsPerModel
        : state.startingModelCount;
    const current = isSingleModelMultiWound
        ? state.currentWounds
        : state.modelCount;

    const derivedStrength = deriveUnitStrength({ current, starting });

    const derivedDamaged =
        unit.damaged !== null
            ? state.currentWounds <= unit.damaged.threshold
            : false;

    useEffect(() => {
        const updates: Partial<CombatState> = {};
        if (state.unitStrength !== derivedStrength) {
            updates.unitStrength = derivedStrength;
        }
        if (unit.damaged && state.isDamaged !== derivedDamaged) {
            updates.isDamaged = derivedDamaged;
        }
        if (Object.keys(updates).length > 0) {
            onChange({ ...state, ...updates });
        }
    }, [derivedStrength, derivedDamaged]);

    return (
        <div className="border border-deathWorldForest/50 p-3">
            <div className="text-blockcaps-xs text-skarsnikGreen/60 mb-2">
                {label}
            </div>
            <div className="flex flex-col gap-1.5 text-blockcaps-xs">
                {isSingleModelMultiWound ? (
                    <div className="flex flex-row gap-1">
                        <div className="grow">
                            <StateNumberRow
                                label="Starting Wounds"
                                value={woundsPerModel}
                                min={0}
                                max={woundsPerModel}
                                readOnly
                            />
                        </div>
                        <div className="grow">
                            <StateNumberRow
                                label="Current Wounds"
                                value={state.currentWounds}
                                min={0}
                                max={woundsPerModel}
                                onChange={(v) => update("currentWounds", v)}
                            />
                        </div>
                    </div>
                ) : (
                <div className="flex flex-row gap-1">
                    <div className="grow">
                        <StateNumberRow
                            label="Starting Models"
                            value={state.startingModelCount}
                            min={0}
                            max={maxModels}
                            onChange={(v) => update("startingModelCount", v)}
                                />
                            </div>
                    <div className="grow">
                        <StateNumberRow
                            label="Current Models"
                            value={state.modelCount}
                            min={0}
                            max={maxModels}
                            onChange={(v) => update("modelCount", v)}
                        />
                            </div>
                </div>
                )}
                <StateReadOnlyRow
                    label="Strength"
                    value={derivedStrength}
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
                    label="Hidden"
                    // "Hidden" is the player-facing state; internally it maps to
                    // hasShot (a unit can only be Hidden if it has NOT shot).
                    value={state.hasShot === false}
                    onChange={(v) => update("hasShot", !v)}
                />
                {unit.damaged !== null && (
                    <StateReadOnlyRow
                        label="Damaged"
                        value={derivedDamaged ? "Yes" : "No"}
                    />
                )}
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

function StateReadOnlyRow({
    label,
    value,
}: {
    label: string;
    value: string;
}) {
    return (
        <div className={stateRowCls}>
            <span className={stateLabelCls}>{label}</span>
            <span className="text-skarsnikGreen/60 px-1.5 py-0.5">
                {value}
            </span>
        </div>
    );
}

function StateNumberRow({
    label,
    value,
    onChange,
    min,
    max,
    readOnly,
}: {
    label: string;
    value: number;
    onChange?: (v: number) => void;
    min?: number;
    max?: number;
    readOnly?: boolean;
}) {
    return (
        <div className={stateRowCls}>
            <span className={stateLabelCls}>{label}</span>
            <input
                type="number"
                value={value}
                min={min}
                max={max}
                readOnly={readOnly}
                onChange={(e) => {
                    if (readOnly || !onChange) return;
                    let v = Number(e.target.value) || 0;
                    if (min !== undefined && v < min) v = min;
                    if (max !== undefined && v > max) v = max;
                    onChange(v);
                }}
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
