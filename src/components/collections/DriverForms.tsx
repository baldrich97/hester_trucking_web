import {CompleteFormOptions, DriverFormsModel, DriversModel} from "../../../prisma/zod";
import {useRouter} from "next/router";
import {trpc} from "../../utils/trpc";
import React, {useMemo, useState} from "react";
import {Dayjs} from "dayjs";
import {confirmDestructive} from "../../utils/appConfirm";
import {toast} from "react-toastify";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import Grid2 from "@mui/material/Unstable_Grid2";
import {Box, Button, Checkbox, IconButton, Modal, TextField, Tooltip, Typography} from "@mui/material";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import {z} from "zod";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import type {Carriers, States, Trucks} from "@prisma/client";
import {calendarNavButtonSx} from "../../theme/muiShared";
import {
    collectEntityTrucks,
    driverMissingRequiredForm,
    entityDistinctTruckCount,
    getDriverFormRecord,
    groupOoDriversByEntity,
    isDriverFormRecordCompliant,
    isFormSatisfiedForDriver,
    isFormSatisfiedForOoEntity,
    isOoFormRequired,
    modalTitleForCadence,
    ooEntityMissingRequiredForm,
    ooEntityTrucksVitalOk,
    primaryDriverIdForEntity,
    truckOoVitalMissingReasons,
    truckOoVitalsOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";
import {dateOnlyLocalToUtcNoon} from "../../utils/dateOnly";
import TableEntityLink from "../../elements/TableEntityLink";

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

export type DriverFormsDataType = z.infer<typeof DataModel> & {
    TrucksDriven?: { TruckID: number; Trucks: Trucks | null }[];
    Carriers?: (Carriers & { States: States | null }) | null;
    States?: States | null;
};

const OO_LEFT_COL = {flex: "0 0 300px", minWidth: 260, maxWidth: 400} as const;
const OO_STATUS_W = 40;
const OO_CHEVRON_W = 44;

function formatDriverAddress(d: DriverFormsDataType): string {
    const abbr = d.States?.Abbreviation ?? "";
    const cityLine = [d.City, abbr, d.ZIP].filter((x) => x && String(x).trim()).join(" ");
    return [d.Street, cityLine].filter((x) => x && String(x).trim()).join(" · ");
}

function formatCarrierAddress(c: Carriers & { States: States | null }): string {
    const abbr = c.States?.Abbreviation ?? "";
    const cityLine = [c.City, abbr, c.ZIP].filter((x) => x && String(x).trim()).join(" ");
    return [c.Street, cityLine].filter((x) => x && String(x).trim()).join(" · ");
}

const Driver_Forms = ({
    data,
    all_forms,
    mode,
}: {
    data: DriverFormsDataType[];
    all_forms: CompleteFormOptions[];
    mode: "w2" | "oo";
}) => {
    const router = useRouter();
    const compareLabels = (a: string, b: string): number =>
        a.localeCompare(b, undefined, {sensitivity: "base"});

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
                    CarrierID: (df as {CarrierID?: number | null}).CarrierID ?? null,
                    Filer: (df as {Filer?: string | null}).Filer ?? null,
                })),
                TrucksDriven: d.TrucksDriven,
            })),
        [data],
    );

    const formOptShapes: FormOptionComplianceShape[] = useMemo(
        () =>
            all_forms.map((f) => ({
                Form: f.Form,
                FleetWide: f.FleetWide,
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

    const addDriverForm = trpc.useMutation("driverForms.put", {
        async onSuccess() {
            toast.success("Successfully submitted!", {autoClose: 2000});
        },
    });

    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [selectedForm, setSelectedForm] = useState<CompleteFormOptions | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<DriverFormsDataType | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [filerName, setFilerName] = useState("");

    const [ooExpanded, setOoExpanded] = useState<Record<string, boolean>>({});
    const [ooExpandAllOpen, setOoExpandAllOpen] = useState(false);
    const [pdfDownloading, setPdfDownloading] = useState(false);

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
                    detail: `Filed ${fmtDate(new Date())} (today). Expires on ${fmtDate(picked)}.`,
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

    const entityShapesFor = (entityDrivers: DriverFormsDataType[]) =>
        entityDrivers.map((d) => shapeFor(d.ID));

    const findFilingHolderDriverId = (
        entityDrivers: DriverFormsDataType[],
        form: CompleteFormOptions,
        entityCarrierId: number | null | undefined,
    ): number | null => {
        const carrierScope = entityCarrierId != null && entityCarrierId > 0;
        for (const d of entityDrivers) {
            const r = getDriverFormRecord(shapeFor(d.ID).DriverForms, form.Form);
            if (
                !r ||
                !isDriverFormRecordCompliant(r, form.ExpiryCadence, form.ValidityMonths)
            ) {
                continue;
            }
            if (!carrierScope) return d.ID;
            const cid = r.CarrierID;
            if (cid === entityCarrierId || cid == null || cid === undefined) {
                return d.ID;
            }
        }
        return null;
    };

    const handleCheckboxClickW2 = (driver: DriverFormsDataType, form: CompleteFormOptions) => {
        if (deleteDriverForm.isLoading || addDriverForm.isLoading) return;
        const dShape = shapeFor(driver.ID);
        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
        const satisfied = isFormSatisfiedForDriver(dShape, fShape, driverShapes);
        const localMatch = getDriverFormRecord(dShape.DriverForms, form.Form);

        if (!satisfied) {
            setSelectedDriver(driver);
            setSelectedForm(form);
            setSelectedDate(null);
            setFilerName("");
            setModalOpen(true);
            return;
        }

        confirmDestructive({
            title: "Remove filing",
            message: `Remove ${form.Forms.DisplayName} for ${driver.FirstName ?? ""} ${driver.LastName ?? ""}? The date will be cleared; re-check the box to set a new date.`,
            confirmLabel: "Yes",
            cancelLabel: "No",
            onConfirm: () => {
                deleteDriverForm.mutate({
                    driverId: driver.ID,
                    formId: form.Form,
                });
            },
        });
    };

    const handleCheckboxClickOo = (
        entityDrivers: DriverFormsDataType[],
        form: CompleteFormOptions,
    ) => {
        if (deleteDriverForm.isLoading || addDriverForm.isLoading) return;
        const entityShapes = entityShapesFor(entityDrivers);
        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
        const primaryId = primaryDriverIdForEntity(entityDrivers);
        const primaryDriver = entityDrivers.find((d) => d.ID === primaryId)!;
        const entityCarrierId = primaryDriver.CarrierID ?? null;
        const satisfied = isFormSatisfiedForOoEntity(
            entityShapes,
            entityCarrierId,
            fShape,
        );
        const localOnPrimary = getDriverFormRecord(
            shapeFor(primaryId).DriverForms,
            form.Form,
        );

        if (!satisfied) {
            setSelectedDriver(primaryDriver);
            setSelectedForm(form);
            setSelectedDate(null);
            setFilerName("");
            setModalOpen(true);
            return;
        }

        const holderId = findFilingHolderDriverId(entityDrivers, form, entityCarrierId);
        const holder = entityDrivers.find((d) => d.ID === holderId) ?? primaryDriver;

        if (satisfied && !localOnPrimary && holderId !== primaryId) {
            confirmDestructive({
                title: "Remove filing",
                message: `This form is on file under ${holder.FirstName ?? ""} ${holder.LastName ?? ""} for this entity. Remove it?`,
                confirmLabel: "Yes",
                cancelLabel: "No",
                onConfirm: () => {
                    deleteDriverForm.mutate({
                        driverId: holder.ID,
                        formId: form.Form,
                    });
                },
            });
            return;
        }

        confirmDestructive({
            title: "Remove filing",
            message: `Remove ${form.Forms.DisplayName} for this entity? The date will be cleared; re-check the box to set a new date.`,
            confirmLabel: "Yes",
            cancelLabel: "No",
            onConfirm: () => {
                deleteDriverForm.mutate({
                    driverId: holder.ID,
                    formId: form.Form,
                });
            },
        });
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedDriver(null);
        setSelectedForm(null);
        setSelectedDate(null);
        setFilerName("");
    };

    const handleDateSave = async () => {
        if (addDriverForm.isLoading) return;
        if (selectedForm === null || selectedDriver === null || selectedDate === null) {
            return;
        }
        toast.info("Submitting...", {autoClose: 2000});
        const pickedDate = dateOnlyLocalToUtcNoon(selectedDate.toDate());
        const filedToday = dateOnlyLocalToUtcNoon(new Date());
        const basePayload =
            mode === "oo"
                ? {
                      Form: selectedForm.Form,
                      Driver: selectedDriver.ID,
                      Expiration: pickedDate,
                      CarrierID:
                          selectedDriver.CarrierID != null && selectedDriver.CarrierID > 0
                              ? selectedDriver.CarrierID
                              : null,
                      Filer: filerName.trim() ? filerName.trim() : null,
                  }
                : {
                      Form: selectedForm.Form,
                      Driver: selectedDriver.ID,
                      Expiration: pickedDate,
                      CarrierID: null,
                      Filer: null,
                  };
        const payload =
            selectedForm.ExpiryCadence === "EXPIRATION_DATE" && filedToday
                ? {...basePayload, FiledDate: filedToday}
                : basePayload;
        await addDriverForm.mutateAsync(payload);
        await router.replace(router.asPath);
        handleModalClose();
    };

    const pdfKind = mode === "w2" ? "w2" : "oo";

    const downloadPdf = () => {
        if (pdfDownloading) return;
        setPdfDownloading(true);
        window.setTimeout(() => setPdfDownloading(false), 2000);
        toast.info("Generating PDF...", {autoClose: 2000, type: "info"});
        const element = document.createElement("a");
        element.href = `/api/getPDF/driver-forms/${pdfKind}`;
        element.download = `driver-forms-${pdfKind}.pdf`;
        document.body.appendChild(element);
        element.click();
        document.body.removeChild(element);
    };

    const ooEntityEntries = useMemo(() => {
        if (mode !== "oo") return [] as [string, DriverFormsDataType[]][];
        const m = groupOoDriversByEntity(data);
        const entries = Array.from(m.entries());
        entries.sort((a, b) => {
            const aLead = a[1][0];
            const bLead = b[1][0];
            const aLabel =
                aLead?.Carriers?.Name?.trim() ||
                `${aLead?.FirstName ?? ""} ${aLead?.LastName ?? ""}`.trim() ||
                "";
            const bLabel =
                bLead?.Carriers?.Name?.trim() ||
                `${bLead?.FirstName ?? ""} ${bLead?.LastName ?? ""}`.trim() ||
                "";
            const byLabel = compareLabels(aLabel, bLabel);
            if (byLabel !== 0) return byLabel;
            return (aLead?.ID ?? 0) - (bLead?.ID ?? 0);
        });
        return entries;
    }, [data, mode]);

    const renderFormHeaderRow = () => (
        <Grid2 container alignItems="flex-end" sx={{mb: 1}}>
            {mode === "oo" ? (
                <Grid2 sx={{width: OO_STATUS_W + OO_CHEVRON_W, flexShrink: 0}} />
            ) : null}
            <Grid2 sx={OO_LEFT_COL}>
                <Typography fontWeight="bold">
                    {mode === "oo" ? "Carrier / operator" : "Driver"}
                </Typography>
                {mode === "w2" ? (
                    <>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Address
                        </Typography>
                        <Typography variant="caption" color="text.secondary" display="block">
                            Phone
                        </Typography>
                    </>
                ) : null}
            </Grid2>
            <Grid2 xs container spacing={0} sx={{display: "flex"}}>
                {all_forms.map((form) => (
                    <Grid2 key={form.ID} xs sx={{minWidth: 0, textAlign: "center"}}>
                        <Typography fontWeight="bold" variant="body2" noWrap title={form.Forms.DisplayName}>
                            {form.Forms.DisplayName}
                        </Typography>
                    </Grid2>
                ))}
            </Grid2>
        </Grid2>
    );

    const renderOoEntity = (entityKey: string, entityDrivers: DriverFormsDataType[]) => {
        const primaryId = primaryDriverIdForEntity(entityDrivers);
        const primary = entityDrivers.find((d) => d.ID === primaryId)!;
        const carrier = primary.Carriers ?? null;
        const entityCarrierId = primary.CarrierID ?? null;
        const entityShapes = entityShapesFor(entityDrivers);
        const truckCount = entityDistinctTruckCount(entityDrivers);
        const trucksMap = collectEntityTrucks(entityDrivers);
        const formsBad = ooEntityMissingRequiredForm(
            entityShapes,
            formOptShapes,
            truckCount,
            entityCarrierId,
        );
        const trucksBad = !ooEntityTrucksVitalOk(entityDrivers);
        const entityBad = formsBad || trucksBad;

        const expanded = ooExpanded[entityKey] ?? false;
        const setExpanded = (v: boolean) =>
            setOoExpanded((prev) => ({...prev, [entityKey]: v}));

        const missingFormLabels: string[] = [];
        for (const opt of formOptShapes) {
            if (!isOoFormRequired(opt, truckCount)) continue;
            if (!isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, opt)) {
                const label =
                    all_forms.find((f) => f.Form === opt.Form)?.Forms.DisplayName ??
                    `Form ${opt.Form}`;
                missingFormLabels.push(label);
            }
        }
        const truckTooltipLines: string[] = [];
        for (const t of Array.from(trucksMap.values())) {
            if (truckOoVitalsOk(t)) continue;
            const miss = truckOoVitalMissingReasons(t);
            truckTooltipLines.push(`${t.Name}: missing ${miss.join(", ")}`);
        }
        const entityTooltipParts: string[] = [];
        if (missingFormLabels.length) {
            entityTooltipParts.push(`Forms: ${missingFormLabels.join("; ")}`);
        }
        if (truckTooltipLines.length) {
            entityTooltipParts.push(`Trucks: ${truckTooltipLines.join(" · ")}`);
        }
        if (!entityTooltipParts.length) {
            entityTooltipParts.push("Entity forms and trucks look complete.");
        }

        const titleLines: { bold?: boolean; text: string }[] = [];
        if (carrier) {
            titleLines.push({bold: true, text: carrier.Name});
            if (carrier.ContactName?.trim()) {
                titleLines.push({text: carrier.ContactName});
            }
            const addr = formatCarrierAddress(carrier);
            if (addr) titleLines.push({text: addr});
            if (carrier.Phone?.trim()) titleLines.push({text: carrier.Phone});
        } else {
            const name = `${primary.FirstName ?? ""} ${primary.LastName ?? ""}`.trim();
            titleLines.push({bold: true, text: name || "Operator"});
            const addr = formatDriverAddress(primary);
            if (addr) titleLines.push({text: addr});
            if (primary.Phone?.trim()) titleLines.push({text: primary.Phone});
        }

        const renderEntityFormCheckboxes = () => (
            <Box sx={{flex: 1, display: "flex", minWidth: 0, alignItems: "flex-start"}}>
                {all_forms.map((form) => {
                    const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
                    const satisfied = isFormSatisfiedForOoEntity(
                        entityShapes,
                        entityCarrierId,
                        fShape,
                    );
                    const localOnPrimary = getDriverFormRecord(
                        shapeFor(primaryId).DriverForms,
                        form.Form,
                    );
                    const requiredOo = isOoFormRequired(fShape, truckCount);
                    const compliantPrimary =
                        localOnPrimary &&
                        isDriverFormRecordCompliant(
                            localOnPrimary,
                            form.ExpiryCadence,
                            form.ValidityMonths,
                        );
                    const showError =
                        (requiredOo && !satisfied) ||
                        (Boolean(localOnPrimary) && !compliantPrimary);

                    let recordForTooltip = localOnPrimary;
                    if (!localOnPrimary && satisfied) {
                        for (const d of entityDrivers) {
                            const r = getDriverFormRecord(shapeFor(d.ID).DriverForms, form.Form);
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

                    const tooltipParts: string[] = [];
                    if (recordForTooltip) {
                        const filed = new Date(recordForTooltip.Created);
                        tooltipParts.push(`Filed: ${fmtDate(filed)}`);
                        tooltipParts.push(
                            cadenceTooltipDetail(
                                form.ExpiryCadence,
                                filed,
                                recordForTooltip.Expiration,
                                form.ValidityMonths,
                            ),
                        );
                        if (recordForTooltip.Filer?.trim()) {
                            tooltipParts.push(`Filer: ${recordForTooltip.Filer.trim()}`);
                        }
                        if (!localOnPrimary && satisfied) {
                            tooltipParts.push("(Another driver in this entity)");
                        }
                    }

                    return (
                        <Box
                            key={form.ID}
                            sx={{flex: 1, minWidth: 0, display: "flex", justifyContent: "center"}}
                        >
                            <Tooltip title={tooltipParts.join(" · ")}>
                                <Checkbox
                                    checked={satisfied}
                                    disabled={deleteDriverForm.isLoading || addDriverForm.isLoading}
                                    onClick={() => handleCheckboxClickOo(entityDrivers, form)}
                                    color={showError ? "error" : "primary"}
                                />
                            </Tooltip>
                        </Box>
                    );
                })}
            </Box>
        );

        return (
            <Box key={entityKey} sx={{borderBottom: "1px solid", borderColor: "divider", py: 1.5}}>
                <Box sx={{display: "flex", alignItems: "flex-start", gap: 0}}>
                    <Box
                        sx={{
                            width: OO_STATUS_W,
                            flexShrink: 0,
                            display: "flex",
                            justifyContent: "center",
                            pt: 1,
                        }}
                    >
                        {entityBad ? (
                            <Tooltip title={entityTooltipParts.join(" ")}>
                                <CloseIcon color="error" />
                            </Tooltip>
                        ) : (
                            <Tooltip title={entityTooltipParts.join(" ")}>
                                <CheckIcon color="success" />
                            </Tooltip>
                        )}
                    </Box>
                    <Box sx={{width: OO_CHEVRON_W, flexShrink: 0}}>
                        <IconButton
                            size="small"
                            sx={calendarNavButtonSx}
                            color="inherit"
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                        >
                            {expanded ? (
                                <ExpandMore sx={{fontSize: 30}} />
                            ) : (
                                <ChevronRight sx={{fontSize: 30}} />
                            )}
                        </IconButton>
                    </Box>
                    <Box sx={{...OO_LEFT_COL, pt: 0.5}}>
                        {titleLines.map((line, i) => (
                            <Typography
                                key={i}
                                variant={line.bold ? "subtitle1" : "body2"}
                                fontWeight={line.bold ? 700 : 400}
                            >
                                {line.text}
                            </Typography>
                        ))}
                        {carrier ? (
                            <Typography variant="caption" color="text.secondary" sx={{mt: 0.5, display: "block"}}>
                                Drivers:{" "}
                                {entityDrivers
                                    .map((d) => `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim())
                                    .join(", ")}
                            </Typography>
                        ) : null}
                        {carrier ? (
                            <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                                Filing apply to the carrier as a whole.
                            </Typography>
                        ) : null}
                    </Box>
                    {renderEntityFormCheckboxes()}
                </Box>

                {expanded ? (
                    <>
                        {Array.from(trucksMap.entries()).map(([tid, t]) => {
                            const ok = truckOoVitalsOk(t);
                            const miss = truckOoVitalMissingReasons(t);
                            const truckTip = ok
                                ? "Truck record complete for OO compliance."
                                : `Missing: ${miss.join(", ")}`;
                            return (
                                <Box
                                    key={tid}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 0,
                                        py: 0.75,
                                    }}
                                >
                                    <Box
                                        sx={{
                                            width: OO_STATUS_W,
                                            flexShrink: 0,
                                            display: "flex",
                                            justifyContent: "center",
                                        }}
                                    >
                                        <Tooltip title={truckTip}>
                                            {ok ? (
                                                <CheckIcon color="success" fontSize="small" />
                                            ) : (
                                                <CloseIcon color="error" fontSize="small" />
                                            )}
                                        </Tooltip>
                                    </Box>
                                    <Box sx={{width: OO_CHEVRON_W, flexShrink: 0}} />
                                    <Box sx={OO_LEFT_COL}>
                                        <Typography component="div" variant="body2" fontWeight={600}>
                                            <TableEntityLink href={`/trucks/${tid}`}>{t.Name}</TableEntityLink>
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            Plate {t.LicensePlate?.trim() || "—"} · VIN{" "}
                                            {t.VIN?.trim() || "—"} · Year {t.ModelYear ?? "—"}
                                        </Typography>
                                    </Box>
                                    <Box sx={{flex: 1}} />
                                </Box>
                            );
                        })}
                        {trucksMap.size === 0 ? (
                            <Typography variant="body2" color="error" sx={{pl: OO_STATUS_W + OO_CHEVRON_W, py: 1}}>
                                No trucks on file for this entity.
                            </Typography>
                        ) : null}
                    </>
                ) : null}
            </Box>
        );
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{mb: 2, display: "flex", gap: 2, alignItems: "center"}}>
                {mode === "oo" ? (
                    <Tooltip
                        title={
                            ooExpandAllOpen
                                ? "Collapse all carrier / operator sections."
                                : "Expand all carrier / operator sections."
                        }
                    >
                        <Button
                            variant="text"
                            type="button"
                            size="small"
                            sx={calendarNavButtonSx}
                            color="inherit"
                            onClick={() => {
                                const next = !ooExpandAllOpen;
                                setOoExpandAllOpen(next);
                                const m: Record<string, boolean> = {};
                                for (const [k] of ooEntityEntries) {
                                    m[k] = next;
                                }
                                setOoExpanded(m);
                            }}
                        >
                            {ooExpandAllOpen ? (
                                <ExpandMore sx={{fontSize: 40}} />
                            ) : (
                                <ChevronRight sx={{fontSize: 40}} />
                            )}
                        </Button>
                    </Tooltip>
                ) : null}
                <Button variant="outlined" disabled={pdfDownloading} onClick={downloadPdf}>
                    Download PDF
                </Button>
            </Box>

            {mode === "oo" ? (
                <Box>
                    {renderFormHeaderRow()}
                    {ooEntityEntries.map(([k, drivers]) => renderOoEntity(k, drivers))}
                </Box>
            ) : (
                <Grid2 container direction="column" spacing={1}>
                    {renderFormHeaderRow()}
                    {data.map((driver) => {
                        const dShape = shapeFor(driver.ID);
                        const formsBad = driverMissingRequiredForm(
                            dShape,
                            formOptShapes,
                            driverShapes,
                            "w2",
                        );
                        const addr = formatDriverAddress(driver);
                        const phone = driver.Phone?.trim() || "—";

                        return (
                            <Grid2 container key={driver.ID} alignItems="center" wrap="nowrap">
                                <Grid2 sx={OO_LEFT_COL}>
                                    <Typography component="div">
                                        <TableEntityLink href={`/drivers/${driver.ID}`}>
                                            {`${driver.FirstName ?? ""} ${driver.LastName ?? ""}`.trim()}
                                        </TableEntityLink>
                                        {formsBad ? (
                                            <Typography component="span" color="error" sx={{ml: 0.5}}>
                                                *
                                            </Typography>
                                        ) : null}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {addr || "—"}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {phone}
                                    </Typography>
                                </Grid2>
                                <Grid2 xs container sx={{display: "flex", minWidth: 0}}>
                                    {all_forms.map((form) => {
                                        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
                                        const satisfied = isFormSatisfiedForDriver(
                                            dShape,
                                            fShape,
                                            driverShapes,
                                        );
                                        const localMatch = getDriverFormRecord(
                                            dShape.DriverForms,
                                            form.Form,
                                        );
                                        const required = form.W2Required;
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
                                        if (localMatch) {
                                            const filed = new Date(localMatch.Created);
                                            tooltipParts.push(`Filed: ${fmtDate(filed)}`);
                                            tooltipParts.push(
                                                cadenceTooltipDetail(
                                                    form.ExpiryCadence,
                                                    filed,
                                                    localMatch.Expiration,
                                                    form.ValidityMonths,
                                                ),
                                            );
                                        }

                                        return (
                                            <Grid2
                                                key={form.ID}
                                                xs
                                                sx={{minWidth: 0, display: "flex", justifyContent: "center"}}
                                            >
                                                <Tooltip title={tooltipParts.join(" · ")}>
                                                    <Checkbox
                                                        checked={satisfied}
                                                        disabled={
                                                            deleteDriverForm.isLoading ||
                                                            addDriverForm.isLoading
                                                        }
                                                        onClick={() =>
                                                            handleCheckboxClickW2(driver, form)
                                                        }
                                                        color={showError ? "error" : "primary"}
                                                    />
                                                </Tooltip>
                                            </Grid2>
                                        );
                                    })}
                                </Grid2>
                            </Grid2>
                        );
                    })}
                </Grid2>
            )}

            <Modal open={modalOpen} onClose={handleModalClose}>
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
                        {selectedForm
                            ? modalTitleForCadence(selectedForm.ExpiryCadence)
                            : "Set date"}
                    </Typography>

                    <DatePicker
                        label={
                            selectedForm?.ExpiryCadence === "EXPIRATION_DATE"
                                ? "Expiration date"
                                : "Select date"
                        }
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        renderInput={(params) => <TextField {...params} />}
                    />
                    {mode === "oo" ? (
                        <TextField
                            size="small"
                            label="Filer (optional)"
                            placeholder="Who submitted this paperwork"
                            value={filerName}
                            onChange={(e) => setFilerName(e.target.value)}
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
                        <Button variant="outlined" color="inherit" onClick={handleModalClose}>
                            Cancel
                        </Button>
                        <Button
                            color="primary"
                            variant="contained"
                            onClick={handleDateSave}
                            disabled={!selectedDate || addDriverForm.isLoading}
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
