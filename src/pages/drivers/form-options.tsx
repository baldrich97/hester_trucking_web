import React, {useEffect, useState} from "react";
import {trpc} from "../../utils/trpc";
import {FormExpiryCadence} from "@prisma/client";
import {FormOptionsModel} from "../../../prisma/zod";
import {z} from "zod";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Checkbox from "@mui/material/Checkbox";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import {toast} from "react-toastify";
import {confirmDestructive} from "../../utils/appConfirm";

type FormOptionsRow = z.infer<typeof FormOptionsModel> & {
    Forms: { Name: string; DisplayName: string };
};

const cadences = Object.values(FormExpiryCadence);

const expiryTypeLabels: Record<FormExpiryCadence, string> = {
    NONE: "No expiry",
    EXPIRATION_DATE: "By explicit expiration date",
    CALENDAR_YEAR: "Calendar year (resets Jan 1)",
    CALENDAR_MONTH: "Calendar month (resets monthly)",
    ROLLING_MONTHS: "Rolling months from submitted date",
};

function RowEditor({row, onSaved}: {row: FormOptionsRow; onSaved: () => void}) {
    const [draft, setDraft] = useState<FormOptionsRow>(row);
    useEffect(() => {
        setDraft(row);
    }, [
        row.ID,
        row.W2Visible,
        row.OOVisible,
        row.W2Required,
        row.OORequired,
        row.FleetWide,
        row.ExpiryCadence,
        row.ValidityMonths,
        row.PdfColumnLabel,
        row.IncludeInPdf,
        row.Forms.DisplayName,
        row.Forms.Name,
    ]);

    const update = trpc.useMutation("formOptions.update", {
        onSuccess() {
            toast.success("Saved");
            onSaved();
        },
        onError(e) {
            toast.error(e.message);
        },
    });

    const remove = trpc.useMutation("formsCatalog.deleteWithOptions", {
        onSuccess() {
            toast.success("Form deleted");
            onSaved();
        },
        onError(e) {
            toast.error(e.message);
        },
    });

    const setField =
        <K extends keyof FormOptionsRow>(key: K) =>
        (value: FormOptionsRow[K]) => {
            setDraft((d) => ({...d, [key]: value}));
        };

    const pdfLocked = draft.W2Required || draft.OORequired;

    const setRequired =
        (key: "W2Required" | "OORequired") => (value: boolean) => {
            setDraft((d) => ({
                ...d,
                [key]: value,
                IncludeInPdf: value ? true : d.IncludeInPdf,
            }));
        };

    return (
        <TableRow>
            <TableCell>
                <Typography variant="body2" fontWeight="bold">
                    {row.Forms.DisplayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {row.Forms.Name}
                </Typography>
            </TableCell>
            <TableCell>
                <Tooltip title="Show this form on the W2 driver forms page.">
                    <Checkbox
                        checked={draft.W2Visible}
                        onChange={(_, v) => setField("W2Visible")(v)}
                    />
                </Tooltip>
            </TableCell>
            <TableCell>
                <Tooltip title="Show this form on the Non-W2 / owner-operator forms page.">
                    <Checkbox
                        checked={draft.OOVisible}
                        onChange={(_, v) => setField("OOVisible")(v)}
                    />
                </Tooltip>
            </TableCell>
            <TableCell>
                <Tooltip title="Mark this form as required for W2 compliance.">
                    <Checkbox
                        checked={draft.W2Required}
                        onChange={(_, v) => setRequired("W2Required")(v)}
                    />
                </Tooltip>
            </TableCell>
            <TableCell>
                <Tooltip title="Mark this form as required for Non-W2 / owner-operator compliance.">
                    <Checkbox
                        checked={draft.OORequired}
                        onChange={(_, v) => setRequired("OORequired")(v)}
                    />
                </Tooltip>
            </TableCell>
            <TableCell>
                <Tooltip title="When checked, this form is only required for OO entities with more than one truck on file (solo single-truck operators skip it). Combine with OO required to gate required OO forms by fleet size.">
                    <Checkbox
                        checked={draft.FleetWide}
                        onChange={(_, v) => setField("FleetWide")(v)}
                    />
                </Tooltip>
            </TableCell>
            <TableCell>
                <FormControl size="small" fullWidth>
                    <InputLabel>Expiry type</InputLabel>
                    <Select
                        label="Expiry type"
                        value={draft.ExpiryCadence}
                        onChange={(e) =>
                            setField("ExpiryCadence")(e.target.value as FormExpiryCadence)
                        }
                    >
                        {cadences.map((c) => (
                            <MenuItem key={c} value={c}>
                                {expiryTypeLabels[c]}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </TableCell>
            <TableCell>
                <TextField
                    size="small"
                    type="number"
                    label="Validity (months)"
                    value={draft.ValidityMonths ?? ""}
                    onChange={(e) =>
                        setField("ValidityMonths")(
                            e.target.value === "" ? null : parseInt(e.target.value, 10),
                        )
                    }
                    helperText="Used only when expiry type is rolling months"
                />
            </TableCell>
            <TableCell>
                <TextField
                    size="small"
                    label="PDF column label"
                    value={draft.PdfColumnLabel ?? ""}
                    onChange={(e) =>
                        setField("PdfColumnLabel")(e.target.value === "" ? null : e.target.value)
                    }
                />
            </TableCell>
            <TableCell>
                <Tooltip
                    title={
                        pdfLocked
                            ? "Required forms must appear on the printable driver-forms PDF and cannot be excluded."
                            : "Include this form as a column in the printable Driver Forms PDF."
                    }
                >
                    <span>
                        <Checkbox
                            checked={draft.IncludeInPdf || pdfLocked}
                            disabled={pdfLocked}
                            onChange={(_, v) => setField("IncludeInPdf")(v)}
                        />
                    </span>
                </Tooltip>
            </TableCell>
            <TableCell>
                <Box sx={{display: "flex", gap: 0.5, alignItems: "center"}}>
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() =>
                            update.mutate(
                                FormOptionsModel.parse({
                                    ID: draft.ID,
                                    Form: draft.Form,
                                    W2Visible: draft.W2Visible,
                                    OOVisible: draft.OOVisible,
                                    W2Required: draft.W2Required,
                                    OORequired: draft.OORequired,
                                    FleetWide: draft.FleetWide,
                                    ExpiryCadence: draft.ExpiryCadence,
                                    ValidityMonths: draft.ValidityMonths,
                                    PdfOrder: draft.PdfOrder,
                                    PdfColumnLabel: draft.PdfColumnLabel,
                                    IncludeInPdf: pdfLocked ? true : draft.IncludeInPdf,
                                }),
                            )
                        }
                        disabled={update.isLoading}
                    >
                        Save
                    </Button>
                    <Tooltip title="Delete this form option and all driver filings for it">
                        <IconButton
                            size="small"
                            aria-label="Delete form"
                            disabled={remove.isLoading}
                            onClick={() =>
                                confirmDestructive({
                                    title: "Delete form?",
                                    message: `Deleting "${row.Forms.DisplayName}" removes this form from compliance tracking and permanently deletes every driver filing recorded for it. This cannot be undone.`,
                                    confirmLabel: "Delete",
                                    onConfirm: () => remove.mutate({formOptionId: row.ID}),
                                })
                            }
                        >
                            <CloseIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </TableCell>
        </TableRow>
    );
}

export default function FormOptionsPage() {
    const {data: rows = [], refetch} = trpc.useQuery(["formOptions.getAll"]);
    const [newName, setNewName] = useState("");
    const createForm = trpc.useMutation("formsCatalog.createWithOptions", {
        onSuccess() {
            toast.success("Form added");
            setNewName("");
            refetch();
        },
        onError(e) {
            toast.error(e.message);
        },
    });

    return (
        <Box>
            <Typography variant="h5" sx={{mb: 2}}>
                Form options
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Configure which forms appear for W-2 vs owner-operators, expiry rules, optional PDF
                column labels and inclusion in the printable driver-forms PDF, and fleet-wide rules (some
                forms are only required when an OO entity has more than one truck on file). OO filings
                are shared across the entity (carrier group or solo operator).
            </Typography>
            <Box sx={{display: "flex", gap: 1, mb: 3, alignItems: "center"}}>
                <TextField
                    size="small"
                    label="New form internal name"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                />
                <Button
                    variant="outlined"
                    disabled={!newName.trim() || createForm.isLoading}
                    onClick={() =>
                        createForm.mutate({Name: newName.trim(), DisplayName: newName.trim()})
                    }
                >
                    Add form
                </Button>
            </Box>
            <Table size="small">
                <TableHead>
                    <TableRow>
                        <TableCell>Form</TableCell>
                        <TableCell>W2 vis</TableCell>
                        <TableCell>OO vis</TableCell>
                        <TableCell>W2 req</TableCell>
                        <TableCell>OO req</TableCell>
                        <TableCell>Fleet-wide</TableCell>
                        <TableCell>Expiry type</TableCell>
                        <TableCell>Validity (months)</TableCell>
                        <TableCell>PDF label</TableCell>
                        <TableCell>PDF</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {rows.map((row) => (
                        <RowEditor key={row.ID} row={row as FormOptionsRow} onSaved={refetch} />
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}
