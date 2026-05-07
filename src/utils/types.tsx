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
  searchQuery?: string;
  groupBy?: string | null;
  groupByNames?: string | null;
  /** When false, autocomplete options are flat (no group headers). Default true. */
  enableOptionGroups?: boolean;
  newOptionLabel?: string;
  onNewOptionClick?: () => void;
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
