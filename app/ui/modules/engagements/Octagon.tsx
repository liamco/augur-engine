import { TestUnit } from "../../../types/Test";

import attackingUnitData from "../../../data/output/heavy-intercessor-squad.json";
import defendingUnitData from "../../../data/output/winged-tyranid-prime.json";

const Octagon = () => {
    return (
        <main className="grid grid-cols-2 w-full max-w-150 h-full gap-4 text-center">
            <h1 className="col-span-2">Results</h1>
            <strong>Attacks</strong>
            <span>-</span>
            <strong>To hit</strong>
            <span></span>
            <strong>To wound</strong>
            <span>-</span>
            <strong>To save</strong>
            <span>-</span>
            <strong>Feel no pain</strong>
            <span>-</span>
        </main>
    );
};

export default Octagon;
