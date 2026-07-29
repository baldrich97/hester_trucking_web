import {useMemo, useState} from "react";
import {useRouter} from "next/router";
import type {Dayjs} from "dayjs";
import {toast} from "react-toastify";
import type {CompleteFormOptions} from "../../prisma/zod";
import {trpc} from "../utils/trpc";
import {confirmDestructive} from "../utils/appConfirm";
import {dateOnlyLocalToUtcNoon} from "../utils/dateOnly";
import {computeExpiryPreview} from "../utils/driverFormFilingUtils";
import {
    getDriverFormRecord,
    isDriverFormRecordCompliant,
    isFormSatisfiedForDriver,
    isFormSatisfiedForOoEntity,
    primaryDriverIdForEntity,
    type DriverComplianceShape,
    type FormOptionComplianceShape,
} from "../utils/driverFormCompliance";
import type {DriverFormsDataType} from "../components/collections/DriverForms";

type UseDriverFormFilingArgs = {
    mode: "w2" | "oo";
    driverShapes: DriverComplianceShape[];
    formOptShapes: FormOptionComplianceShape[];
    shapeFor: (id: number) => DriverComplianceShape;
    findFilingHolderDriverId: (
        entityDrivers: DriverFormsDataType[],
        form: CompleteFormOptions,
        entityCarrierId: number | null | undefined,
    ) => number | null;
};

export function useDriverFormFiling({
    mode,
    driverShapes,
    formOptShapes,
    shapeFor,
    findFilingHolderDriverId,
}: UseDriverFormFilingArgs) {
    const router = useRouter();

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

    const [modalOpen, setModalOpen] = useState(false);
    const [selectedForm, setSelectedForm] = useState<CompleteFormOptions | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<DriverFormsDataType | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
    const [filerName, setFilerName] = useState("");

    const isSaving = deleteDriverForm.isLoading || addDriverForm.isLoading;

    const expiryPreview = useMemo(
        () => computeExpiryPreview(selectedForm, selectedDate ? selectedDate.toDate() : null),
        [selectedDate, selectedForm],
    );

    const openFilingModal = (driver: DriverFormsDataType, form: CompleteFormOptions) => {
        if (isSaving) return;
        setSelectedDriver(driver);
        setSelectedForm(form);
        setSelectedDate(null);
        setFilerName("");
        setModalOpen(true);
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

    const removeFiling = (driverId: number, formId: number) => {
        if (isSaving) return;
        deleteDriverForm.mutate({driverId, formId});
    };

    const confirmRemoveFiling = (message: string, driverId: number, formId: number) => {
        if (isSaving) return;
        confirmDestructive({
            title: "Remove filing",
            message,
            confirmLabel: "Yes",
            cancelLabel: "No",
            onConfirm: () => removeFiling(driverId, formId),
        });
    };

    const handleCheckboxClickW2 = (driver: DriverFormsDataType, form: CompleteFormOptions) => {
        if (isSaving) return;
        const dShape = shapeFor(driver.ID);
        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
        const satisfied = isFormSatisfiedForDriver(dShape, fShape, driverShapes);

        if (!satisfied) {
            openFilingModal(driver, form);
            return;
        }

        confirmRemoveFiling(
            `Remove ${form.Forms.DisplayName} for ${driver.FirstName ?? ""} ${driver.LastName ?? ""}? The date will be cleared; re-check the box to set a new date.`,
            driver.ID,
            form.Form,
        );
    };

    const handleCheckboxClickOo = (
        entityDrivers: DriverFormsDataType[],
        form: CompleteFormOptions,
    ) => {
        if (isSaving) return;
        const entityShapes = entityDrivers.map((d) => shapeFor(d.ID));
        const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
        const primaryId = primaryDriverIdForEntity(entityDrivers);
        const primaryDriver = entityDrivers.find((d) => d.ID === primaryId)!;
        const entityCarrierId = primaryDriver.CarrierID ?? null;
        const satisfied = isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, fShape);
        const localOnPrimary = getDriverFormRecord(shapeFor(primaryId).DriverForms, form.Form);

        if (!satisfied) {
            openFilingModal(primaryDriver, form);
            return;
        }

        const holderId = findFilingHolderDriverId(entityDrivers, form, entityCarrierId);
        const holder = entityDrivers.find((d) => d.ID === holderId) ?? primaryDriver;

        if (satisfied && !localOnPrimary && holderId !== primaryId) {
            confirmRemoveFiling(
                `This form is on file under ${holder.FirstName ?? ""} ${holder.LastName ?? ""} for this entity. Remove it?`,
                holder.ID,
                form.Form,
            );
            return;
        }

        confirmRemoveFiling(
            `Remove ${form.Forms.DisplayName} for this entity? The date will be cleared; re-check the box to set a new date.`,
            holder.ID,
            form.Form,
        );
    };

    const handleProfileFormAction = (
        driver: DriverFormsDataType,
        form: CompleteFormOptions,
        entityDrivers: DriverFormsDataType[],
        satisfied: boolean,
        holderId: number | null,
    ) => {
        if (isSaving) return;
        if (!satisfied) {
            const primaryId = primaryDriverIdForEntity(entityDrivers);
            const filingDriver =
                mode === "oo"
                    ? (entityDrivers.find((d) => d.ID === primaryId) ?? driver)
                    : driver;
            openFilingModal(filingDriver, form);
            return;
        }

        const removeDriverId = holderId ?? driver.ID;
        const holder = entityDrivers.find((d) => d.ID === removeDriverId) ?? driver;
        if (mode === "oo" && holderId !== driver.ID) {
            confirmRemoveFiling(
                `This form is on file under ${holder.FirstName ?? ""} ${holder.LastName ?? ""} for this entity. Remove it?`,
                removeDriverId,
                form.Form,
            );
            return;
        }

        confirmRemoveFiling(
            mode === "oo"
                ? `Remove ${form.Forms.DisplayName} for this entity?`
                : `Remove ${form.Forms.DisplayName} for ${driver.FirstName ?? ""} ${driver.LastName ?? ""}?`,
            removeDriverId,
            form.Form,
        );
    };

    return {
        modalOpen,
        selectedForm,
        selectedDate,
        filerName,
        expiryPreview,
        isSaving,
        setSelectedDate,
        setFilerName,
        handleModalClose,
        handleDateSave,
        openFilingModal,
        handleCheckboxClickW2,
        handleCheckboxClickOo,
        handleProfileFormAction,
        confirmRemoveFiling,
        removeFiling,
    };
}
