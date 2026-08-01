import React from "react";
import {Box, Button, Modal, TextField, Typography} from "@mui/material";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import type {Dayjs} from "dayjs";
import type {CompleteFormOptions} from "../../../prisma/zod";
import {modalTitleForCadence} from "../../utils/driverFormCompliance";
import type {ExpiryPreview} from "../../utils/driverFormFilingUtils";

type DriverFormFilingModalProps = {
    open: boolean;
    mode: "w2" | "oo";
    selectedForm: CompleteFormOptions | null;
    selectedDate: Dayjs | null;
    filerName: string;
    expiryPreview: ExpiryPreview | null;
    isSaving: boolean;
    onClose: () => void;
    onDateChange: (value: Dayjs | null) => void;
    onFilerChange: (value: string) => void;
    onSave: () => void;
};

export default function DriverFormFilingModal({
    open,
    mode,
    selectedForm,
    selectedDate,
    filerName,
    expiryPreview,
    isSaving,
    onClose,
    onDateChange,
    onFilerChange,
    onSave,
}: DriverFormFilingModalProps) {
    return (
        <Modal open={open} onClose={onClose}>
            <Box
                sx={{
                    p: 4,
                    backgroundColor: "background.paper",
                    borderRadius: 2,
                    boxShadow: 24,
                    width: mode === "oo" ? 400 : 320,
                    mx: "auto",
                    mt: "15%",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                }}
            >
                <Typography variant="h6">
                    {selectedForm ? modalTitleForCadence(selectedForm.ExpiryCadence) : "Set date"}
                </Typography>

                <DatePicker
                    label={
                        selectedForm?.ExpiryCadence === "EXPIRATION_DATE"
                            ? "Expiration date"
                            : "Select date"
                    }
                    value={selectedDate}
                    onChange={(newValue) => onDateChange(newValue)}
                    renderInput={(params) => <TextField {...params} />}
                />
                {mode === "oo" ? (
                    <TextField
                        size="small"
                        label="Filer (optional)"
                        placeholder="Who submitted this paperwork"
                        value={filerName}
                        onChange={(e) => onFilerChange(e.target.value)}
                        fullWidth
                    />
                ) : null}
                {expiryPreview ? (
                    <Box
                        sx={{
                            border: "1px solid",
                            borderColor: "divider",
                            borderRadius: 1,
                            p: 1.25,
                            bgcolor: "grey.50",
                        }}
                    >
                        <Typography variant="subtitle2">{expiryPreview.title}</Typography>
                        <Typography variant="body2" color="text.secondary">
                            {expiryPreview.detail}
                        </Typography>
                    </Box>
                ) : null}

                <Box display="flex" justifyContent="flex-end" gap={1}>
                    <Button variant="outlined" color="inherit" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        color="primary"
                        variant="contained"
                        onClick={onSave}
                        disabled={!selectedDate || isSaving}
                    >
                        Save
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}
