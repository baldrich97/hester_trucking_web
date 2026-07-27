import {trpc} from "../utils/trpc";
import {isSourcesCutoverForceEnabled} from "../config/sourcesCutoverClient";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../config/sourcesCutover";

export function useSourcesCutover() {
    const {data} = trpc.useQuery(["config.sourcesCutover"]);
    const clientForce = isSourcesCutoverForceEnabled();
    const serverActive = data?.active ?? false;
    const active = clientForce || serverActive;
    return {
        active,
        serverActive,
        clientForce,
        /** Client force flag is on but the API still has cutover off — open jobs / era filters will not work. */
        configMismatch: clientForce && !serverActive,
        newLoadTypeIdThreshold: data?.newLoadTypeIdThreshold ?? NEW_LOAD_TYPE_ID_THRESHOLD,
        cutoverDate: data?.cutoverDate,
    };
}
