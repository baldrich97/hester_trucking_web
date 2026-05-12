import ChevronLeft from "@mui/icons-material/ChevronLeft";
import ChevronRight from "@mui/icons-material/ChevronRight";
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
import {formatDateToWeek} from "../../utils/UtilityFunctions";
import {useRouter} from "next/router";
import {toast} from "react-toastify";
import {
    calendarChevronNavSx,
    calendarNavButtonSx,
    calendarTodayButtonSx,
    calendarWeekLabelSx,
} from "../../theme/muiShared";

type Loads = z.infer<typeof LoadsModel>;

type Driver = z.infer<typeof DriversModel>;

type Daily = z.infer<typeof DailiesModel>;

interface DriverSheet extends Daily {
    Drivers: Driver,
    Jobs: CompleteJobs[]
}

type YearWeekFormat = `${number}-W${number}`;

export default function Dailies() {
    const router= useRouter();

    const date = new Date();
    const defaultWeek = formatDateToWeek(date);
    const [week, setWeek] = React.useState<YearWeekFormat>(defaultWeek);
    const [initialExpand, setInitialExpand] = React.useState<any>(null);

    React.useEffect(() => {
        if (!router.isReady) {
            return;
        }
        const dw = router.query.defaultWeek;
        const weekParam = Array.isArray(dw) ? dw[0] : dw;
        if (typeof weekParam === "string" && weekParam.length > 0) {
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            setWeek(weekParam as YearWeekFormat);
        }
        const fe = router.query.forceExpand;
        if (fe !== undefined && fe !== null) {
            setInitialExpand(fe);
        }
        setforceExpand(false);
    }, [router.isReady, router.query.defaultWeek, router.query.forceExpand]);

    const {data: rawDailies, isLoading} = trpc.useQuery(["dailies.getByWeek", {week}], {
        // Override app-wide staleTime so each week navigation refetches (users edit these sheets often).
        staleTime: 0,
        onError(err) {
            console.warn(err);
            toast(err.message ?? "Failed to load dailies", {type: "error", autoClose: 8000});
        },
    });

    const data = React.useMemo(
        () =>
            rawDailies
                ? rawDailies
                      .filter((sheet) => sheet.Jobs.filter((job) => job.Loads.length !== 0).length > 0)
                      .sort((a, b) => a.Drivers.FirstName.localeCompare(b.Drivers.FirstName))
                : [],
        [rawDailies],
    );



    const [forceExpand, setforceExpand] = React.useState(true);
    return (
        <Box sx={{width: "100%"}}>
            <LoadingModal isOpen={isLoading}/>
            <Paper sx={{width: "100%", mb: 2}}>
                <Grid2 container columnSpacing={1} rowSpacing={1} flexDirection={'row'} sx={{height: 50}}>
                    <Grid2 xs={"auto"}>
                        <Tooltip title={forceExpand ? 'Close all sheets.' : 'Expand all sheets.'}>
                            <Button
                                variant="text"
                                type={"button"}
                                size="small"
                                sx={calendarNavButtonSx}
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
                            variant="outlined"
                            type={"button"}
                            size="small"
                            sx={calendarTodayButtonSx}
                            onClick={() => {
                                setInitialExpand(null)
                                setWeek(defaultWeek);
                            }}
                        >
                            Today
                        </Button>

                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            sx={calendarChevronNavSx}
                            onClick={() => {
                                let [curyear, curweek] = week.split("-W").map(Number);
                                if (!curyear || !curweek) {
                                    return;
                                }
                                if (curweek === 1) {
                                    curweek = 52;
                                    curyear = curyear - 1;
                                } else {
                                    curweek--;
                                }
                                let returnable = `${curyear}-W`;
                                if (curweek < 10) {
                                    returnable += `0${curweek}`;
                                } else {
                                    returnable += curweek;
                                }
                                setInitialExpand(null)
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                setWeek(returnable);
                            }}
                        >
                            <ChevronLeft sx={{fontSize: 20}}/>
                        </Button>

                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            sx={calendarChevronNavSx}
                            onClick={() => {
                                let [curyear, curweek] = week.split("-W").map(Number);
                                if (!curyear || !curweek) {
                                    return;
                                }
                                if (curweek === 52) {
                                    curweek = 1;
                                    curyear = curyear + 1;
                                } else {
                                    curweek++;
                                }
                                let returnable = `${curyear}-W`;
                                if (curweek < 10) {
                                    returnable += `0${curweek}`;
                                } else {
                                    returnable += curweek;
                                }
                                setInitialExpand(null)
                                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                // @ts-ignore
                                setWeek(returnable);
                            }}
                        >
                            <ChevronRight sx={{fontSize: 20}}/>
                        </Button>

                        <Button
                            variant="text"
                            type={"button"}
                            size="small"
                            sx={calendarWeekLabelSx}
                        >
                            <b style={{fontSize: 18}}>
                                {moment(week).format("l")} -{" "}
                                {moment(week).add(6, "days").format("l")}
                            </b>
                        </Button>
                    </Grid2>
                </Grid2>
                <Grid2 xs={12} sx={{paddingBottom: 2}}>
                    <hr style={{height: 1, width: "100%"}}/>
                </Grid2>

                {data.map((sheet, index) => (
                    <DailySheet
                        key={'sheet-' + index}
                        sheet={sheet as DriverSheet}
                        week={week}
                        forceExpand={forceExpand}
                        initialExpand={initialExpand == sheet.DriverID}
                    />
                ))}
                {/* <EnhancedTableToolbar
            numSelected={selected.length}
            readOnly={readOnly}
          />
          <TableContainer>
            <Table
              aria-labelledby="tableTitle"
              size={"small"}
              //sx={{minWidth: 750}}
            >
              <EnhancedTableHead
                numSelected={selected.length}
                order={order}
                orderBy={orderBy}
                onSelectAllClick={handleSelectAllClick}
                onRequestSort={handleRequestSort}
                rowCount={rows.length}
                readOnly={readOnly}
              />
              <TableBody>
                {rows.sort(getComparator(order, orderBy)).map((row, index) => {
                  const isItemSelected = isSelected(row.ID.toString());
                  const labelId = `enhanced-table-checkbox-${index}`;

                  return (
                    <Row
                      key={row.ID.toString()}
                      readOnly={readOnly}
                      row={row}
                      isItemSelected={isItemSelected}
                      labelId={labelId}
                      handleClick={handleClick}
                    />
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer> */}
            </Paper>
        </Box>
    );
}
