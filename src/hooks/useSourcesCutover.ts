import {trpc} from "../utils/trpc";
import {isSourcesCutoverForceEnabled} from "../config/sourcesCutoverClient";
import {NEW_LOAD_TYPE_ID_THRESHOLD} from "../config/sourcesCutover";

export function useSourcesCutover() {
    const {data} = trpc.useQuery(["config.sourcesCutover"]);
    const active = isSourcesCutoverForceEnabled() || (data?.active ?? false);
    return {
        active,
        newLoadTypeIdThreshold: data?.newLoadTypeIdThreshold ?? NEW_LOAD_TYPE_ID_THRESHOLD,
        cutoverDate: data?.cutoverDate,
    };
}
