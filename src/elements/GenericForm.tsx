import React from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import RHTextfield from "./RHTextfield";
import RHSelect from "./RHSelect";
import RHDatePicker from "./RHDatePicker";
import {Control, Controller} from "react-hook-form";
import Button from "@mui/material/Button";
import {FormFieldsType, SelectDataType} from "../utils/types";
import RHCheckbox from "./RHCheckbox";
import RHAutocomplete from "./RHAutocomplete";
import TextField from "@mui/material/TextField";

const GenericForm = ({
                         errors = [],
                         control,
                         fields = [],
                         selectData = [],
                         selectedCustomer = 0,
                         selectedSource = 0,
                         selectedLoadType = 0,
                         onDelete = null,
                         onReset = null,
                         submitDisabled = false,
                         deleteDisabled = false,
                     }: {
    errors: any;
    control: Control<any>;
    fields: FormFieldsType;
    selectData?: SelectDataType;
    selectedCustomer?: number | null;
    selectedSource?: number | null;
    selectedLoadType?: number | null;
    onDelete?: any;
    onReset?: any;
    submitDisabled?: boolean;
    deleteDisabled?: boolean;
}) => {
    return (
        <Grid2 container columnSpacing={2} rowSpacing={2}>
            {fields.map((field, index) => {
                switch (field.type) {
                    case "textfield": {
                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-" + field.name + "-grid"}
                            >
                                <RHTextfield
                                    name={field.name}
                                    control={control}
                                    required={field.required}
                                    label={field.label ?? field.name}
                                    type={field.number ? "number" : "text"}
                                    shouldError={field.shouldErrorOn?.includes(
                                        errors[field.name]?.type
                                    )}
                                    errorMessage={field.errorMessage ?? ""}
                                    multiline={!!field.multiline}
                                    maxRows={field.maxRows ?? 1}
                                    key={"form-" + index.toString() + "-" + field.name + "-field"}
                                    disabled={field.disabled}
                                />
                            </Grid2>
                        );
                    }
                    case "select": {
                        const foundData = selectData.filter(
                            (item) => item.key === field.name
                        )[0];
                        if (!foundData) {
                            //error here
                            return null;
                        }

                        const {data, optionValue, optionLabel, defaultValue} = foundData;

                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-" + field.name + "-grid"}
                            >
                                <RHAutocomplete
                                    name={field.name}
                                    control={control}
                                    data={data}
                                    optionLabel={optionLabel}
                                    optionValue={optionValue}
                                    defaultValue={defaultValue ?? null}
                                    key={"form-" + index.toString() + "-" + field.name + "-field"}
                                    label={field.label}
                                    shouldError={field.shouldErrorOn?.includes(
                                        errors[field.name]?.type
                                    )}
                                    errorMessage={field.errorMessage ?? ""}
                                    searchQuery={field.searchQuery ?? ""}
                                    groupBy={field.groupBy}
                                    groupByNames={field.groupByNames}
                                    selectedCustomer={selectedCustomer}
                                    selectedSource={selectedSource}
                                    selectedLoadType={selectedLoadType}
                                />
                            </Grid2>
                        );
                    }
                    case "selectList": {
                        const foundData = selectData.filter(
                            (item) => item.key === field.name
                        )[0];
                        if (!foundData) {
                            return null;
                        }

                        const {data, optionValue, optionLabel, defaultValue} = foundData;

                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-" + field.name + "-grid"}
                            >
                                <RHSelect
                                    name={field.name}
                                    control={control}
                                    data={data}
                                    optionLabel={optionLabel}
                                    optionValue={optionValue}
                                    defaultValue={defaultValue}
                                    key={"form-" + index.toString() + "-" + field.name + "-field"}
                                    label={field.label ?? field.name}
                                    shouldError={field.shouldErrorOn?.includes(
                                        errors[field.name]?.type
                                    )}
                                    errorMessage={field.errorMessage ?? ""}
                                    required={field.required}
                                    disabled={!!field.disabled}
                                    coerceNumberOrNull={!!field.coerceNumberOrNull}
                                />
                            </Grid2>
                        );
                    }
                    case "date": {
                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-" + field.name + "-grid"}
                            >
                                <RHDatePicker
                                    name={field.name}
                                    control={control}
                                    required={field.required}
                                    shouldError={field.shouldErrorOn?.includes(
                                        errors[field.name]?.type
                                    )}
                                    errorMessage={field.errorMessage}
                                    label={field.label}
                                />
                            </Grid2>
                        );
                    }
                    case "week": {
                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-" + field.name + "-grid"}
                            >
                                <RHDatePicker
                                    name={field.name}
                                    control={control}
                                    required={field.required}
                                    shouldError={field.shouldErrorOn?.includes(
                                        errors[field.name]?.type
                                    )}
                                    errorMessage={field.errorMessage}
                                    label={field.label}
                                    week={true}
                                />
                            </Grid2>
                        );
                    }
                    case "checkbox": {
                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-" + field.name + "-grid"}
                            >
                                <RHCheckbox
                                    name={field.name}
                                    control={control}
                                    key={"form-" + index.toString() + "-" + field.name + "-field"}
                                    label={field.label}
                                    shouldError={field.shouldErrorOn?.includes(
                                        errors[field.name]?.type
                                    )}
                                    errorMessage={field.errorMessage ?? ""}
                                    disabled={field.disabled}
                                />
                            </Grid2>
                        );
                    }
                    case "padding": {
                        return (
                            <Grid2
                                xs={field.size}
                                key={"form-" + index.toString() + "-padding"}
                            ></Grid2>
                        );
                    }
                }
            })}

            <Grid2 xs={3}>
                <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={submitDisabled}
                >
                    Submit
                </Button>
            </Grid2>
            {(onDelete || onReset) && <Grid2 xs={6}></Grid2>}
            {onDelete && (
                <Grid2 xs={3} sx={{display: "grid"}}>
                    <Button
                        type="button"
                        variant="contained"
                        color="error"
                        sx={{justifySelf: "flex-end"}}
                        disabled={deleteDisabled}
                        onClick={onDelete}
                    >
                        Delete
                    </Button>
                </Grid2>
            )}
            {/* {onReset && (
        <Grid2 xs={3} style={{ display: "grid" }}>
          <Button
            type={"button"}
            variant={"contained"}
            style={{ backgroundColor: "grey", justifySelf: "flex-end" }}
            onClick={onReset}
          >
            Reset Form
          </Button>
        </Grid2>
      )} */}
        </Grid2>
    );
};

export default GenericForm;
