import React, {useMemo, useState} from "react";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {SourcesModel} from "../../../prisma/zod";
import {z} from "zod";
import SourceObject from "../../components/objects/Source";
import Grid2 from "@mui/material/Unstable_Grid2";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import CircularProgress from "@mui/material/CircularProgress";
import CloseIcon from "@mui/icons-material/Close";
import {trpc} from "../../utils/trpc";
import {toast} from "react-toastify";

type SourcesType = z.infer<typeof SourcesModel>;

type LoadTypeRow = {
    ID: number;
    Description: string;
    Notes?: string | null;
};

const SourceDetail = ({initialSource}: {initialSource: SourcesType}) => {
    const [pendingLoadTypes, setPendingLoadTypes] = useState<LoadTypeRow[]>([]);
    const [search, setSearch] = useState("");
    const [selectedLoadType, setSelectedLoadType] = useState<LoadTypeRow | null>(null);
    const [sourceLoadTypes, setSourceLoadTypes] = useState<LoadTypeRow[]>([]);

    const sourceQuery = trpc.useQuery(["sources.get", {ID: initialSource.ID}], {
        refetchOnWindowFocus: false,
        onSuccess(data) {
            setSourceLoadTypes((data?.LoadTypes ?? []) as LoadTypeRow[]);
        },
        onError(error) {
            console.warn(error.message);
        },
    });

    const availableQuery = trpc.useQuery(["sources.searchAvailableLoadTypes", {
        SourceID: initialSource.ID,
        search,
    }], {
        refetchOnWindowFocus: false,
    });
    const availableLoadTypes = (availableQuery.data ?? []) as LoadTypeRow[];

    const assignLoadTypes = trpc.useMutation("sources.assignLoadTypes", {
        async onSuccess(data) {
            toast(`Assigned ${data.updatedCount} load type(s).`, {autoClose: 2000, type: "success"});
            setPendingLoadTypes([]);
            await sourceQuery.refetch();
            await availableQuery.refetch();
        },
        onError(error) {
            toast(error.message, {autoClose: 3000, type: "error"});
        },
    });

    const removeLoadType = trpc.useMutation("sources.removeLoadType", {
        async onSuccess() {
            toast("Load type removed from source.", {autoClose: 2000, type: "success"});
            await sourceQuery.refetch();
            await availableQuery.refetch();
        },
        onError(error) {
            toast(error.message, {autoClose: 3000, type: "error"});
        },
    });

    const canAssign = pendingLoadTypes.length > 0 && !assignLoadTypes.isLoading;
    const sortedSourceLoadTypes = useMemo(
        () => [...sourceLoadTypes].sort((a, b) => a.Description.localeCompare(b.Description)),
        [sourceLoadTypes],
    );
    const selectableLoadTypes = useMemo(
        () =>
            availableLoadTypes.filter(
                (row) =>
                    !pendingLoadTypes.some((pending) => pending.ID === row.ID) &&
                    !sourceLoadTypes.some((associated) => associated.ID === row.ID),
            ),
        [availableLoadTypes, pendingLoadTypes, sourceLoadTypes],
    );

    return (
        <Grid2 container spacing={2}>
            <Grid2 xs={12} md={6}>
                <Typography variant="h5" sx={{mb: 1}}>
                    Source Details
                </Typography>
                <SourceObject initialSource={initialSource} />
            </Grid2>

            <Grid2 xs={12} md={6}>
                <Typography variant="h5" sx={{mb: 1}}>
                    Assign Load Types
                </Typography>
                <Box sx={{display: "flex", gap: 1, alignItems: "center", mb: 1}}>
                    <Box sx={{flexGrow: 1}}>
                        <Autocomplete
                            options={selectableLoadTypes}
                            getOptionLabel={(option) => option.Description}
                            isOptionEqualToValue={(option, value) => option.ID === value.ID}
                            loading={availableQuery.isLoading}
                            value={selectedLoadType}
                            onChange={(_, value) => {
                                if (!value) {
                                    setSelectedLoadType(null);
                                    return;
                                }
                                if (pendingLoadTypes.some((row) => row.ID === value.ID)) {
                                    toast("That load type is already queued to add.", {autoClose: 2000, type: "warning"});
                                    setSelectedLoadType(null);
                                    return;
                                }
                                setPendingLoadTypes((prev) => [...prev, value]);
                                setSelectedLoadType(null);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    size="small"
                                    label="Search load type"
                                    onChange={(e) => {
                                        setSearch(e.currentTarget.value);
                                    }}
                                    InputProps={{
                                        ...params.InputProps,
                                        endAdornment: (
                                            <>
                                                {availableQuery.isLoading ? (
                                                    <CircularProgress color="inherit" size={16} />
                                                ) : null}
                                                {params.InputProps.endAdornment}
                                            </>
                                        ),
                                    }}
                                />
                            )}
                        />
                    </Box>
                    <Button
                        variant="contained"
                        color="primary"
                        disabled={!canAssign}
                        onClick={async () => {
                            await assignLoadTypes.mutateAsync({
                                SourceID: initialSource.ID,
                                LoadTypeIDs: pendingLoadTypes.map((item) => item.ID),
                            });
                        }}
                    >
                        Add Selected
                    </Button>
                </Box>

                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {pendingLoadTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2}>No pending load types.</TableCell>
                            </TableRow>
                        ) : (
                            pendingLoadTypes.map((row) => (
                                <TableRow key={`pending-${row.ID}`}>
                                    <TableCell>{row.Description}</TableCell>
                                    <TableCell align="right">
                                        <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            sx={{minWidth: 40}}
                                            onClick={() => {
                                                setPendingLoadTypes((prev) => prev.filter((item) => item.ID !== row.ID));
                                            }}
                                        >
                                            <CloseIcon />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Grid2>

            <Grid2 xs={12}>
                <Divider sx={{my: 2}} />
                <Typography variant="h5" sx={{mb: 1}}>
                    Associated Load Types
                </Typography>
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Description</TableCell>
                            <TableCell>Notes</TableCell>
                            <TableCell align="right"></TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sortedSourceLoadTypes.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3}>No load types assigned.</TableCell>
                            </TableRow>
                        ) : (
                            sortedSourceLoadTypes.map((row) => (
                                <TableRow key={`assigned-${row.ID}`}>
                                    <TableCell>{row.Description}</TableCell>
                                    <TableCell>{row.Notes ?? "N/A"}</TableCell>
                                    <TableCell align="right">
                                        <Button
                                            variant="contained"
                                            color="error"
                                            size="small"
                                            sx={{minWidth: 40}}
                                            onClick={async () => {
                                                await removeLoadType.mutateAsync({
                                                    SourceID: initialSource.ID,
                                                    LoadTypeID: row.ID,
                                                });
                                            }}
                                        >
                                            <CloseIcon />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Grid2>
        </Grid2>
    );
};

export default SourceDetail;

export const getServerSideProps: GetServerSideProps = async (context) => {
    const id = context.params?.id;
    let initialSource = null;
    const prismaAny = prisma as any;

    if (id && typeof id === "string") {
        initialSource = await prismaAny.sources.findFirst({
            where: {ID: parseInt(id, 10)},
        });
    }

    if (!initialSource) {
        return {
            redirect: {
                permanent: false,
                destination: "/sources",
            },
        };
    }

    return {
        props: {
            initialSource: JSON.parse(JSON.stringify(initialSource)),
        },
    };
};
