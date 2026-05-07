import React, {useEffect, useMemo, useState} from "react";
import {useRouter} from "next/router";
import {trpc} from "../../utils/trpc";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import NextLink from "next/link";
import MuiLink from "@mui/material/Link";
import MenuItem from "@mui/material/MenuItem";
import Grid2 from "@mui/material/Unstable_Grid2";
import {tableTextLinkSx} from "../../theme/muiShared";
import {toast} from "react-toastify";
import {CarriersModel} from "../../../prisma/zod";
import type {z} from "zod";

type CarrierForm = z.infer<typeof CarriersModel>;

const emptyForm: CarrierForm = {
    ID: 0,
    Name: "",
    ContactName: null,
    Phone: null,
    Street: null,
    City: null,
    State: null,
    ZIP: null,
};

export default function CarrierDetail() {
    const router = useRouter();
    const rawId = router.query.id;
    const id = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;
    const enabled = Number.isFinite(id);
    const {data, refetch} = trpc.useQuery(["carriers.getOne", {ID: id}], {enabled});
    const {data: states = []} = trpc.useQuery(["states.getAll"]);

    const [draft, setDraft] = useState<CarrierForm>(emptyForm);

    useEffect(() => {
        if (!data) return;
        setDraft({
            ID: data.ID,
            Name: data.Name,
            ContactName: data.ContactName ?? null,
            Phone: data.Phone ?? null,
            Street: data.Street ?? null,
            City: data.City ?? null,
            State: data.State ?? null,
            ZIP: data.ZIP ?? null,
        });
    }, [data]);

    const updateMut = trpc.useMutation("carriers.post", {
        onSuccess() {
            toast.success("Saved");
            refetch();
        },
        onError(e) {
            toast.error(e.message);
        },
    });

    const stateRows = useMemo(
        () => [...states].sort((a, b) => a.Name.localeCompare(b.Name)),
        [states],
    );

    if (!enabled) {
        return null;
    }

    if (data === undefined) {
        return <Typography>Loading…</Typography>;
    }

    if (data === null) {
        return <Typography>Carrier not found.</Typography>;
    }

    const setField =
        <K extends keyof CarrierForm>(key: K) =>
        (value: CarrierForm[K]) => {
            setDraft((d) => ({...d, [key]: value}));
        };

    return (
        <Box>
            <Typography variant="h5" sx={{mb: 2}}>
                Carrier
            </Typography>
            <Grid2 container spacing={2} sx={{maxWidth: 720, mb: 3}}>
                <Grid2 xs={12}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Carrier name"
                        value={draft.Name}
                        onChange={(e) => setField("Name")(e.target.value)}
                    />
                </Grid2>
                <Grid2 xs={12} sm={6}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Contact name"
                        value={draft.ContactName ?? ""}
                        onChange={(e) => setField("ContactName")(e.target.value || null)}
                    />
                </Grid2>
                <Grid2 xs={12} sm={6}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Phone"
                        value={draft.Phone ?? ""}
                        onChange={(e) => setField("Phone")(e.target.value || null)}
                    />
                </Grid2>
                <Grid2 xs={12}>
                    <TextField
                        fullWidth
                        size="small"
                        label="Street"
                        value={draft.Street ?? ""}
                        onChange={(e) => setField("Street")(e.target.value || null)}
                    />
                </Grid2>
                <Grid2 xs={12} sm={6}>
                    <TextField
                        fullWidth
                        size="small"
                        label="City"
                        value={draft.City ?? ""}
                        onChange={(e) => setField("City")(e.target.value || null)}
                    />
                </Grid2>
                <Grid2 xs={12} sm={3}>
                    <TextField
                        fullWidth
                        select
                        size="small"
                        label="State"
                        value={draft.State ?? ""}
                        onChange={(e) => {
                            const v = e.target.value;
                            setField("State")(v === "" ? null : parseInt(v, 10));
                        }}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        {stateRows.map((s) => (
                            <MenuItem key={s.ID} value={s.ID}>
                                {s.Name} ({s.Abbreviation})
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid2>
                <Grid2 xs={12} sm={3}>
                    <TextField
                        fullWidth
                        size="small"
                        label="ZIP"
                        value={draft.ZIP ?? ""}
                        onChange={(e) => setField("ZIP")(e.target.value || null)}
                    />
                </Grid2>
                <Grid2 xs={12}>
                    <Button
                        variant="contained"
                        disabled={!draft.Name.trim() || updateMut.isLoading}
                        onClick={() => updateMut.mutate(draft)}
                    >
                        Save
                    </Button>
                </Grid2>
            </Grid2>
            <Typography variant="subtitle1" sx={{mb: 1}}>
                Drivers
            </Typography>
            <Table size="small" sx={{maxWidth: 560}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell>Type</TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {data.Drivers.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={3}>No drivers assigned.</TableCell>
                        </TableRow>
                    ) : (
                        data.Drivers.map((d) => (
                            <TableRow key={d.ID}>
                                <TableCell>
                                    {d.FirstName} {d.LastName}
                                </TableCell>
                                <TableCell>{d.OwnerOperator ? "Owner op" : "W-2"}</TableCell>
                                <TableCell>
                                    <MuiLink
                                        component={NextLink}
                                        href={`/drivers/${d.ID}`}
                                        sx={tableTextLinkSx}
                                    >
                                        Open
                                    </MuiLink>
                                </TableCell>
                            </TableRow>
                        ))
                    )}
                </TableBody>
            </Table>
        </Box>
    );
}
