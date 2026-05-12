/** Driver-shaped object with optional `Active` (defaults to active when missing). */
export function formatDriverDisplayName(
    d: {FirstName?: string | null; LastName?: string | null; Active?: boolean | null} | null | undefined,
): string {
    if (!d) return "N/A";
    const base = `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim() || "N/A";
    if (d.Active === false) return `${base} - INACTIVE`;
    return base;
}

/** Truck-shaped object with optional `Active`. */
export function formatTruckDisplayName(
    t: {Name?: string | null; Active?: boolean | null} | null | undefined,
): string {
    if (!t) return "N/A";
    const base = (t.Name && t.Name.trim()) || "N/A";
    if (t.Active === false) return `${base} - INACTIVE`;
    return base;
}
