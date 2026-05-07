import React, {useState} from "react";
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
import {toast} from "react-toastify";
import TableEntityLink from "../../elements/TableEntityLink";
import {confirmDestructive} from "../../utils/appConfirm";

export default function CarriersIndex() {
    const {data: carriers = [], refetch} = trpc.useQuery(["carriers.getAll"]);
    const [name, setName] = useState("");
    const createMut = trpc.useMutation("carriers.put", {
        onSuccess() {
            toast.success("Carrier added");
            setName("");
            refetch();
        },
        onError(e) {
            toast.error(e.message);
        },
    });
    const deleteMut = trpc.useMutation("carriers.delete", {
        onSuccess() {
            toast.success("Carrier removed");
            refetch();
        },
        onError(e) {
            toast.error(e.message);
        },
    });

    return (
        <Box>
            <Typography variant="h5" sx={{mb: 2}}>
                Carriers (subcontractors)
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{mb: 2}}>
                External motor carriers drivers can be assigned to.
            </Typography>
            <Box sx={{display: "flex", gap: 1, mb: 2, alignItems: "center"}}>
                <TextField
                    size="small"
                    label="Carrier name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                />
                <Button
                    variant="contained"
                    disabled={!name.trim() || createMut.isLoading}
                    onClick={() => createMut.mutate({Name: name.trim()})}
                >
                    Add
                </Button>
            </Box>
            <Table size="small" sx={{maxWidth: 640}}>
                <TableHead>
                    <TableRow>
                        <TableCell>Name</TableCell>
                        <TableCell></TableCell>
                        <TableCell></TableCell>
                    </TableRow>
                </TableHead>
                <TableBody>
                    {carriers.map((c) => (
                        <TableRow key={c.ID}>
                            <TableCell>{c.Name}</TableCell>
                            <TableCell>
                                <TableEntityLink href={`/carriers/${c.ID}`}>
                                    View / edit
                                </TableEntityLink>
                            </TableCell>
                            <TableCell>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    disabled={deleteMut.isLoading}
                                    onClick={() => {
                                        confirmDestructive({
                                            title: "Delete carrier",
                                            message:
                                                "Delete this carrier? Drivers will be unassigned.",
                                            confirmLabel: "Delete",
                                            onConfirm: () =>
                                                deleteMut.mutate({ID: c.ID}),
                                        });
                                    }}
                                >
                                    Delete
                                </Button>
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Box>
    );
}
