import { Attribute } from "@/app/types/Mechanic";
import {
    ResolvedModifiers,
    ResolvedEffectSet,
    MechanicSource,
    RerollRule,
} from "@/app/types/ResolvedModifiers";
import { TaggedMechanic } from "../collectors/collectAllMechanics";

export const resolveEffects = (
    mechanics: TaggedMechanic[],
): ResolvedModifiers => {
    const modifiers: ResolvedModifiers = new Map();
    const byAttribute = groupByAttribute(mechanics);

    for (const [attribute, attributeMechanics] of byAttribute.entries()) {
        const effectSet = resolveEffectSet(attributeMechanics);
        modifiers.set(attribute, effectSet);
    }

    return modifiers;
};

const resolveEffectSet = (mechanics: TaggedMechanic[]): ResolvedEffectSet => {
    const sources: MechanicSource[] = [];
    const effectSet: ResolvedEffectSet = { sources };
    const byEffect = groupByEffect(mechanics);

    if (byEffect.has("autoSuccess")) {
        effectSet.autoSuccess = true;
        addSources(sources, byEffect.get("autoSuccess")!);
    }

    if (byEffect.has("rollBlock")) {
        effectSet.rollBlock = true;
        addSources(sources, byEffect.get("rollBlock")!);
    }

    if (byEffect.has("rollBonus")) {
        const bonuses = byEffect.get("rollBonus")!;
        effectSet.rollBonus = Math.min(
            bonuses.reduce(
                (max, m) => Math.max(max, Number(m.mechanic.value)),
                0,
            ),
            1,
        );
        addSources(sources, bonuses);
    }

    if (byEffect.has("rollPenalty")) {
        const penalties = byEffect.get("rollPenalty")!;
        effectSet.rollPenalty = Math.min(
            penalties.reduce(
                (max, m) => Math.max(max, Number(m.mechanic.value)),
                0,
            ),
            1,
        );
        addSources(sources, penalties);
    }

    if (byEffect.has("reroll")) {
        const rerolls = byEffect.get("reroll")!;
        effectSet.reroll = pickBestReroll(rerolls);
        addSources(sources, rerolls);
    }

    if (byEffect.has("staticNumber")) {
        const statics = byEffect.get("staticNumber")!;
        effectSet.staticNumber = statics.reduce(
            (sum, m) => sum + Number(m.mechanic.value),
            0,
        );
        addSources(sources, statics);
    }

    if (byEffect.has("mortalWounds")) {
        const mws = byEffect.get("mortalWounds")!;
        const first = mws[0];
        effectSet.mortalWounds = {
            count: first.mechanic.value as number | string,
            inAddition: true,
        };
        addSources(sources, mws);
    }

    if (byEffect.has("ignoreBehaviour")) {
        effectSet.ignoreBehaviour = true;
        addSources(sources, byEffect.get("ignoreBehaviour")!);
    }

    if (byEffect.has("ignoreModifier")) {
        effectSet.ignoreModifier = true;
        addSources(sources, byEffect.get("ignoreModifier")!);
    }

    if (byEffect.has("halveDamage")) {
        effectSet.halveDamage = true;
        addSources(sources, byEffect.get("halveDamage")!);
    }

    if (byEffect.has("minDamage")) {
        const mins = byEffect.get("minDamage")!;
        effectSet.minDamage = mins.reduce(
            (max, m) => Math.max(max, Number(m.mechanic.value)),
            0,
        );
        addSources(sources, mins);
    }

    if (byEffect.has("setsFnp")) {
        const fnps = byEffect.get("setsFnp")!;
        effectSet.setsFnp = fnps.reduce(
            (best, m) => Math.min(best, Number(m.mechanic.value)),
            7,
        );
        addSources(sources, fnps);
    }

    return effectSet;
};

const groupByAttribute = (
    mechanics: TaggedMechanic[],
): Map<Attribute, TaggedMechanic[]> => {
    const map = new Map<Attribute, TaggedMechanic[]>();
    for (const tm of mechanics) {
        if (!tm.mechanic.attribute) continue;
        const attr = tm.mechanic.attribute;
        if (!map.has(attr)) {
            map.set(attr, []);
        }
        map.get(attr)!.push(tm);
    }
    return map;
};

const groupByEffect = (
    mechanics: TaggedMechanic[],
): Map<string, TaggedMechanic[]> => {
    const map = new Map<string, TaggedMechanic[]>();
    for (const tm of mechanics) {
        const effect = tm.mechanic.effect;
        if (!map.has(effect)) {
            map.set(effect, []);
        }
        map.get(effect)!.push(tm);
    }
    return map;
};

const addSources = (
    sources: MechanicSource[],
    mechanics: TaggedMechanic[],
): void => {
    for (const tm of mechanics) {
        sources.push({
            mechanicName: tm.mechanic.name,
            layer: tm.layer,
            effect: tm.mechanic.effect,
            originalValue: tm.mechanic.value,
        });
    }
};

const pickBestReroll = (mechanics: TaggedMechanic[]): RerollRule => {
    const scopes = mechanics.map((m) => {
        const val = String(m.mechanic.value);
        if (val === "all" || val === "true") return "all";
        if (val === "failures") return "failures";
        return "ones";
    });

    if (scopes.includes("all")) return { scope: "all" };
    if (scopes.includes("failures")) return { scope: "failures" };
    return { scope: "ones" };
};
