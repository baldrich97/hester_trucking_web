import { ChevronLeft, ChevronRight } from "@mui/icons-material";
import { Box, Button, Paper } from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import React from "react";
import LoadingModal from "elements/LoadingModal";
import moment from "moment";
import { trpc } from "utils/trpc";
import DailySheet from "components/objects/DailySheet";

type YearWeekFormat = `${number}-W${number}`;

export default function Dailies({
  readOnly,
  rows,
  updateTotal,
  updateSelected,
}: {
  readOnly: boolean;
  rows: any[];
  updateTotal: any;
  updateSelected: any;
}) {
  // const [order, setOrder] = React.useState<Order>("asc");
  // const [orderBy, setOrderBy] = React.useState<keyof Data>("TicketNumber");
  // const [selected, setSelected] = React.useState<readonly string[]>([]);
  // const [total, setTotal] = React.useState<number>(0);

  // React.useEffect(() => {
  //   setSelected([]);
  //   setTotal(0);
  // }, [rows]);

  // const handleRequestSort = (
  //   event: React.MouseEvent<unknown>,
  //   property: keyof Data
  // ) => {
  //   const isAsc = orderBy === property && order === "asc";
  //   setOrder(isAsc ? "desc" : "asc");
  //   setOrderBy(property);
  // };

  // const handleSelectAllClick = (event: React.ChangeEvent<HTMLInputElement>) => {
  //   if (event.target.checked) {
  //     let newTotal = 0;
  //     const newSelected = rows.map((n) => {
  //       newTotal += n.TotalAmount;
  //       return n.ID.toString();
  //     });
  //     setSelected(newSelected);
  //     setTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
  //     updateTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
  //     updateSelected(newSelected);
  //     return;
  //   }
  //   setSelected([]);
  //   setTotal(0);
  //   updateTotal(0);
  //   updateSelected([]);
  // };

  // const handleClick = (
  //   event: React.MouseEvent<unknown>,
  //   ID: string,
  //   TotalAmount: number
  // ) => {
  //   const selectedIndex = selected.indexOf(ID);
  //   let newSelected: readonly string[] = [];
  //   let newTotal = 0;

  //   if (selectedIndex === -1) {
  //     newSelected = newSelected.concat(selected, ID);
  //     newTotal = total + TotalAmount;
  //   } else if (selectedIndex === 0) {
  //     newSelected = newSelected.concat(selected.slice(1));
  //     newTotal = total - TotalAmount;
  //   } else if (selectedIndex === selected.length - 1) {
  //     newSelected = newSelected.concat(selected.slice(0, -1));
  //     newTotal = total - TotalAmount;
  //   } else if (selectedIndex > 0) {
  //     newSelected = newSelected.concat(
  //       selected.slice(0, selectedIndex),
  //       selected.slice(selectedIndex + 1)
  //     );
  //     newTotal = total - TotalAmount;
  //   }
  //   setTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
  //   setSelected(newSelected);
  //   updateTotal(Math.round((newTotal + Number.EPSILON) * 100) / 100);
  //   updateSelected(newSelected);
  // };

  // const isSelected = (ID: string) => selected.indexOf(ID) !== -1;

  const date = new Date();
  const defaultWeek = formatDateToWeek(date);
  const [week, setWeek] = React.useState<YearWeekFormat>(defaultWeek);
  const [loading, setLoading] = React.useState<boolean>(false);
  const [shouldRefresh, setShouldRefresh] = React.useState<boolean>(false);
  const [data, setData] = React.useState<any>([]);

  React.useEffect(() => {
    setLoading(true);
    setShouldRefresh(true);
  }, [week]);

  trpc.useQuery(["jobs.getByWeek", { week: week }], {
    enabled: shouldRefresh,
    onSuccess(data) {
      setData(data ?? []);
      console.log(data);
      setLoading(false);
      setShouldRefresh(false);
    },
  });

  function formatDateToWeek(date: Date): YearWeekFormat {
    const year = date.getFullYear();
    const weekNumber = getWeekNumber(date);
    let returnable = `${year}-W`;
    if (weekNumber < 10) {
      returnable += `0${weekNumber}`;
    } else {
      returnable += weekNumber;
    }
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    return returnable;
  }

  function getWeekNumber(date: Date): number {
    const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
    const millisecondsInDay = 86400000;
    const currentDayOfYear = Math.ceil(
      (date.getTime() - firstDayOfYear.getTime()) / millisecondsInDay
    );
    return Math.ceil(currentDayOfYear / 7);
  }

  return (
    <Box sx={{ width: "100%" }}>
      <LoadingModal isOpen={loading} />
      <Paper sx={{ width: "100%", mb: 2 }}>
        <Grid2 container columnSpacing={1} rowSpacing={1}>
          <Grid2 xs={12}>
            <Grid2
              xs={2}
              sx={{ display: "flex", justifyContent: "space-between" }}
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
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  setWeek(returnable);
                }}
              >
                <ChevronLeft sx={{ fontSize: 20 }} />
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
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  // @ts-ignore
                  setWeek(returnable);
                }}
              >
                <ChevronRight sx={{ fontSize: 20 }} />
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
                <b style={{ fontSize: 18 }}>
                  {moment(week).format("l")} -{" "}
                  {moment(week).add(6, "days").format("l")}
                </b>
              </Button>
            </Grid2>
          </Grid2>
          <Grid2 xs={12} sx={{ paddingBottom: 2 }}>
            <hr style={{ height: 1, width: "100%" }} />
          </Grid2>
        </Grid2>

        {data.map((sheet: any) => (
          <DailySheet key={Math.random()} props={sheet} />
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
