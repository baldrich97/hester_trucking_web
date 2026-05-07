import React, {useMemo} from 'react';
import Box from "@mui/material/Box";
import {useForm} from "react-hook-form";
import {z} from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { DriversModel, StatesModel } from '../../../prisma/zod';
import {trpc} from "../../utils/trpc";
import { useRouter } from 'next/router';
import GenericForm from '../../elements/GenericForm'
import { toast } from "react-toastify";

type StatesType = z.infer<typeof StatesModel>;
type DriversType = z.infer<typeof DriversModel>;
import {FormFieldsType, SelectDataType} from "../../utils/types";
import {
    dateOnlyLocalToUtcNoon,
    parseDateOnlyFromJson,
} from "../../utils/dateOnly";

const defaultValues = {
    FirstName: '',
    MiddleName: '',
    LastName: '',
    Street: '',
    City: '',
    State: 25,
    ZIP: '',
    DOB: null,
    License: '',
    Phone: '',
    Email: '',
    HireDate: '',
    Notes: '',
    OwnerOperator: false,
    TIN: '',
    PayMethod: '',
    CarrierID: null as number | null,
};


const Driver = ({
    states,
    initialDriver = null,
    onCreated,
    submitLabel = "Submit",
    skipRouteRefresh = false,
}: {
    states: StatesType[];
    initialDriver?: null | DriversType;
    onCreated?: (driver: DriversType) => void;
    submitLabel?: string;
    skipRouteRefresh?: boolean;
}) => {

    const router = useRouter();

    const {data: carriers = []} = trpc.useQuery(["carriers.getAll"]);

    const carrierSelectData = useMemo(
        () => [{ID: "", Name: "(No carrier)"}, ...carriers],
        [carriers],
    );

    /** Calendar DOB from SSR is ISO midnight UTC; coerce to UTC noon + accept DatePicker `Date`s. */
    const dobFromJson = z.preprocess((v) => {
        if (v === "" || v === null || v === undefined) return null;
        if (v instanceof Date && !Number.isNaN(v.getTime())) {
            return dateOnlyLocalToUtcNoon(v);
        }
        return parseDateOnlyFromJson(v);
    }, z.date().nullable());

    const validationSchema = initialDriver
        ? DriversModel.extend({DOB: dobFromJson})
        : DriversModel.omit({ID: true}).extend({DOB: dobFromJson});

    type ValidationSchema = z.infer<typeof validationSchema>;

    const formDefaults = useMemo(
        () =>
            initialDriver
                ? {...initialDriver, DOB: parseDateOnlyFromJson(initialDriver.DOB)}
                : defaultValues,
        [initialDriver],
    );

    const {handleSubmit, formState: {errors}, control, reset} = useForm<ValidationSchema>({
        resolver: zodResolver(validationSchema),
        defaultValues: formDefaults,
    });

    const key = initialDriver ? 'drivers.post' : 'drivers.put';

    const addOrUpdateDriver = trpc.useMutation(key, {
        async onSuccess(data) {
            toast('Successfully Submitted!', {autoClose: 2000, type: 'success'})
            if (!initialDriver) {
                onCreated?.(data as DriversType);
            }
            reset(
                initialDriver
                    ? {...data, DOB: parseDateOnlyFromJson((data as DriversType).DOB)}
                    : defaultValues,
            );
        },
    });

   const onSubmit = async (data: ValidationSchema) => {
        toast('Submitting...', {autoClose: 2000, type: 'info'})
        const payload = {
            ...data,
            DOB: dateOnlyLocalToUtcNoon(data.DOB),
        };
        await addOrUpdateDriver.mutateAsync(payload);
        if (initialDriver && !skipRouteRefresh) {
            await router.replace(router.asPath);
        }
    }

    // Grid `size` values are out of 12 per row; each row below sums to 12 for even spacing.
    const fields: FormFieldsType = [
        {name: 'FirstName', size: 4, label: 'First Name', required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Driver name is required.', type: 'textfield'},
        {name: 'MiddleName', size: 4, label: 'Middle Name', required: false, type: 'textfield'},
        {name: 'LastName', size: 4, label: 'Last Name', required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Driver name is required.', type: 'textfield'},
        {name: 'Street', size: 12, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'Street address is required.', type: 'textfield'},
        {name: 'City', size: 5, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'City is required.', type: 'textfield'},
        {name: 'State', size: 4, required: false, type: 'select'},
        {name: 'ZIP', size: 3, required: true, shouldErrorOn: ['required', 'too_small'], errorMessage: 'ZIP code is required.', type: 'textfield', number: true},
        {
            name: 'DOB',
            size: 4,
            required: false,
            shouldErrorOn: ['invalid_type', 'invalid_union'],
            errorMessage: 'Enter a valid date of birth.',
            type: 'date',
        },
        {name: 'License', size: 4, required: false, type: 'textfield'},
        {name: 'Phone', size: 4, required: false, type: 'textfield'},
        {name: 'Email', size: 8, required: false, type: 'textfield', shouldErrorOn: ['invalid_string'], errorMessage: 'Please enter a valid email.'},
        {name: 'TIN', size: 4, label: 'TIN / EIN', required: false, type: 'textfield'},
        {name: 'HireDate', size: 4, label: 'Hire Date', required: false, type: 'textfield'},
        {name: "OwnerOperator", size: 4, required: false, type: "checkbox", disabled: false, label: 'O. Operator'},
        {name: 'PayMethod', size: 4, label: 'Pay method (e.g. D/D, Check)', required: false, type: 'textfield'},
        {
            name: 'CarrierID',
            size: 12,
            label: 'Carrier (subcontractor)',
            required: false,
            type: 'selectList',
            coerceNumberOrNull: true,
        },
        {name: 'Notes', size: 12, required: false, type: 'textfield', multiline: true},
    ]

    const selectData: SelectDataType = [
        {key: 'State', data: states, defaultValue: 25, optionValue: 'ID', optionLabel: 'Name'},
        {
            key: 'CarrierID',
            data: carrierSelectData as Record<string, unknown>[],
            optionValue: 'ID',
            optionLabel: 'Name',
        },
    ]

    return (
        <Box
            component='form'
            autoComplete='off'
            noValidate
            onSubmit={(e) => {
                e.preventDefault();
                e.stopPropagation();
                void handleSubmit(onSubmit)(e);
            }}
            sx={{
                px: 2.5,
                py: 1,
                maxWidth: 960,
            }}
        >
            <GenericForm
                errors={errors}
                control={control}
                fields={fields}
                selectData={selectData}
                submitDisabled={addOrUpdateDriver.isLoading}
                submitLabel={submitLabel}
            />
        </Box>
    )
}

export default Driver;

