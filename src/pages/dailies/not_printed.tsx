import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
import KeyboardDoubleArrowLeft from '@mui/icons-material/KeyboardDoubleArrowLeft';
import KeyboardDoubleArrowRight from '@mui/icons-material/KeyboardDoubleArrowRight';
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Grid2 from "@mui/material/Unstable_Grid2";
import React from "react";
import LoadingModal from "elements/LoadingModal";
import moment from "moment";
import {trpc} from "utils/trpc";
import DailySheet from "components/objects/DailySheet";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Tooltip from "@mui/material/Tooltip";
import {z} from "zod";
import {CompleteJobs, DailiesModel, DriversModel, LoadsModel} from "../../../prisma/zod";
import {useRouter} from "next/router"

type Loads = z.infer<typeof LoadsModel>;

type Driver = z.infer<typeof DriversModel>;

type Daily = z.infer<typeof DailiesModel>;

interface DriverSheet extends Daily {
    Drivers: Driver,
    Jobs: CompleteJobs[]
}

export default function Dailies() {
    const router= useRouter();

    const [page, setPage] = React.useState<number>(1);
    const [loading, setLoading] = React.useState<boolean>(false);
    const [shouldRefresh, setShouldRefresh] = React.useState<boolean>(false);
    const [data, setData] = React.useState<any>([]);
    const [initialExpand, setInitialExpand] = React.useState<any>(null);
    const [grabCount, setGrabCount] = React.useState<number>(0);

    React.useEffect(() => {
        setData([])
        setLoading(true);
        setShouldRefresh(true);
    }, [page]);

    React.useEffect(() => {
        setLoading(true);
        setPage(1)
        setInitialExpand(router.query?.forceExpand ?? null)
        setforceExpand(false)
        setData([]);
        setShouldRefresh(true);
    }, [router.query]);

    trpc.useQuery(["dailies.getNotPrinted", {page: page}], {
        enabled: shouldRefresh,
        onSuccess(object) {
            setGrabCount(parseInt(object?.warnings[0] ?? '0') ?? 0)
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setData(object ? object.data.filter((sheet) => sheet.Jobs.filter((job) => job.Loads.length !== 0).length > 0).sort((a, b) => a.Drivers.FirstName.localeCompare(b.Drivers.FirstName)) : []);
            setLoading(false);
            setShouldRefresh(false);
        },
    });



    const [forceExpand, setforceExpand] = React.useState(true);
    return (
        <Box sx={{width: "100%"}}>
            <h1
                style={{
                    textAlign: 'left',
                    paddingBottom: '10px',
                    margin: 0,
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                }}
            >
                {data.length > 0 ? 'Dailies Unprinted' : 'There are no unprinted Dailies.'}
            </h1>
            <b>If a daily on here has been printed, it means there are new loads that have not been printed.</b>
            <LoadingModal isOpen={loading}/>
            {data && data.length > 0 && <Paper sx={{width: "100%", mb: 2}}>
                <Grid2 container columnSpacing={1} rowSpacing={1} flexDirection={'row'} sx={{height: 50}}>
                    <Grid2 xs={"auto"}>
                        <Tooltip title={forceExpand ? 'Close all sheets.' : 'Expand all sheets.'}>
                            <Button
                                variant="text"
                                type={"button"}
                                size="small"
                                style={{
                                    minHeight: "30px",
                                    maxHeight: "30px",
                                    minWidth: "30px",
                                    maxWidth: "30px",
                                }}
                                color="inherit"
                                onClick={() => {
                                    setInitialExpand(null)
                                    setforceExpand(!forceExpand);
                                }}
                            >
                                {forceExpand ? (
                                    <ExpandMore sx={{fontSize: 40}}/>
                                ) : (
                                    <ChevronRight sx={{fontSize: 40}}/>
                                )}
                            </Button>
                        </Tooltip>
                    </Grid2>
                    <Grid2
                        xs={2}
                        sx={{display: "flex", justifyContent: "space-between"}}
                    >
                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "40px",
                                maxWidth: "40px",
                            }}
                            onClick={() => {
                                setInitialExpand(null)
                                setPage(1);
                            }}
                            disabled={page === 1}
                        >
                            <KeyboardDoubleArrowLeft sx={{fontSize: 20}}/>
                        </Button>


                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "40px",
                                maxWidth: "40px",
                            }}
                            onClick={() => {
                                setInitialExpand(null)
                                setPage(page - 1);
                            }}
                            disabled={page === 1}
                        >
                            <ChevronLeft sx={{fontSize: 20}}/>
                        </Button>

                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "40px",
                                maxWidth: "40px",
                            }}
                            onClick={() => {
                                setInitialExpand(null)
                                setPage(page + 1);
                            }}
                            disabled={page === Math.floor((grabCount ?? 10) / 10)}
                        >
                            <ChevronRight sx={{fontSize: 20}}/>
                        </Button>

                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "40px",
                                maxWidth: "40px",
                            }}
                            onClick={() => {
                                setInitialExpand(null)
                                setPage(Math.floor((grabCount ?? 10) / 10));
                            }}
                            disabled={page === Math.floor((grabCount ?? 10) / 10)}
                        >
                            <KeyboardDoubleArrowRight sx={{fontSize: 20}}/>
                        </Button>

                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "250px",
                                maxWidth: "250px",
                            }}
                        >
                            <b style={{fontSize: 18}}>
                                {`Page ${page}${grabCount ? (` of ${Math.floor((grabCount < 10 ? 10 : grabCount) / 10)}`) : ''}`}
                            </b>
                        </Button>
                    </Grid2>
                </Grid2>
                <Grid2 xs={12} sx={{paddingBottom: 2}}>
                    <hr style={{height: 1, width: "100%"}}/>
                </Grid2>

                {data.map((sheet: DriverSheet, index: number) => <DailySheet key={'sheet-' + index} sheet={sheet}
                                                                             week={sheet.Week} forceExpand={forceExpand}
                                                                             initialExpand={initialExpand == sheet.DriverID}/>)}

            </Paper>}
        </Box>
    );
}
