import React from "react";
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from "zod";
import {zodResolver} from "@hookform/resolvers/zod";
import {SourcesModel} from "../../../prisma/zod";
import {trpc} from "../../utils/trpc";
import {useRouter} from "next/router";
import GenericForm from "../../elements/GenericForm";
import {toast} from "react-toastify";
import {FormFieldsType} from "../../utils/types";
import {confirmAlert} from "react-confirm-alert";
import "react-confirm-alert/src/react-confirm-alert.css";

type SourcesType = z.infer<typeof SourcesModel>;

const defaultValues = {
    Name: "",
};

const Source = ({initialSource = null}: {initialSource?: null | SourcesType}) => {
    const router = useRouter();
    const validationSchema = initialSource ? SourcesModel : SourcesModel.omit({ID: true});
    type ValidationSchema = z.infer<typeof validationSchema>;

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: initialSource ?? defaultValues,
    });

    const key = initialSource ? "sources.post" : "sources.put";
    const addOrUpdateSource = trpc.useMutation(key, {
        async onSuccess(data) {
            toast("Successfully Submitted!", {autoClose: 2000, type: "success"});
            reset(initialSource ? data : defaultValues);
        },
    });

    const deleteSource = trpc.useMutation("sources.delete", {
        async onSuccess() {
            toast("Successfully Deleted!", {autoClose: 2000, type: "success"});
            await router.replace("/sources");
        },
    });

    const onSubmit = async (data: ValidationSchema) => {
        toast("Submitting...", {autoClose: 2000, type: "info"});
        await addOrUpdateSource.mutateAsync(data);
        if (key === "sources.put") {
            await router.replace(router.asPath);
        }
    };

    const fields: FormFieldsType = [
        {
            name: "Name",
            size: 12,
            required: true,
            shouldErrorOn: ["required", "too_small"],
            errorMessage: "Source name is required.",
            type: "textfield",
        },
    ];

    return (
        <Box
            component="form"
            autoComplete="off"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
            sx={{paddingLeft: 2.5}}
        >
            <GenericForm
                errors={errors}
                control={control}
                fields={fields}
                onDelete={
                    initialSource
                        ? () => {
                            confirmAlert({
                                title: "Confirm Deletion",
                                message: "Delete this source? Any linked load types will be unassigned.",
                                buttons: [
                                    {
                                        label: "Yes",
                                        onClick: async () => {
                                            await deleteSource.mutateAsync({ID: initialSource.ID});
                                        },
                                    },
                                    {label: "No"},
                                ],
                            });
                        }
                        : null
                }
            />
        </Box>
    );
};

export default Source;
