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
import BasicAutocomplete from "elements/Autocomplete";
import CloseIcon from "@mui/icons-material/Close";
import {trpc} from "../../utils/trpc";
import {toast} from "react-toastify";

type SourcesType = z.infer<typeof SourcesModel>;

type LoadTypeRow = {
    ID: number;
    Description: string;
    Notes?: string | null;
    SourceID?: number | null;
};

const SourceDetail = ({initialSource}: {initialSource: SourcesType}) => {
    const [shouldRefresh, setShouldRefresh] = useState(false);
    const [pendingLoadTypes, setPendingLoadTypes] = useState<LoadTypeRow[]>([]);
    const [selectedLoadTypeID, setSelectedLoadTypeID] = useState(0);
    const [selectedLoadTypeQueryID, setSelectedLoadTypeQueryID] = useState(0);

    const [sourceLoadTypes, setSourceLoadTypes] = useState<LoadTypeRow[]>([]);

    trpc.useQuery(["sources.get", {ID: initialSource.ID}], {
        enabled: shouldRefresh || sourceLoadTypes.length === 0,
        refetchOnWindowFocus: false,
        onSuccess(data) {
            setSourceLoadTypes((data?.LoadTypes ?? []) as LoadTypeRow[]);
            setShouldRefresh(false);
        },
        onError(error) {
            console.warn(error.message);
            setShouldRefresh(false);
        },
    });

    trpc.useQuery(["loadtypes.get", {ID: selectedLoadTypeQueryID}], {
        enabled: selectedLoadTypeQueryID > 0,
        onSuccess(data) {
            if (!data) {
                return;
            }

            if (data.SourceID === initialSource.ID) {
                toast("That load type is already linked to this source.", {autoClose: 2000, type: "warning"});
            } else if (pendingLoadTypes.some((row) => row.ID === data.ID)) {
                toast("That load type is already queued to add.", {autoClose: 2000, type: "warning"});
            } else {
                setPendingLoadTypes((prev) => [
                    ...prev,
                    {
                        ID: data.ID,
                        Description: data.Description,
                        Notes: data.Notes,
                        SourceID: data.SourceID,
                    },
                ]);
            }
            setSelectedLoadTypeID(0);
            setSelectedLoadTypeQueryID(0);
        },
        onError(error) {
            toast(error.message, {autoClose: 3000, type: "error"});
            setSelectedLoadTypeID(0);
            setSelectedLoadTypeQueryID(0);
        },
    });

    const assignLoadTypes = trpc.useMutation("sources.assignLoadTypes", {
        async onSuccess(data) {
            toast(`Assigned ${data.updatedCount} load type(s).`, {autoClose: 2000, type: "success"});
            setPendingLoadTypes([]);
            setShouldRefresh(true);
        },
        onError(error) {
            toast(error.message, {autoClose: 3000, type: "error"});
        },
    });

    const removeLoadType = trpc.useMutation("sources.removeLoadType", {
        async onSuccess() {
            toast("Load type removed from source.", {autoClose: 2000, type: "success"});
            setShouldRefresh(true);
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
                        <BasicAutocomplete
                            label="Search load type"
                            optionLabel="Description"
                            optionValue="ID"
                            searchQuery="loadtypes"
                            defaultValue={selectedLoadTypeID}
                            onSelect={(loadTypeID: number) => {
                                setSelectedLoadTypeID(loadTypeID);
                                setSelectedLoadTypeQueryID(loadTypeID);
                            }}
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
                            setShouldRefresh(true)
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

    if (id && typeof id === "string") {
        initialSource = await prisma.sources.findFirst({
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
