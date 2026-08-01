export type MaterialSource = {
    Name?: string | null;
    ShortName?: string | null;
} | null | undefined;

export type FormatMaterialInput = {
    description?: string | null;
    source?: MaterialSource;
};

/** Material line for invoices, dailies, weeklies, lists — appends (ShortName || Name) when source present. */
export function formatMaterial({description, source}: FormatMaterialInput): string {
    const base = (description ?? "").trim() || "N/A";
    if (!source) return base;
    const label = (source.ShortName && source.ShortName.length > 0)
        ? source.ShortName
        : source.Name;
    if (!label || !label.trim()) return base;
    return `${base} (${label.trim()})`;
}

type LoadMaterialRow = {
    LoadTypes?: {Description?: string | null} | null;
    Sources?: MaterialSource;
} | null | undefined;

/** Convenience for load/weekly/job rows that include LoadTypes + Sources relations. */
export function formatMaterialFromLoad(row: LoadMaterialRow): string {
    if (!row) return "N/A";
    return formatMaterial({
        description: row.LoadTypes?.Description,
        source: row.Sources,
    });
}
