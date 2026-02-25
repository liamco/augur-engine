/**
 * TestUnit - A consolidated type that matches the actual parsed structure
 * of a datasheet JSON file as it exists in src/app/data/output/factions/{slug}/datasheets/{id}.json
 *
 * This differs from the Datasheet interface in src/app/types/Units.tsx in that it
 * reflects the real shape of the parsed JSON data, including fields that exist in the
 * data but are missing from or mistyped on the Datasheet interface.
 */

import { Ability } from "./Ability";
import { CombatState } from "./State";

// =============================================================================
// Mechanic System Types (from src/app/game-engine/types/Mechanic.ts)
// =============================================================================

type Entity =
    | "thisArmy"
    | "thisUnit"
    | "thisModel"
    | "opponentArmy"
    | "opposingUnit"
    | "opposingModel"
    | "targetUnit"
    | "targetModel";

type Effect =
    | "rollBonus"
    | "rollPenalty"
    | "staticNumber"
    | "addsKeyword"
    | "addsAbility"
    | "reroll"
    | "autoSuccess"
    | "mortalWounds"
    | "ignoreModifier"
    | "halveDamage"
    | "minDamage"
    | "setsFnp";

type RollAttribute = "h" | "w" | "s";
type UnitAttribute = "m" | "t" | "sv" | "invSv" | "w" | "ld" | "oc" | "fnp";
type WeaponAttribute = "range" | "a" | "bsWs" | "s" | "ap" | "d";
type Attribute = RollAttribute | UnitAttribute | WeaponAttribute;

type Operator =
    | "equals"
    | "notEquals"
    | "greaterThan"
    | "greaterThanOrEqualTo"
    | "lessThan"
    | "lessThanOrEqualTo"
    | "includes"
    | "notIncludes";

interface TestCondition {
    entity: Entity;
    attribute?: Attribute;
    abilities?: string[];
    state?: string;
    keywords?: string[];
    operator: Operator;
    value: boolean | number | string | string[];
}

interface TestMechanic {
    entity: Entity;
    effect: Effect;
    attribute?: Attribute;
    abilities?: string[];
    keywords?: string[];
    state?: string[];
    value: boolean | number | string;
    conditions?: TestCondition[];
}

// =============================================================================
// Eligibility Rule Types (from src/app/types/Weapons.tsx)
// =============================================================================

type EligibilityRuleType = "any" | "modelType" | "ratio" | "count";

interface TestEligibilityRuleAny {
    type: "any";
}

interface TestEligibilityRuleModelType {
    type: "modelType";
    modelType: string[];
}

interface TestEligibilityRuleRatio {
    type: "ratio";
    ratio: number;
    count: number;
    modelType?: string[];
}

interface TestEligibilityRuleCount {
    type: "count";
    count: number;
    modelType?: string[];
}

type TestEligibilityRule =
    | TestEligibilityRuleAny
    | TestEligibilityRuleModelType
    | TestEligibilityRuleRatio
    | TestEligibilityRuleCount;

// =============================================================================
// Weapon Types
// =============================================================================

interface TestWeaponProfile {
    datasheetId: string;
    line: number;
    lineInWargear?: number;
    dice: string;
    name: string;
    type: "Ranged" | "Melee";
    attributes: string[];
    range: number | string; // number for ranged (e.g. 18), "Melee" for melee
    a: number | string; // number or dice expression (e.g. "D6")
    bsWs: number | string; // number or "N/A" for auto-hit weapons
    s: number;
    ap: number;
    d: number | string; // number or dice expression (e.g. "D3")
}

interface TestWeapon {
    id: string; // Format: "{datasheetId}:{weapon-slug}"
    datasheetId: string;
    line: number;
    name: string;
    type: "Ranged" | "Melee";
    profiles: TestWeaponProfile[];
    eligibility?: TestEligibilityRule[];
    count?: number; // Number of this weapon the model has (default: 1)
}

// =============================================================================
// Model Types
// =============================================================================

interface TestModel {
    datasheetId: string;
    line: number;
    name: string;
    m: number;
    t: number;
    sv: number;
    invSv: number | null;
    invSvDescr: string;
    w: number;
    ld: number;
    oc: number;
    baseSize: string;
    baseSizeDescr: string;
    composition: TestModelComposition;
}

// =============================================================================
// Keyword Type
// =============================================================================

interface TestKeyword {
    keyword: string;
    model: string;
    isFactionKeyword: boolean;
}

// =============================================================================
// Model Composition & Cost Types
// =============================================================================

interface TestModelComposition {
    min: number;
    max: number;
}

interface TestModelCosts {
    cost: number;
    count: number;
}

// =============================================================================
// Damaged Profile Types
// =============================================================================

interface TestDamagedMechanic {
    entity: string;
    effect: string;
    attribute: string;
    value: number;
    conditions?: {
        weapon?: string;
        operator?: string;
        value?: string;
    }[];
}

interface TestDamagedProfile {
    range: string; // e.g. "1-5"
    threshold: number; // Upper bound (e.g. 5)
    description: string;
    mechanics: TestDamagedMechanic[];
}

// =============================================================================
// Leader Types
// =============================================================================

interface TestLeaderConditions {
    allowedExistingLeaderKeywords?: string[];
    allowsAnyExistingLeader?: boolean;
    equipmentRequirements?: {
        targetUnitKeywords: string[];
        requiredEquipment: string;
    }[];
    maxOfThisType?: number;
    mustAttach?: boolean;
}

interface TestLeaderData {
    description: string;
    footer: string;
    conditions: TestLeaderConditions | null;
    attachableUnits: string[];
}

// =============================================================================
// Wargear Types
// =============================================================================

interface TestRawWargearOption {
    datasheetId: string;
    line: number;
    button: string;
    description: string;
}

interface TestWeaponRef {
    name: string;
    count: number;
}

interface TestWeaponChoice {
    weapons: TestWeaponRef[];
    isPackage: boolean;
}

type TestTargetingType =
    | "this-model"
    | "specific-model"
    | "n-model-specific"
    | "all-models"
    | "any-number"
    | "ratio"
    | "ratio-capped"
    | "up-to-n"
    | "each-model-type"
    | "conditional"
    | "this-unit"
    | "if-unit-size"
    | "unknown";

type TestActionType = "replace" | "add" | "unknown";

interface TestTargetingCondition {
    type: "equipped-with" | "not-equipped-with" | "already-equipped";
    weaponName?: string;
    weaponNames?: string[];
}

interface TestTargetingDef {
    type: TestTargetingType;
    modelType?: string;
    count?: number;
    ratio?: number;
    maxPerRatio?: number;
    maxTotal?: number;
    condition?: TestTargetingCondition;
    unitSizeThreshold?: number;
}

interface TestActionDef {
    type: TestActionType;
    removes: TestWeaponRef[];
    adds: TestWeaponChoice[];
    isChoiceList: boolean;
}

interface TestConstraintsDef {
    restrictedWeapons?: string[];
    noDuplicates?: boolean;
    allowDuplicates?: boolean;
    mustBeDifferent?: boolean;
    maxSelections?: number;
}

interface TestWargearOptionDef {
    line: number;
    rawText: string;
    wargearParsed: boolean;
    targeting: TestTargetingDef;
    action: TestActionDef;
    constraints: TestConstraintsDef;
}

interface TestWargearOptionsContainer {
    raw: TestRawWargearOption[];
    parsed?: TestWargearOptionDef[]; // Present when options have been parsed
    allParsed?: boolean;
}

interface TestDefaultLoadout {
    raw: string; // Raw HTML text
    parsed: string[]; // Weapon/ability IDs for the primary model type
    byModelType?: Record<string, string[]>; // Weapon/ability IDs keyed by model type name
}

interface TestValidLoadoutGroup {
    modelType: string; // "any", "all", or specific model type name
    items: string[][]; // Array of valid loadouts (each is array of weapon/ability IDs)
}

interface TestWargearAbility {
    id: string; // Format: "{datasheetId}:{slug}" or "wargear-ability:{slug}"
    name: string;
    description?: string;
    mechanics?: TestMechanic[];
    mechanicsSource?: "openai" | "regex";
    eligibility?: TestEligibilityRule[];
}

interface TestWargearData {
    defaultLoadout: TestDefaultLoadout;
    weapons: TestWeapon[];
    abilities: TestWargearAbility[];
    options: TestWargearOptionsContainer;
    validLoadouts: TestValidLoadoutGroup[];
    loadoutsParsed: boolean;
    unitWideOptions?: string[]; // Weapon/ability IDs for unit-wide toggle options
}

// =============================================================================
// Supplement Types
// =============================================================================

interface TestSupplementData {
    key: string;
    slug: string;
    name: string;
    label: string;
    isSupplement: boolean;
}

// =============================================================================
// Datasheet Reference Types
// =============================================================================

interface TestDatasheetReference {
    id: string;
    slug: string;
}

// =============================================================================
// TestUnit - The consolidated parsed datasheet type
// =============================================================================

// =============================================================================
// Faction & Source Types
// =============================================================================

interface TestFaction {
    id: string;
    slug: string;
}

interface TestSource {
    id: string;
    name: string;
}

// =============================================================================
// Leader Types (new structure)
// =============================================================================

interface TestLeaderInfo {
    canLead: TestDatasheetReference[];
    leaderNotes: string;
}

// =============================================================================
// TestUnit - The consolidated parsed datasheet type
// =============================================================================

export interface TestUnit {
    // Identity
    id: string;
    name: string;
    slug: string;
    legend: string;
    faction: TestFaction;
    source: TestSource;

    // Display / metadata
    role: string;
    transport: string;
    isForgeWorld: boolean;
    isLegends: boolean;

    // Core unit data
    models: TestModel[];
    pointsCosts: TestModelCosts[];
    keywords: TestKeyword[];
    abilities: Ability[];

    // Consolidated parsed structures
    supplement: TestSupplementData;
    damaged: TestDamagedProfile | null;
    leader: TestLeaderInfo | null;
    wargear: TestWargearData;

    combatState: CombatState;
}
