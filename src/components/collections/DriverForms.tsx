import {CompleteFormOptions, DriverFormsModel, DriversModel} from "../../../prisma/zod";
import {useRouter} from "next/router";
import {trpc} from "../../utils/trpc";
import React, {useMemo, useState} from "react";
import {Dayjs} from "dayjs";
import {confirmAlert} from "react-confirm-alert";
import {toast} from "react-toastify";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import Grid2 from "@mui/material/Unstable_Grid2";
import {Box, Button, Checkbox, Modal, TextField, Tooltip, Typography} from "@mui/material";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import {z} from "zod";
import "react-confirm-alert/src/react-confirm-alert.css";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import type {Trucks} from "@prisma/client";
import {tableTextLinkSx} from "../../theme/muiShared";
import {
    driverMissingRequiredForm,
    getDriverFormRecord,
    isDriverFormRecordCompliant,
    isFormSatisfiedForDriver,
    modalTitleForCadence,
    ooDriverTrucksVitalOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";
import {dateOnlyLocalToUtcNoon} from "../../utils/dateOnly";

function fmtDate(d: Date): string {
    return d.toLocaleDateString();
}

function addMonths(base: Date, months: number): Date {
    const d = new Date(base);
    d.setMonth(d.getMonth() + months);
    return d;
}

function cadenceTooltipDetail(
    cadence: CompleteFormOptions["ExpiryCadence"],
    filedDate: Date,
    explicitExpiration: Date | null,
    validityMonths: number | null | undefined,
): string {
    switch (cadence) {
        case "NONE":
            return "Does not expire.";
        case "EXPIRATION_DATE":
            return explicitExpiration
                ? `Expires: ${fmtDate(new Date(explicitExpiration))}`
                : "Missing expiration date.";
        case "CALENDAR_YEAR": {
            const y = filedDate.getFullYear();
            const validThrough = new Date(y, 11, 31);
            return `Valid through ${fmtDate(validThrough)} (calendar year).`;
        }
        case "CALENDAR_MONTH": {
            const validThrough = new Date(filedDate.getFullYear(), filedDate.getMonth() + 1, 0);
            return `Valid through ${fmtDate(validThrough)} (calendar month).`;
        }
        case "ROLLING_MONTHS": {
            const n = validityMonths ?? 1;
            const expires = addMonths(filedDate, n);
            return `Expires: ${fmtDate(expires)} (${n} rolling month(s)).`;
        }
        default:
            return "";
    }
}

const DataModel = DriversModel.extend({
    DriverForms: z.array(DriverFormsModel).optional(),
});

type DataType = z.infer<typeof DataModel> & {
    TrucksDriven?: { TruckID: number; Trucks: Trucks | null }[];
};

const Driver_Forms = ({
    data,
    all_forms,
    mode,
}: {
    data: DataType[];
    all_forms: CompleteFormOptions[];
    mode: "w2" | "oo";
}) => {
    const router = useRouter();

    const driverShapes: DriverComplianceShape[] = useMemo(
        () =>
            data.map((d) => ({
                ID: d.ID,
                CarrierID: d.CarrierID ?? null,
                OwnerOperator: d.OwnerOperator,
                DriverForms: (d.DriverForms ?? []).map((df) => ({
                    Form: df.Form,
                    Expiration: df.Expiration ? new Date(df.Expiration as unknown as string) : null,
                    Created: new Date(df.Created as unknown as string),
                })),
            })),
        [data],
    );

    const formOptShapes: FormOptionComplianceShape[] = useMemo(
        () =>
            all_forms.map((f) => ({
                Form: f.Form,
                CarrierWide: f.CarrierWide,
                ExpiryCadence: f.ExpiryCadence,
                ValidityMonths: f.ValidityMonths ?? null,
                W2Visible: f.W2Visible,
                OOVisible: f.OOVisible,
                W2Required: f.W2Required,
                OORequired: f.OORequired,
            })),
        [all_forms],
    );

    const deleteDriverForm = trpc.useMutation("driverForms.delete", {
        onSuccess: async () => {
            setSelectedForm(null);
            setSelectedDriver(null);
            setSelectedDate(null);
            await router.replace(router.asPath);
        },
        onError: (err: unknown) => {
            console.error("Failed to delete driver form", err);
        },
    });

    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [selectedForm, setSelectedForm] = useState<CompleteFormOptions | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<DataType | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    const expiryPreview = useMemo(() => {
        if (!selectedForm) return null;
        const cadence = selectedForm.ExpiryCadence;
        const picked = selectedDate ? selectedDate.toDate() : null;
        const validityMonths = selectedForm.ValidityMonths ?? 1;

        if (!picked) {
            switch (cadence) {
                case "NONE":
                    return {
                        title: "No expiry",
                        detail: "This form does not expire once filed.",
                    };
                case "EXPIRATION_DATE":
                    return {
                        title: "Explicit expiration date",
                        detail: "Pick the exact date this filing should expire.",
                    };
                case "CALENDAR_YEAR":
                    return {
                        title: "Calendar year",
                        detail: "Pick the filing date; it stays valid through Dec 31 of that year.",
                    };
                case "CALENDAR_MONTH":
                    return {
                        title: "Calendar month",
                        detail: "Pick the filing date; it stays valid through the end of that month.",
                    };
                case "ROLLING_MONTHS":
                    return {
                        title: "Rolling months",
                        detail: `Pick the filing date; it expires ${validityMonths} month(s) later.`,
                    };
                default:
                    return null;
            }
        }

        switch (cadence) {
            case "NONE":
                return {
                    title: "No expiry",
                    detail: `Filed ${fmtDate(picked)}. This filing will not expire.`,
                };
            case "EXPIRATION_DATE":
                return {
                    title: "Explicit expiration date",
                    detail: `Filed ${fmtDate(picked)}. Expires on ${fmtDate(picked)}.`,
                };
            case "CALENDAR_YEAR": {
                const expires = new Date(picked.getFullYear() + 1, 0, 1);
                return {
                    title: "Calendar year",
                    detail: `Filed ${fmtDate(picked)}. Valid through 12/31/${picked.getFullYear()} (expires ${fmtDate(expires)}).`,
                };
            }
            case "CALENDAR_MONTH": {
                const expires = new Date(picked.getFullYear(), picked.getMonth() + 1, 1);
                return {
                    title: "Calendar month",
                    detail: `Filed ${fmtDate(picked)}. Valid through ${fmtDate(new Date(picked.getFullYear(), picked.getMonth() + 1, 0))} (expires ${fmtDate(expires)}).`,
                };
            }
            case "ROLLING_MONTHS": {
                const expires = addMonths(picked, validityMonths);
                return {
                    title: "Rolling months",
                    detail: `Filed ${fmtDate(picked)}. Expires on ${fmtDate(expires)} (${validityMonths} month(s) rolling).`,
                };
            }
            default:
                return null;
        }
    }, [selectedDate, selectedForm]);

    const shapeFor = (id: number) => driverShapes.find((s) => s.ID === id)!;

    const handleCheckboxClick = (driver: DataType, form: CompleteFormOptions) => {
        const dShape = shapeFor(driver.ID);
        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
        const satisfied = isFormSatisfiedForDriver(dShape, fShape, driverShapes);
        const localMatch = getDriverFormRecord(dShape.DriverForms, form.Form);

        if (!satisfied) {
            setSelectedDriver(driver);
            setSelectedForm(form);
            setSelectedDate(null);
            setModalOpen(true);
            return;
        }

        if (satisfied && !localMatch) {
            toast.info("This form is satisfied by another driver under the same carrier.", {
                autoClose: 3500,
            });
            return;
        }

        confirmAlert({
            title: "Remove filing",
            message: `Remove ${form.Forms.DisplayName} for ${driver.FirstName ?? ""} ${driver.LastName ?? ""}? The date will be cleared; re-check the box to set a new date.`,
            buttons: [
                {
                    label: "Yes",
                    onClick: () => {
                        deleteDriverForm.mutate({
                            driverId: driver.ID,
                            formId: form.Form,
                        });
                    },
                },
                {label: "No", onClick: () => undefined},
            ],
        });
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedDriver(null);
        setSelectedForm(null);
        setSelectedDate(null);
    };

    const addDriverForm = trpc.useMutation("driverForms.put", {
        async onSuccess() {
            toast.success("Successfully submitted!", {autoClose: 2000});
        },
    });

    const handleDateSave = async () => {
        if (selectedForm === null || selectedDriver === null || selectedDate === null) {
            return;
        }
        toast.info("Submitting...", {autoClose: 2000});
        const pickedDate = dateOnlyLocalToUtcNoon(selectedDate.toDate());
        await addDriverForm.mutateAsync({
            Form: selectedForm.Form,
            Driver: selectedDriver.ID,
            Expiration: pickedDate,
        });
        await router.replace(router.asPath);
        handleModalClose();
    };

    const pdfKind = mode === "w2" ? "w2" : "oo";

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{mb: 2, display: "flex", gap: 2, alignItems: "center"}}>
                <Button
                    component="a"
                    href={`/api/getPDF/driver-forms/${pdfKind}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                >
                    Download PDF
                </Button>
            </Box>
            <Grid2 container direction="column" spacing={2}>
                <Grid2 container>
                    <Grid2 xs={2}>
                        <Typography fontWeight="bold">Driver</Typography>
                    </Grid2>
                    {mode === "oo" ? (
                        <Grid2 xs={1}>
                            <Typography fontWeight="bold" align="center">
                                Trucks
                            </Typography>
                        </Grid2>
                    ) : null}
                    {all_forms.map((form) => (
                        <Grid2 key={form.ID} xs>
                            <Typography fontWeight="bold" align="center">
                                {form.Forms.DisplayName}
                            </Typography>
                        </Grid2>
                    ))}
                </Grid2>

                {data.map((driver) => {
                    const dShape = shapeFor(driver.ID);
                    const formsBad = driverMissingRequiredForm(
                        dShape,
                        formOptShapes,
                        driverShapes,
                        mode,
                    );
                    const trucksBad =
                        mode === "oo" ? !ooDriverTrucksVitalOk(driver.TrucksDriven ?? []) : false;

                    return (
                        <Grid2 container key={driver.ID} alignItems="center">
                            <Grid2 xs={2}>
                                <Typography>
                                    <Typography
                                        component="span"
                                        role="link"
                                        tabIndex={0}
                                        onClick={() => {
                                            void router.push(`/drivers/${driver.ID}`);
                                        }}
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter" || e.key === " ") {
                                                e.preventDefault();
                                                void router.push(`/drivers/${driver.ID}`);
                                            }
                                        }}
                                        sx={{
                                            ...tableTextLinkSx,
                                            display: "inline",
                                            cursor: "pointer",
                                        }}
                                    >
                                        {`${driver.FirstName ?? ""} ${driver.LastName ?? ""}`}
                                    </Typography>
                                    {formsBad || trucksBad ? (
                                        <Typography component="span" color="error" sx={{ml: 0.5}}>
                                            *
                                        </Typography>
                                    ) : null}
                                </Typography>
                            </Grid2>
                            {mode === "oo" ? (
                                <Grid2 xs={1} display="flex" justifyContent="center">
                                    <Tooltip
                                        title={
                                            ooDriverTrucksVitalOk(driver.TrucksDriven ?? [])
                                                ? "All driven trucks have VIN and license plate."
                                                : "A truck this driver has driven is missing VIN or plate, is deleted, or no trucks on file."
                                        }
                                    >
                                        {ooDriverTrucksVitalOk(driver.TrucksDriven ?? []) ? (
                                            <CheckIcon color="success" />
                                        ) : (
                                            <CloseIcon color="error" />
                                        )}
                                    </Tooltip>
                                </Grid2>
                            ) : null}

                            {all_forms.map((form) => {
                                const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
                                const satisfied = isFormSatisfiedForDriver(
                                    dShape,
                                    fShape,
                                    driverShapes,
                                );
                                const localMatch = getDriverFormRecord(dShape.DriverForms, form.Form);
                                const required =
                                    mode === "w2" ? form.W2Required : form.OORequired;

                                let recordForTooltip = localMatch;
                                if (!localMatch && satisfied && driver.CarrierID) {
                                    const mates = data.filter(
                                        (x) => x.CarrierID === driver.CarrierID,
                                    );
                                    for (const m of mates) {
                                        const ms = shapeFor(m.ID);
                                        const r = getDriverFormRecord(ms.DriverForms, form.Form);
                                        if (
                                            r &&
                                            isDriverFormRecordCompliant(
                                                r,
                                                form.ExpiryCadence,
                                                form.ValidityMonths,
                                            )
                                        ) {
                                            recordForTooltip = r;
                                            break;
                                        }
                                    }
                                }

                                const compliantWhenPresent =
                                    localMatch &&
                                    isDriverFormRecordCompliant(
                                        localMatch,
                                        form.ExpiryCadence,
                                        form.ValidityMonths,
                                    );

                                const showError =
                                    (required && !satisfied) ||
                                    (Boolean(localMatch) && !compliantWhenPresent);

                                const tooltipParts: string[] = [];
                                if (recordForTooltip) {
                                    const filed = new Date(recordForTooltip.Created);
                                    tooltipParts.push(
                                        `Filed: ${fmtDate(filed)}`,
                                    );
                                    tooltipParts.push(
                                        cadenceTooltipDetail(
                                            form.ExpiryCadence,
                                            filed,
                                            recordForTooltip.Expiration,
                                            form.ValidityMonths,
                                        ),
                                    );
                                    if (!localMatch && satisfied) {
                                        tooltipParts.push("(Another driver at this carrier)");
                                    }
                                }

                                return (
                                    <Grid2 key={form.ID} xs display="flex" justifyContent="center">
                                        <Tooltip title={tooltipParts.join(" · ")}>
                                            <Checkbox
                                                checked={satisfied}
                                                onClick={() => handleCheckboxClick(driver, form)}
                                                color={showError ? "error" : "primary"}
                                            />
                                        </Tooltip>
                                    </Grid2>
                                );
                            })}
                        </Grid2>
                    );
                })}
            </Grid2>

            <Modal open={modalOpen} onClose={handleModalClose}>
                <Box
                    sx={{
                        p: 4,
                        backgroundColor: "background.paper",
                        borderRadius: 2,
                        boxShadow: 24,
                        width: 320,
                        mx: "auto",
                        mt: "15%",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
                >
                    <Typography variant="h6">
                        {selectedForm
                            ? modalTitleForCadence(selectedForm.ExpiryCadence)
                            : "Set date"}
                    </Typography>

                    <DatePicker
                        label="Select date"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        renderInput={(params) => <TextField {...params} />}
                    />
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
                        <Button variant="outlined" color="inherit" onClick={handleModalClose}>
                            Cancel
                        </Button>
                        <Button
                            color="primary"
                            variant="contained"
                            onClick={handleDateSave}
                            disabled={!selectedDate}
                        >
                            Save
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </LocalizationProvider>
    );
};

export default Driver_Forms;
