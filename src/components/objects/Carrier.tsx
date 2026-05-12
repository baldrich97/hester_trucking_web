import React, {useMemo} from "react";
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {CarriersModel, StatesModel} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";
import {FormFieldsType, SelectDataType} from "../../utils/types";

type StatesType = z.infer<typeof StatesModel>;

const defaultValues = {
    Name: "",
    ContactName: "" as string | null,
    Phone: "" as string | null,
    Street: "" as string | null,
    City: "" as string | null,
    State: null as number | null,
    ZIP: "" as string | null,
};

const Carrier = ({states}: {states?: StatesType[]}) => {
    const {data: statesQuery = []} = trpc.useQuery(["states.getAll"], {
        enabled: !states?.length,
    });
    const statesList = states?.length ? states : statesQuery;

    const validationSchema = CarriersModel.omit({ID: true});
    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues,
    });

    const createCarrier = trpc.useMutation("carriers.put", {
        async onSuccess() {
            toast("Successfully submitted!", {autoClose: 2000, type: "success"});
            reset(defaultValues);
        },
        async onError(error) {
            toast(error.message, {autoClose: 8000, type: "error"});
        },
    });

    const onSubmit = async (data: ValidationSchema) => {
        toast("Submitting...", {autoClose: 2000, type: "info"});
        await createCarrier.mutateAsync({
            ...data,
            ContactName: data.ContactName || null,
            Phone: data.Phone || null,
            Street: data.Street || null,
            City: data.City || null,
            ZIP: data.ZIP || null,
        });
    };

    const fields: FormFieldsType = [
        {
            name: "Name",
            size: 12,
            required: true,
            shouldErrorOn: ["required", "too_small"],
            errorMessage: "Carrier name is required.",
            type: "textfield",
        },
        {
            name: "ContactName",
            size: 12,
            required: false,
            type: "textfield",
            label: "Contact name",
        },
        {
            name: "Phone",
            size: 12,
            required: false,
            type: "textfield",
        },
        {
            name: "Street",
            size: 12,
            required: false,
            type: "textfield",
        },
        {
            name: "City",
            size: 6,
            required: false,
            type: "textfield",
        },
        {
            name: "State",
            size: 3,
            required: false,
            type: "selectList",
            coerceNumberOrNull: true,
            label: "State",
        },
        {
            name: "ZIP",
            size: 3,
            required: false,
            type: "textfield",
            label: "ZIP",
        },
    ];

    const stateOptions = useMemo(
        () => [{ID: "", Name: "(None)"}, ...statesList] as Record<string, unknown>[],
        [statesList],
    );

    const selectData: SelectDataType = [
        {
            key: "State",
            data: stateOptions,
            optionValue: "ID",
            optionLabel: "Name",
        },
    ];

    return (
        <Box
            component="form"
            autoComplete="off"
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                void handleSubmit(onSubmit)(e);
            }}
            sx={{paddingLeft: 2.5}}
        >
            <GenericForm
                errors={errors}
                control={control}
                fields={fields}
                selectData={selectData}
                submitDisabled={createCarrier.isLoading}
            />
        </Box>
    );
};

export default Carrier;
