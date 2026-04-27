import React, { useRef, useState } from "react";
import TextField, { TextFieldProps } from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import { trpc } from "../utils/trpc";

const BasicAutocomplete = ({
  defaultValue = "",
  label,
  data = [],
  optionLabel,
  optionValue,
  searchQuery,
  onSelect,
}: {
  defaultValue?: string | number | null;
  label: string;
  data?: Array<any>;
  optionLabel: string;
  optionValue: string;
  searchQuery: string;
  onSelect: any;
}) => {
  const formatOptionLabel = (optionLabel: string, item: any): string => {
    let returnable = "";
    if (optionLabel.split("+").length > 1) {
      if (defaultValue === 0) {
        return item[optionLabel.split("+")[0] ?? ""];
      }
      optionLabel.split("+").forEach((labelPart, index) => {
        if (Object.keys(item).includes(labelPart)) {
          returnable += item[labelPart] ?? "";
        } else {
          returnable += labelPart;
        }
        if (
          index + 1 !== optionLabel.split("+").length &&
          optionLabel.split("+")[index + 1] !== ","
        ) {
          returnable += " ";
        }
      });
    } else {
      return item[optionLabel]?.toString() ?? "";
    }
    return returnable;
  };

  const [search, setSearch] = useState("");

  const [value, setValue] = useState(
    defaultValue
      ? data.find((item) => {
          return item.ID == defaultValue;
        }) ?? null
      : null
  );

  const [shouldSearch, setShouldSearch] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  trpc.useQuery([searchQuery + ".search", { search }], {
    enabled: shouldSearch && search.trim().length > 0,
    onSuccess(data) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      setOptions(data);
      setShouldSearch(false);
    },
    onError(error) {
      console.warn(error.message);
      setShouldSearch(false);
    },
  });

  const [open, setOpen] = React.useState(false);
  const [options, setOptions] = React.useState<readonly any[]>(data ?? []);
  const loading = open && options.length === 0;

  // React.useEffect(() => {
  //     console.log(search)
  //     if (search.toString().length === 0) {
  //         setOptions(data ?? []);
  //     }
  // }, [open, search]);

  React.useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    if (search.toString().replaceAll(" ", "").length === 0 || !searchQuery) {
      setOptions(data ?? []);
      setShouldSearch(false);
      return;
    }
    debounceRef.current = setTimeout(() => {
      setShouldSearch(true);
    }, 250);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
        debounceRef.current = null;
      }
    };
  }, [search, searchQuery]);

  return (
    <Autocomplete
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      id={label + "-autocomplete"}
      open={open}
      fullWidth={true}
      onOpen={() => {
        setOpen(true);
      }}
      onClose={() => {
        setOpen(false);
      }}
      isOptionEqualToValue={(
        option: { [x: string]: any },
        value: { [x: string]: any }
      ) => {
        return option[optionValue] === value[optionValue];
      }}
      getOptionLabel={(option: any) => formatOptionLabel(optionLabel, option)}
      options={options ?? data}
      loading={loading}
      onChange={(e: any, data: { [x: string]: any }) => {
        setValue(data);
        onSelect(data?.ID ?? 0);
      }}
      value={value}
      onInputChange={(_, inputValue, reason) => {
        if (reason === "input") {
          setSearch(inputValue);
        } else if (reason === "clear") {
          setSearch("");
          setOptions(data ?? []);
        }
      }}
      size={"small"}
      loadingText={"Please start typing..."}
      renderInput={(params: JSX.IntrinsicAttributes & TextFieldProps) => (
        <TextField
          {...params}
          label={label}
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <React.Fragment>
                {loading ? (
                  <CircularProgress color="inherit" size={20} />
                ) : null}
                {/*// eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                 // @ts-ignore*/}
                {params.InputProps.endAdornment}
              </React.Fragment>
            ),
          }}
        />
      )}
    />
  );
};

export default BasicAutocomplete;
