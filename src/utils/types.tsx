export type TableColumnsType = {name: string, as?: string, align?: 'left' | 'right' | 'center' | 'justify' | 'inherit' | undefined, navigateTo?: string}[]

export type TableColumnOverridesType = {name: string, type: 'checkbox' | 'button'}[];

export type FormFieldsType = { name: string, size: number, label?: string, required: boolean, errorMessage?: string, type: 'textfield' | 'select' | 'checkbox' | 'date', shouldErrorOn?: string[], multiline?: boolean, maxRows?: number, number?: boolean }[];

export type SelectDataType = { key: string, data: Record<string, unknown>[], optionValue: string, optionLabel: string, defaultValue?: number }[];
