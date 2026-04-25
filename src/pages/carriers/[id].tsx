import React, {useEffect, useState} from "react";
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
import {tableTextLinkSx} from "../../theme/muiShared";
import {toast} from "react-toastify";

export default function CarrierDetail() {
    const router = useRouter();
    const rawId = router.query.id;
    const id = typeof rawId === "string" ? parseInt(rawId, 10) : NaN;
    const enabled = Number.isFinite(id);
    const {data, refetch} = trpc.useQuery(["carriers.getOne", {ID: id}], {enabled});
    const [name, setName] = useState("");
    useEffect(() => {
        if (data?.Name != null) setName(data.Name);
    }, [data?.Name]);

    const updateMut = trpc.useMutation("carriers.post", {
        onSuccess() {
            toast.success("Saved");
            refetch();
        },
        onError(e) {
            toast.error(e.message);
        },
    });

    if (!enabled) {
        return null;
    }

    if (data === undefined) {
        return <Typography>Loading…</Typography>;
    }

    if (data === null) {
        return <Typography>Carrier not found.</Typography>;
    }

    return (
        <Box>
            <Typography variant="h5" sx={{mb: 2}}>
                Carrier
            </Typography>
            <Box sx={{display: "flex", gap: 1, mb: 3, alignItems: "center", maxWidth: 480}}>
                <TextField
                    fullWidth
                    size="small"
                    label="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Button
                    variant="contained"
                    disabled={!name.trim() || updateMut.isLoading}
                    onClick={() => updateMut.mutate({ID: data.ID, Name: name.trim()})}
                >
                    Save
                </Button>
            </Box>
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
