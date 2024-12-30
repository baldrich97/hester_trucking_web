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
import {useRouter} from "next/router"

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
    const [loading, setLoading] = React.useState<boolean>(false);
    const [shouldRefresh, setShouldRefresh] = React.useState<boolean>(false);
    const [data, setData] = React.useState<any>([]);
    const [initialExpand, setInitialExpand] = React.useState<any>(null);

    React.useEffect(() => {
        setData([])
        setLoading(true);
        setShouldRefresh(true);
    }, [week]);

    React.useEffect(() => {
        setLoading(true);
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        setWeek(router.query?.defaultWeek ?? defaultWeek)
        setInitialExpand(router.query?.forceExpand ?? null)
        setforceExpand(false)
        setData([]);
        setShouldRefresh(true);
    }, [router.query]);

    trpc.useQuery(["dailies.getByWeek", {week: week}], {
        enabled: shouldRefresh,
        onSuccess(data) {
            setData(data ? data.filter((sheet) => sheet.Jobs.filter((job) => job.Loads.length !== 0).length > 0).sort((a, b) => a.Drivers.FirstName.localeCompare(b.Drivers.FirstName)) : []);
            setLoading(false);
            setShouldRefresh(false);
        },
    });



    const [forceExpand, setforceExpand] = React.useState(true);
    return (
        <Box sx={{width: "100%"}}>
            <LoadingModal isOpen={loading}/>
            <Paper sx={{width: "100%", mb: 2}}>
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
                            variant="outlined"
                            type={"button"}
                            size="small"
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "50px",
                                maxWidth: "50px",
                            }}
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
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "40px",
                                maxWidth: "40px",
                            }}
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
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "40px",
                                maxWidth: "40px",
                            }}
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
                            style={{
                                minHeight: "30px",
                                maxHeight: "30px",
                                minWidth: "250px",
                                maxWidth: "250px",
                            }}
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

                {data.map((sheet: DriverSheet, index: number) => <DailySheet key={'sheet-' + index} sheet={sheet} week={week} forceExpand={forceExpand} initialExpand={initialExpand == sheet.DriverID}/>)}
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
