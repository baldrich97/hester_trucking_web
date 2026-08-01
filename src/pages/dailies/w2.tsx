import ChevronRight from "@mui/icons-material/ChevronRight";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Paper from "@mui/material/Paper";
import Grid2 from "@mui/material/Unstable_Grid2";
import Tooltip from "@mui/material/Tooltip";
import React from "react";
import LoadingModal from "elements/LoadingModal";
import {trpc} from "utils/trpc";
import DailySheet from "components/objects/DailySheet";
import {z} from "zod";
import {CompleteJobs, DailiesModel, DriversModel, LoadsModel} from "../../../prisma/zod";
import {useRouter} from "next/router";
import {toast} from "react-toastify";
import PaginatedSheetNav from "../../components/PaginatedSheetNav";
import {calendarNavButtonSx} from "../../theme/muiShared";
import {parseGrabCount} from "../../utils/paginatedSheet";

type Loads = z.infer<typeof LoadsModel>;
type Driver = z.infer<typeof DriversModel>;
type Daily = z.infer<typeof DailiesModel>;

interface DriverSheet extends Daily {
    Drivers: Driver;
    Jobs: CompleteJobs[];
}

export default function DailiesW2() {
    const router = useRouter();

    const [page, setPage] = React.useState<number>(1);
    const [initialExpand, setInitialExpand] = React.useState<any>(null);
    const [forceExpand, setforceExpand] = React.useState(true);

    React.useEffect(() => {
        if (!router.isReady) {
            return;
        }
        setPage(1);
        setInitialExpand(router.query?.forceExpand ?? null);
        setforceExpand(false);
    }, [router.isReady, router.query.forceExpand]);

    const {data: result, isLoading, isFetching} = trpc.useQuery(
        ["dailies.getByWeekW2", {page}],
        {
            staleTime: 0,
            onError(err) {
                console.warn(err);
                toast(err.message ?? "Failed to load dailies", {type: "error", autoClose: 8000});
            },
        },
    );

    const grabCount = parseGrabCount(result?.warnings);
    const visuallyLoading = isLoading || isFetching;
    const data = React.useMemo(
        () =>
            visuallyLoading
                ? []
                : (result?.data ?? [])
                      .filter((sheet) => sheet.Jobs.filter((job) => job.Loads.length !== 0).length > 0)
                      .sort((a, b) => a.Drivers.FirstName.localeCompare(b.Drivers.FirstName)),
        [result?.data, visuallyLoading],
    );

    const handlePageChange = (nextPage: number) => {
        setInitialExpand(null);
        setPage(nextPage);
    };

    return (
        <Box sx={{width: "100%"}}>
            <h1
                style={{
                    textAlign: "left",
                    paddingBottom: "10px",
                    margin: 0,
                    fontSize: "1.5rem",
                    fontWeight: "bold",
                }}
            >
                {data.length > 0 ? "W2 Employees Missing Pay" : "There are no W2 employees missing pay."}
            </h1>
            <LoadingModal isOpen={visuallyLoading} />
            {data.length > 0 && (
                <Paper sx={{width: "100%", mb: 2}}>
                    <Grid2 container columnSpacing={1} rowSpacing={1} flexDirection={"row"} sx={{height: 50}}>
                        <Grid2 xs={"auto"}>
                            <Tooltip title={forceExpand ? "Close all sheets." : "Expand all sheets."}>
                                <Button
                                    variant="text"
                                    type="button"
                                    size="small"
                                    sx={calendarNavButtonSx}
                                    color="inherit"
                                    onClick={() => {
                                        setInitialExpand(null);
                                        setforceExpand(!forceExpand);
                                    }}
                                >
                                    {forceExpand ? (
                                        <ExpandMore sx={{fontSize: 40}} />
                                    ) : (
                                        <ChevronRight sx={{fontSize: 40}} />
                                    )}
                                </Button>
                            </Tooltip>
                        </Grid2>
                        <PaginatedSheetNav page={page} grabCount={grabCount} onPageChange={handlePageChange} />
                    </Grid2>
                    <Grid2 xs={12} sx={{paddingBottom: 2}}>
                        <hr style={{height: 1, width: "100%"}} />
                    </Grid2>

                    {data.map((sheet: DriverSheet, index: number) => (
                        <DailySheet
                            key={`sheet-${sheet.ID}-${index}`}
                            sheet={sheet}
                            week={sheet.Week}
                            forceExpand={forceExpand}
                            initialExpand={initialExpand == sheet.DriverID}
                            toInvoiceButton={true}
                        />
                    ))}
                </Paper>
            )}
        </Box>
    );
}
