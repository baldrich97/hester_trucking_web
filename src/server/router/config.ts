import {createRouter} from "./context";
import {isSourcesCutoverActive, getSourcesCutoverDate, NEW_LOAD_TYPE_ID_THRESHOLD} from "../../config/sourcesCutover";

export const configRouter = createRouter()
    .query("sourcesCutover", {
        async resolve() {
            return {
                active: isSourcesCutoverActive(),
                cutoverDate: getSourcesCutoverDate(),
                newLoadTypeIdThreshold: NEW_LOAD_TYPE_ID_THRESHOLD,
            };
        },
    });
