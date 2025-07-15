import {CompleteFormOptions, DriverFormsModel, DriversModel} from "../../../prisma/zod";
import {useRouter} from "next/router";
import {trpc} from "../../utils/trpc";
import React, {useState} from "react";
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
import moment from "moment";

const DataModel = DriversModel.extend({
    DriverForms: z.array(DriverFormsModel).optional()
})

type DataType = z.infer<typeof DataModel>;

const Driver_Forms = ({data, all_forms}: { data: DataType[], all_forms: CompleteFormOptions[] }) => {

    const router = useRouter();

    const deleteDriverForm = trpc.useMutation("driverForms.delete", {
        onSuccess: async () => {
            setSelectedForm(null);
            setSelectedDriver(null);
            setSelectedDate(null);
            await router.replace(router.asPath);
        },
        onError: (err: any) => {
            console.error("Failed to delete driver form", err);
        }
    });

    const [modalOpen, setModalOpen] = useState<boolean>(false);
    const [selectedForm, setSelectedForm] = useState<CompleteFormOptions | null>(null);
    const [selectedDriver, setSelectedDriver] = useState<DataType | null>(null);
    const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);

    const handleCheckboxClick = (driver: DataType, form: CompleteFormOptions) => {
        const match = driver.DriverForms?.find(df => df.Form === form.ID);
        const isChecked = Boolean(match);

        if (!isChecked) {
            // Show modal to select date for new form (you already handle this)
            setSelectedDriver(driver);
            setSelectedForm(form);
            setSelectedDate(null);
            setModalOpen(true);
        } else {
            // Checkbox is being unchecked — confirm and delete
            confirmAlert({
                title: 'Confirm Uncheck',
                message: `Are you sure you want to uncheck ${form.Forms.DisplayName} for ${driver.FirstName ?? ""} ${driver.LastName ?? ""}?`,
                buttons: [
                    {
                        label: 'Yes',
                        onClick: async () => {
                            deleteDriverForm.mutate({
                                driverId: driver.ID,
                                formId: form.ID
                            });
                        }
                    },
                    {
                        label: 'No',
                        onClick: () => {
                            // Do nothing — UI will not update checkbox state since state is derived from data
                        }
                    }
                ]
            });
        }
    };

    const handleModalClose = () => {
        setModalOpen(false);
        setSelectedDriver(null);
        setSelectedForm(null);
        setSelectedDate(null);
    };

    const getModalTitle = (formName: string | string[]) => {
        if (formName.includes("Exp")) return "Set Expiration Date (Future)";
        if (formName.includes("Rec")) return "Set Received Date (Past)";
        return "Set Date";
    };

    const addDriverForm = trpc.useMutation("driverForms.put", {
        async onSuccess() {
            toast('Successfully Submitted!', {autoClose: 2000, type: 'success'})

        }
    })

    const handleDateSave = async () => {
        if (selectedForm === null || selectedDriver === null || selectedDate === null) {
            return;
        }
        toast('Submitting...', {autoClose: 2000, type: 'info'})
        await addDriverForm.mutateAsync({Form: selectedForm.Form, Driver: selectedDriver.ID, Expiration: new Date(selectedDate.format('YYYY-MM-DD'))})
        await router.replace(router.asPath);
        handleModalClose()
    };

    return (
        <LocalizationProvider dateAdapter={AdapterDayjs}>
            <Grid2 container direction="column" spacing={2}>
                {/* Header row: One column per form */}
                <Grid2 container>
                    <Grid2 xs={2}>
                        <Typography fontWeight="bold">Driver Name</Typography>
                    </Grid2>
                    {all_forms.map((form) => (
                        <Grid2 key={form.ID} xs>
                            <Typography fontWeight="bold">{form.Forms.DisplayName}</Typography>
                        </Grid2>
                    ))}
                </Grid2>

                {/* One row per driver */}
                {data.map((driver) => (
                    <Grid2 container key={driver.ID} alignItems="center">
                        <Grid2 xs={2}>
                            <Typography>{driver.FirstName ?? ""} {driver.LastName ?? ""}</Typography>
                        </Grid2>

                        {all_forms.map((form) => {
                            const matchingForm = driver.DriverForms?.find(
                                (df) => df.Form === form.ID
                            );

                            const isExpiration = form.Forms.Name.includes("Exp");
                            const isInvalid = matchingForm ? isExpiration
                                ? moment().isAfter(moment(matchingForm.Expiration), 'day')
                                : moment(matchingForm.Expiration).year() !== moment().year() : true;


                            const isChecked = Boolean(matchingForm);
                            const createdDate = matchingForm
                                ? new Date(matchingForm.Created).toLocaleDateString('en-US') // D/M/Y
                                : '';
                            const expirationDate = matchingForm && matchingForm.Expiration
                                ? new Date(matchingForm.Expiration).toLocaleDateString('en-US') // D/M/Y
                                : null;

                            return (
                                <Grid2 key={form.ID} xs display="flex" justifyContent="center">
                                    <Tooltip title={isChecked ? expirationDate ?? createdDate : ''}>
                                        <Checkbox
                                            checked={isChecked}
                                            onClick={() => handleCheckboxClick(driver, form)}
                                            color={isInvalid ? "error" : "primary"}
                                        />
                                    </Tooltip>
                                </Grid2>
                            );
                        })}
                    </Grid2>
                ))}
            </Grid2>

            {/* Modal with DatePicker */}
            <Modal open={modalOpen} onClose={handleModalClose}>
                <Box
                    sx={{
                        p: 4,
                        backgroundColor: 'background.paper',
                        borderRadius: 2,
                        boxShadow: 24,
                        width: 300,
                        mx: 'auto',
                        mt: '15%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 2,
                    }}
                >
                    <Typography variant="h6">
                        {getModalTitle(selectedForm?.Forms.Name || '')}
                    </Typography>

                    <DatePicker
                        label="Select Date"
                        value={selectedDate}
                        onChange={(newValue) => setSelectedDate(newValue)}
                        renderInput={(params) => <TextField {...params} />}
                    />

                    <Box display="flex" justifyContent="flex-end" gap={1}>
                        <Button onClick={handleModalClose}>Cancel</Button>
                        <Button color={"primary"} style={{backgroundColor: "#1565C0"}} variant="contained" onClick={handleDateSave} disabled={!selectedDate}>
                            Save
                        </Button>
                    </Box>
                </Box>
            </Modal>
        </LocalizationProvider>
    )
};

export default Driver_Forms;