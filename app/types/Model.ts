export interface ModelDatasheet {
    datasheetId: string;
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
}

export interface ModelInstance {
    instanceId: string;
    modelType: string;
    modelTypeLine: number;
    loadout: string[];
    defaultLoadout: string[];
    optionSelections?: Record<number, string>;
    sourceUnitName?: string;
}
