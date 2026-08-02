import React, {useMemo, useState} from "react";
import {useRouter} from "next/router";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import {LocalizationProvider} from "@mui/x-date-pickers/LocalizationProvider";
import {AdapterDayjs} from "@mui/x-date-pickers/AdapterDayjs";
import {DatePicker} from "@mui/x-date-pickers/DatePicker";
import TextField from "@mui/material/TextField";
import dayjs, {type Dayjs} from "dayjs";
import type {CompleteFormOptions} from "../../../prisma/zod";
import type {DriverFormsDataType} from "./DriverForms";
import DriverFormFilingModal from "./DriverFormFilingModal";
import TableEntityLink from "../../elements/TableEntityLink";
import {useDriverFormFiling} from "../../hooks/useDriverFormFiling";
import {trpc} from "../../utils/trpc";
import {toast} from "react-toastify";
import {
    dateOnlyLocalToUtcNoon,
    parseDateOnlyFromJson,
} from "../../utils/dateOnly";
import {
    cadenceHint,
    cadenceTooltipDetail,
    fmtDate,
} from "../../utils/driverFormFilingUtils";
import {
    collectEntityTrucks,
    dateOnlyToLocalDay,
    driverMissingRequiredForm,
    entityDistinctTruckCount,
    getDriverFormComplianceEndDate,
    getDriverFormRecord,
    isDriverFormExpiringSoon,
    isDriverFormRecordCompliant,
    isDriverLicenseExpiringSoon,
    isFormSatisfiedForDriver,
    isFormSatisfiedForOoEntity,
    isOoFormRequired,
    ooEntityMissingRequiredForm,
    ooEntityTrucksVitalOk,
    primaryDriverIdForEntity,
    startOfDay,
    truckOoVitalMissingReasons,
    truckOoVitalsOk,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";

type FormStatus = "missing" | "expired" | "expiring_soon" | "on_file";

function compareFormLabels(a: CompleteFormOptions, b: CompleteFormOptions): number {
    return a.Forms.DisplayName.localeCompare(b.Forms.DisplayName, undefined, {
        sensitivity: "base",
    });
}

function licenseStatus(
    licenseExpiration: Date | null | undefined,
): {label: string; color: "default" | "success" | "warning" | "error"} {
    if (!licenseExpiration) {
        return {label: "Not set", color: "default"};
    }
    const end = dateOnlyToLocalDay(new Date(licenseExpiration));
    const today = startOfDay(new Date());
    if (end < today) {
        return {label: "Expired", color: "error"};
    }
    if (isDriverLicenseExpiringSoon(licenseExpiration, 30)) {
        return {label: "Expiring soon", color: "warning"};
    }
    return {label: "Valid", color: "success"};
}

function getFormStatus(
    satisfied: boolean,
    record: ReturnType<typeof getDriverFormRecord>,
    form: CompleteFormOptions,
): FormStatus {
    if (!record) return "missing";
    const compliant = isDriverFormRecordCompliant(
        record,
        form.ExpiryCadence,
        form.ValidityMonths,
    );
    if (!compliant) return "expired";
    if (
        isDriverFormExpiringSoon(
            record,
            form.ExpiryCadence,
            form.ValidityMonths,
            30,
        )
    ) {
        return "expiring_soon";
    }
    if (!satisfied) return "missing";
    return "on_file";
}

function statusChipProps(status: FormStatus): {
    label: string;
    color: "default" | "success" | "warning" | "error";
} {
    switch (status) {
        case "missing":
            return {label: "Missing", color: "error"};
        case "expired":
            return {label: "Expired", color: "error"};
        case "expiring_soon":
            return {label: "Expiring soon", color: "warning"};
        case "on_file":
            return {label: "On file", color: "success"};
    }
}

export function computeDriverFormsIssueCount(
    driver: DriverFormsDataType,
    entityDrivers: DriverFormsDataType[],
    allForms: CompleteFormOptions[],
    mode: "w2" | "oo",
): number {
    const driverShapes: DriverComplianceShape[] = entityDrivers.map((d) => ({
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
    }));

    const formOptShapes: FormOptionComplianceShape[] = allForms.map((f) => ({
        Form: f.Form,
        FleetWide: f.FleetWide,
        ExpiryCadence: f.ExpiryCadence,
        ValidityMonths: f.ValidityMonths ?? null,
        W2Visible: f.W2Visible,
        OOVisible: f.OOVisible,
        W2Required: f.W2Required,
        OORequired: f.OORequired,
    }));

    const dShape = driverShapes.find((s) => s.ID === driver.ID)!;
    let count = 0;

    if (driverMissingRequiredForm(dShape, formOptShapes, driverShapes, mode)) {
        if (mode === "w2") {
            for (const form of allForms) {
                if (!form.W2Required) continue;
                const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
                if (!isFormSatisfiedForDriver(dShape, fShape, driverShapes)) count++;
            }
        } else {
            const entityShapes = driverShapes;
            const truckCount = entityDistinctTruckCount(entityDrivers);
            const entityCarrierId = driver.CarrierID ?? null;
            for (const form of allForms) {
                const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
                if (!isOoFormRequired(fShape, truckCount)) continue;
                if (!isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, fShape)) count++;
            }
            if (!ooEntityTrucksVitalOk(entityDrivers)) count++;
        }
    }

    const lic = licenseStatus(
        driver.LicenseExpiration ? new Date(driver.LicenseExpiration as unknown as string) : null,
    );
    if (lic.color === "error" || lic.color === "warning") count++;

    return count;
}

function DriverLicenseCard({driver}: {driver: DriverFormsDataType}) {
    const router = useRouter();
    const parsed = parseDateOnlyFromJson(driver.LicenseExpiration);
    const [editDate, setEditDate] = useState<Dayjs | null>(parsed ? dayjs(parsed) : null);
    const status = licenseStatus(parsed);

    const updateDriver = trpc.useMutation("drivers.post", {
        async onSuccess() {
            toast.success("License expiration updated.", {autoClose: 2000});
            await router.replace(router.asPath);
        },
    });

    const handleSave = async () => {
        if (updateDriver.isLoading) return;
        toast.info("Saving...", {autoClose: 2000});
        await updateDriver.mutateAsync({
            ...driver,
            LicenseExpiration: editDate ? dateOnlyLocalToUtcNoon(editDate.toDate()) : null,
        });
    };

    return (
        <Paper sx={{p: 2, mb: 2}}>
            <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 1}}>
                <Typography variant="h6">CDL / License</Typography>
                <Chip size="small" label={status.label} color={status.color} variant="outlined" />
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                Driver license expiration is tracked alongside compliance forms.
            </Typography>
            <Box sx={{display: "flex", gap: 2, alignItems: "flex-start", flexWrap: "wrap"}}>
                <DatePicker
                    label="License expiration"
                    value={editDate}
                    onChange={(v) => setEditDate(v)}
                    renderInput={(params) => <TextField {...params} size="small" sx={{minWidth: 200}} />}
                />
                <Button
                    variant="contained"
                    onClick={() => void handleSave()}
                    disabled={updateDriver.isLoading}
                >
                    Save license date
                </Button>
            </Box>
        </Paper>
    );
}

function FormCard({
    form,
    status,
    satisfied,
    record,
    holderDriver,
    isRequired,
    onMarkOrUpdate,
    onRemove,
    isSaving,
}: {
    form: CompleteFormOptions;
    status: FormStatus;
    satisfied: boolean;
    record: ReturnType<typeof getDriverFormRecord>;
    holderDriver: DriverFormsDataType | null;
    isRequired: boolean;
    onMarkOrUpdate: () => void;
    onRemove: () => void;
    isSaving: boolean;
}) {
    const chip = statusChipProps(status);
    const hint = cadenceHint(form.ExpiryCadence, form.ValidityMonths);

    let filedLine: string | null = null;
    let expiresLine: string | null = null;
    if (record) {
        const filed = new Date(record.Created);
        filedLine = `Filed: ${fmtDate(filed)}`;
        const end = getDriverFormComplianceEndDate(record, form.ExpiryCadence, form.ValidityMonths);
        if (end) {
            expiresLine = `Expires: ${fmtDate(end)}`;
        } else {
            expiresLine = cadenceTooltipDetail(
                form.ExpiryCadence,
                filed,
                record.Expiration,
                form.ValidityMonths,
            );
        }
    }

    return (
        <Paper sx={{p: 2, mb: 1.5}} variant="outlined">
            <Box sx={{display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2}}>
                <Box sx={{flex: 1}}>
                    <Box sx={{display: "flex", alignItems: "center", gap: 1, mb: 0.5}}>
                        <Typography variant="subtitle1" fontWeight={600}>
                            {form.Forms.DisplayName}
                        </Typography>
                        {isRequired ? (
                            <Chip label="Required" size="small" color="primary" variant="outlined" />
                        ) : (
                            <Chip label="Optional" size="small" variant="outlined" />
                        )}
                        <Chip label={chip.label} size="small" color={chip.color} />
                    </Box>
                    <Typography variant="body2" color="text.secondary" sx={{mb: 0.5}}>
                        {hint}
                    </Typography>
                    {filedLine ? (
                        <Typography variant="body2" color="text.secondary">
                            {filedLine}
                            {expiresLine ? ` · ${expiresLine}` : ""}
                        </Typography>
                    ) : null}
                    {record?.Filer?.trim() ? (
                        <Typography variant="body2" color="text.secondary">
                            Filer: {record.Filer.trim()}
                        </Typography>
                    ) : null}
                    {holderDriver && satisfied ? (
                        <Typography variant="body2" color="text.secondary" sx={{mt: 0.5}}>
                            On file under{" "}
                            <TableEntityLink href={`/drivers/${holderDriver.ID}?tab=forms`} sameTab>
                                {`${holderDriver.FirstName ?? ""} ${holderDriver.LastName ?? ""}`.trim()}
                            </TableEntityLink>{" "}
                            (entity-wide filing)
                        </Typography>
                    ) : null}
                </Box>
                <Box sx={{display: "flex", flexDirection: "column", gap: 1, flexShrink: 0}}>
                    <Button
                        variant="contained"
                        size="small"
                        onClick={onMarkOrUpdate}
                        disabled={isSaving}
                    >
                        {satisfied ? "Update date" : "Mark on file"}
                    </Button>
                    {satisfied ? (
                        <Button
                            variant="outlined"
                            color="inherit"
                            size="small"
                            onClick={onRemove}
                            disabled={isSaving}
                        >
                            Remove
                        </Button>
                    ) : null}
                </Box>
            </Box>
        </Paper>
    );
}

export default function DriverProfileForms({
    driver,
    entityDrivers,
    allForms,
    mode,
}: {
    driver: DriverFormsDataType;
    entityDrivers: DriverFormsDataType[];
    allForms: CompleteFormOptions[];
    mode: "w2" | "oo";
}) {
    const [optionalOpen, setOptionalOpen] = useState(false);

    const driverShapes: DriverComplianceShape[] = useMemo(
        () =>
            entityDrivers.map((d) => ({
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
        [entityDrivers],
    );

    const formOptShapes: FormOptionComplianceShape[] = useMemo(
        () =>
            allForms.map((f) => ({
                Form: f.Form,
                FleetWide: f.FleetWide,
                ExpiryCadence: f.ExpiryCadence,
                ValidityMonths: f.ValidityMonths ?? null,
                W2Visible: f.W2Visible,
                OOVisible: f.OOVisible,
                W2Required: f.W2Required,
                OORequired: f.OORequired,
            })),
        [allForms],
    );

    const shapeFor = (id: number) => driverShapes.find((s) => s.ID === id)!;
    const dShape = shapeFor(driver.ID);
    const entityShapes = driverShapes;
    const entityCarrierId = driver.CarrierID ?? null;
    const truckCount = entityDistinctTruckCount(entityDrivers);
    const trucksMap = collectEntityTrucks(entityDrivers);

    const findFilingHolderDriverId = (
        entityDriversList: DriverFormsDataType[],
        form: CompleteFormOptions,
        carrierId: number | null | undefined,
    ): number | null => {
        const carrierScope = carrierId != null && carrierId > 0;
        for (const d of entityDriversList) {
            const r = getDriverFormRecord(shapeFor(d.ID).DriverForms, form.Form);
            if (!r || !isDriverFormRecordCompliant(r, form.ExpiryCadence, form.ValidityMonths)) {
                continue;
            }
            if (!carrierScope) return d.ID;
            const cid = r.CarrierID;
            if (cid === carrierId || cid == null || cid === undefined) {
                return d.ID;
            }
        }
        return null;
    };

    const filing = useDriverFormFiling({
        mode,
        driverShapes,
        formOptShapes,
        shapeFor,
        findFilingHolderDriverId,
    });

    const requiredForms = useMemo(() => {
        const list = allForms.filter((f) =>
            mode === "w2" ? f.W2Required : isOoFormRequired(
                formOptShapes.find((o) => o.Form === f.Form)!,
                truckCount,
            ),
        );
        return [...list].sort(compareFormLabels);
    }, [allForms, formOptShapes, mode, truckCount]);

    const optionalForms = useMemo(() => {
        const reqIds = new Set(requiredForms.map((f) => f.Form));
        const list = allForms.filter((f) => !reqIds.has(f.Form));
        return [...list].sort(compareFormLabels);
    }, [allForms, requiredForms]);

    const missingRequiredCount = useMemo(() => {
        if (mode === "w2") {
            return requiredForms.filter((form) => {
                const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
                return !isFormSatisfiedForDriver(dShape, fShape, driverShapes);
            }).length;
        }
        return requiredForms.filter((form) => {
            const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
            return !isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, fShape);
        }).length;
    }, [dShape, driverShapes, entityCarrierId, entityShapes, formOptShapes, mode, requiredForms]);

    const trucksBad = mode === "oo" && !ooEntityTrucksVitalOk(entityDrivers);
    const formsBad =
        mode === "w2"
            ? driverMissingRequiredForm(dShape, formOptShapes, driverShapes, "w2")
            : ooEntityMissingRequiredForm(entityShapes, formOptShapes, truckCount, entityCarrierId);
    const licStatus = licenseStatus(
        driver.LicenseExpiration ? new Date(driver.LicenseExpiration as unknown as string) : null,
    );
    const licBad = licStatus.color === "error" || licStatus.color === "warning";

    const allOptionalOnFile = optionalForms.every((form) => {
        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
        return mode === "w2"
            ? isFormSatisfiedForDriver(dShape, fShape, driverShapes)
            : isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, fShape);
    });

    const fleetLink = mode === "w2" ? "/drivers/w2_forms" : "/drivers/owner_forms";

    const renderFormList = (forms: CompleteFormOptions[]) =>
        forms.map((form) => {
            const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
            const satisfied =
                mode === "w2"
                    ? isFormSatisfiedForDriver(dShape, fShape, driverShapes)
                    : isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, fShape);

            const localRecord = getDriverFormRecord(dShape.DriverForms, form.Form);
            let recordForStatus = localRecord;
            let holderDriver: DriverFormsDataType | null = null;

            if (mode === "oo" && satisfied) {
                const holderId = findFilingHolderDriverId(entityDrivers, form, entityCarrierId);
                if (holderId != null) {
                    recordForStatus = getDriverFormRecord(shapeFor(holderId).DriverForms, form.Form);
                    if (holderId !== driver.ID) {
                        holderDriver = entityDrivers.find((d) => d.ID === holderId) ?? null;
                    }
                }
            }

            const status = getFormStatus(satisfied, recordForStatus, form);
            const isRequired = requiredForms.some((f) => f.Form === form.Form);
            const holderId = findFilingHolderDriverId(entityDrivers, form, entityCarrierId);
            const primaryId = primaryDriverIdForEntity(entityDrivers);
            const filingDriver =
                mode === "oo"
                    ? (entityDrivers.find((d) => d.ID === primaryId) ?? driver)
                    : driver;

            return (
                <FormCard
                    key={form.Form}
                    form={form}
                    status={status}
                    satisfied={satisfied}
                    record={recordForStatus}
                    holderDriver={holderDriver}
                    isRequired={isRequired}
                    isSaving={filing.isSaving}
                    onMarkOrUpdate={() => filing.openFilingModal(filingDriver, form)}
                    onRemove={() =>
                        filing.handleProfileFormAction(
                            driver,
                            form,
                            entityDrivers,
                            satisfied,
                            holderId,
                        )
                    }
                />
            );
        });

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Box sx={{width: "100%", px: 2.5, py: 1}}>
                {formsBad || licBad || trucksBad ? (
                    <Alert severity="warning" sx={{mb: 2}}>
                        {missingRequiredCount > 0
                            ? `${missingRequiredCount} required form${missingRequiredCount === 1 ? "" : "s"} missing or expired.`
                            : "All required forms on file."}
                        {licBad ? ` CDL: ${licStatus.label.toLowerCase()}.` : ""}
                        {trucksBad ? " One or more entity trucks have incomplete records." : ""}
                    </Alert>
                ) : (
                    <Alert severity="success" sx={{mb: 2}}>
                        All required forms on file.
                        {licStatus.color === "success" ? " CDL is valid." : ""}
                    </Alert>
                )}

                {mode === "oo" ? (
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        {driver.Carriers?.Name ? (
                            <>
                                Entity:{" "}
                                <TableEntityLink href={`/carriers/${driver.CarrierID}`}>
                                    {driver.Carriers.Name}
                                </TableEntityLink>
                                . Forms filed here apply to the whole carrier/operator entity.
                            </>
                        ) : (
                            <>Solo owner-operator. Forms apply to this operator entity.</>
                        )}
                    </Typography>
                ) : null}

                <Typography variant="body2" sx={{mb: 2}}>
                    <TableEntityLink href={fleetLink}>
                        View all drivers on fleet compliance page
                    </TableEntityLink>
                </Typography>

                <DriverLicenseCard driver={driver} />

                <Typography variant="h6" sx={{mb: 1}}>
                    Required forms
                </Typography>
                {requiredForms.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                        No required forms configured for this driver type.
                    </Typography>
                ) : (
                    renderFormList(requiredForms)
                )}

                {optionalForms.length > 0 ? (
                    <>
                        <Box
                            sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                mt: 3,
                                mb: 1,
                                cursor: "pointer",
                            }}
                            onClick={() => setOptionalOpen((o) => !o)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") setOptionalOpen((o) => !o);
                            }}
                        >
                            {optionalOpen ? <ExpandMore /> : <ChevronRight />}
                            <Typography variant="h6">Optional forms</Typography>
                            {allOptionalOnFile ? (
                                <Chip label="All on file" size="small" color="success" variant="outlined" />
                            ) : null}
                        </Box>
                        <Collapse in={optionalOpen || !allOptionalOnFile}>
                            {renderFormList(optionalForms)}
                        </Collapse>
                    </>
                ) : null}

                {mode === "oo" ? (
                    <>
                        <Typography variant="h6" sx={{mt: 3, mb: 1}}>
                            Entity trucks
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{mb: 1}}>
                            Owner-operator compliance also requires complete truck records (name, VIN,
                            plate, make, model, year, licensed state).
                        </Typography>
                        {trucksMap.size === 0 ? (
                            <Alert severity="error">No trucks on file for this entity.</Alert>
                        ) : (
                            Array.from(trucksMap.entries()).map(([tid, t]) => {
                                const ok = truckOoVitalsOk(t);
                                const miss = truckOoVitalMissingReasons(t);
                                return (
                                    <Paper key={tid} sx={{p: 1.5, mb: 1}} variant="outlined">
                                        <Box sx={{display: "flex", alignItems: "center", gap: 1}}>
                                            {ok ? (
                                                <CheckIcon color="success" fontSize="small" />
                                            ) : (
                                                <CloseIcon color="error" fontSize="small" />
                                            )}
                                            <Box>
                                                <Typography variant="body2" fontWeight={600}>
                                                    <TableEntityLink href={`/trucks/${tid}`}>
                                                        {t.Name}
                                                    </TableEntityLink>
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Plate {t.LicensePlate?.trim() || "—"} · VIN{" "}
                                                    {t.VIN?.trim() || "—"} · Year {t.ModelYear ?? "—"}
                                                    {!ok ? ` · Missing: ${miss.join(", ")}` : ""}
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </Paper>
                                );
                            })
                        )}
                    </>
                ) : null}
            </Box>

            <DriverFormFilingModal
                open={filing.modalOpen}
                mode={mode}
                selectedForm={filing.selectedForm}
                selectedDate={filing.selectedDate}
                filerName={filing.filerName}
                expiryPreview={filing.expiryPreview}
                isSaving={filing.isSaving}
                onClose={filing.handleModalClose}
                onDateChange={filing.setSelectedDate}
                onFilerChange={filing.setFilerName}
                onSave={filing.handleDateSave}
            />
        </LocalizationProvider>
    );
}
