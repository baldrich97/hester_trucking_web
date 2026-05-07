import React, {useMemo} from "react";
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {TrucksModel} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";

type TrucksType = z.infer<typeof TrucksModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";

const defaultValues = {
    Name: "",
    VIN: "",
    Notes: "",
    Make: "",
    LicensePlate: "",
    Model: "",
    TruckNumber: "",
    ModelYear: null as number | null,
    LicensedState: null as number | null,
};

const Truck = ({initialTruck = null}: {initialTruck?: null | TrucksType}) => {
    const router = useRouter();
    const {data: states = []} = trpc.useQuery(["states.getAll"]);

    const licensedStateOptions = useMemo(
        () => [{ID: "", Name: "(None)"}, ...states] as Record<string, unknown>[],
        [states],
    );

    const trucksFormSchema = TrucksModel.omit({ModelYear: true}).extend({
        ModelYear: z.preprocess((v) => {
            if (v === "" || v === null || v === undefined) return null;
            const n = typeof v === "number" ? v : parseInt(String(v), 10);
            return Number.isFinite(n) ? n : null;
        }, z.number().int().min(1900).max(2100).nullable()),
    });

    const validationSchema = initialTruck ? trucksFormSchema : trucksFormSchema.omit({ID: true});

    type ValidationSchema = z.infer<typeof validationSchema>;

    const formDefaults = useMemo(
        () => (initialTruck ? {...initialTruck} : defaultValues),
        [initialTruck],
    );

    const {
        handleSubmit,
        formState: {errors},
        control,
        reset,
    } = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: formDefaults,
    });

    const key = initialTruck ? "trucks.post" : "trucks.put";

    const addOrUpdateTruck = trpc.useMutation(key, {
        async onSuccess(data) {
            toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
            reset(initialTruck ? data : defaultValues);
        },
    });

    const onSubmit = async (data: ValidationSchema) => {
        toast("Submitting...", {autoClose: 2000, type: "info"});
        await addOrUpdateTruck.mutateAsync(data);
        if (key === "trucks.put") {
            await router.replace(router.asPath);
        }
    };

    const fields: FormFieldsType = [
        {
            name: "Name",
            size: 6,
            required: true,
            shouldErrorOn: ["required", "too_small"],
            errorMessage: "Truck name is required.",
            type: "textfield",
        },
        {name: "VIN", size: 6, required: false, type: "textfield"},
        {name: "Make", size: 4, required: false, type: "textfield"},
        {name: "Model", size: 4, required: false, type: "textfield"},
        {
            name: "ModelYear",
            size: 4,
            label: "Model year",
            required: false,
            type: "textfield",
            number: true,
        },
        {name: "LicensePlate", size: 6, required: false, type: "textfield", label: "License Plate"},
        {
            name: "LicensedState",
            size: 6,
            label: "Licensed in (state)",
            required: false,
            type: "selectList",
            coerceNumberOrNull: true,
        },
        {name: "TruckNumber", size: 6, required: false, type: "textfield", label: "Truck Number"},
        {name: "Notes", size: 12, required: false, type: "textfield", multiline: true},
    ];

    const selectData: SelectDataType = [
        {
            key: "LicensedState",
            data: licensedStateOptions,
            optionValue: "ID",
            optionLabel: "Name",
        },
    ];

    return (
        <Box
            component="form"
            autoComplete="off"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{
                paddingLeft: 2.5,
            }}
        >
            <GenericForm
                errors={errors}
                control={control}
                fields={fields}
                selectData={selectData}
                submitDisabled={addOrUpdateTruck.isLoading}
            />
        </Box>
    );
};

export default Truck;
