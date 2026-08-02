export type TableColumnsType = {
  name: string;
  as?: string;
  align?: "left" | "right" | "center" | "justify" | "inherit" | undefined;
  navigateTo?: string;
  column?: string;
}[];

export type TableColumnOverridesType = {
  name: string;
  type: "checkbox" | "button" | "link" | "date" | "action" | 'checkbox-action';
  callback?: any;
  icon?: any;
}[];

export type FormFieldsType = {
  name: string;
  size: number;
  label?: string;
  required: boolean;
  errorMessage?: string;
  type: "textfield" | "select" | "selectList" | "checkbox" | "date" | "padding" | "week";
  shouldErrorOn?: string[];
  multiline?: boolean;
  maxRows?: number;
  number?: boolean;
  disabled?: boolean;
  /**
   * tRPC router name powering the autocomplete (e.g. `"loadtypes"`). Both
   * `${searchQuery}.search` (live menu) and `${searchQuery}.get` (selected-row
   * hydration) are invoked. See `server/router/_dropdownSearch.ts`.
   */
  searchQuery?: string;
  /**
   * Property on each option row used for MUI `groupBy` (e.g. `"Group"` or `"Recommend"`).
   */
  groupBy?: string;
  /**
   * Pipe-delimited map of server group keys to display labels, or two-bucket
   * labels for boolean `Recommend` (e.g. `"Driver=Driven Before|Other=New for Driver"`).
   */
  groupByNames?: string;
  /** When false, autocomplete options are flat (no group headers). Default true. */
  enableOptionGroups?: boolean;
  newOptionLabel?: string;
  onNewOptionClick?: () => void;
  /** When true, driver/truck search only returns active rows (Load form). */
  onlyActive?: boolean;
  /** For `selectList`: menu `""` becomes `null`, other values become integers (nullable FK). */
  coerceNumberOrNull?: boolean;
}[];

export type SelectDataType = {
  key: string;
  data: Record<string, unknown>[];
  optionValue: string;
  optionLabel: string;
  defaultValue?: number | null;
}[];
