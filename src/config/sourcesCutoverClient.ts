import {env} from "../env/client.mjs";

/** Client-side cutover flag — force via NEXT_PUBLIC_SOURCES_CUTOVER_FORCE; date from tRPC config.sourcesCutover. */
export function isSourcesCutoverForceEnabled(): boolean {
    return env.NEXT_PUBLIC_SOURCES_CUTOVER_FORCE === "true";
}
