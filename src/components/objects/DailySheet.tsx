import { ChevronRight, ExpandMore } from "@mui/icons-material";
import { Button } from "@mui/material";
import Grid2 from "@mui/material/Unstable_Grid2";
import moment from "moment";
import React from "react";

const DailySheet: React.FC<any> = ({ props }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div style={{ padding: 5 }}>
      <Grid2 container columnSpacing={2}>
        <Grid2 xs={"auto"}>
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
              setIsOpen(!isOpen);
            }}
          >
            {isOpen ? (
              <ChevronRight sx={{ fontSize: 30 }} />
            ) : (
              <ExpandMore sx={{ fontSize: 30 }} />
            )}
          </Button>
        </Grid2>
        <Grid2 xs={"auto"} sx={{ display: "flex" }}>
          <b style={{ fontSize: 18, marginLeft: 3 }}>
            {props.FirstName} {props.LastName}
          </b>
        </Grid2>
        <Grid2 xs={true}></Grid2>
        <Grid2 xs={"auto"} sx={{ paddingRight: 2 }}>
          <Button
            variant="contained"
            color={"primary"}
            style={{ backgroundColor: "#ffa726" }}
          >
            Print Week
          </Button>
        </Grid2>
      </Grid2>
      <div
        style={{
          overflow: "hidden",
          height: isOpen ? 0 : "auto",
          paddingBottom: 10,
        }}
      >
        <Grid2
          container
          rowSpacing={2}
          sx={{ border: "1px solid black", marginTop: 2 }}
        >
          <b style={{ marginLeft: 5, paddingRight: 5, width: 45 }}>Date</b>
          <Grid2
            sx={{
              textAlign: "center",
              borderRight: "2px solid black",
              borderLeft: "2px solid black",
            }}
            xs={2}
          >
            <b>Material Received</b>
          </Grid2>
          <Grid2
            sx={{ textAlign: "center", borderRight: "2px solid black" }}
            xs={2}
          >
            <b>Receiver</b>
          </Grid2>
          <Grid2
            sx={{ textAlign: "center", borderRight: "2px solid black" }}
            xs={2}
          >
            <b>Destination</b>
          </Grid2>
          <Grid2
            sx={{ textAlign: "center", borderRight: "2px solid black" }}
            xs={1}
          >
            <b>Ticket#</b>
          </Grid2>
          <Grid2
            sx={{ textAlign: "center", borderRight: "2px solid black" }}
            xs={1}
          >
            <b>Company Rate</b>
          </Grid2>
          <Grid2
            sx={{ textAlign: "center", borderRight: "2px solid black" }}
            xs={1}
          >
            <b>Trucking Rate</b>
          </Grid2>
          <Grid2
            sx={{ textAlign: "center", borderRight: "2px solid black" }}
            xs={1}
          >
            <b>Weight</b>
          </Grid2>
          <Grid2 sx={{ textAlign: "center" }} xs={true} container>
            <Grid2 xs={12} sx={{ padding: 0 }}>
              <b style={{ fontSize: 17 }}>Total Revenue</b>
            </Grid2>
            <Grid2
              sx={{
                textAlign: "center",
                borderRight: "2px solid black",
                borderTop: "2px solid black",
                padding: 0,
              }}
              xs={6}
            >
              <b style={{ fontSize: 12 }}>Company Rate</b>
            </Grid2>
            <Grid2
              sx={{
                textAlign: "center",
                borderTop: "2px solid black",
                padding: 0,
              }}
              xs={6}
            >
              <b style={{ fontSize: 12 }}>Trucking Rate</b>
            </Grid2>
          </Grid2>
        </Grid2>

        {props.Jobs?.map(
          (job: {
            Loads: any[];
            LoadTypes: { Description: any };
            Customers: { Name: any };
            DeliveryLocations: { Description: any };
            CompanyRevenue: any;
            TruckingRevenue:
              | string
              | number
              | boolean
              | React.ReactElement<
                  any,
                  string | React.JSXElementConstructor<any>
                >
              | React.ReactFragment
              | null
              | undefined;
          }) => {
            let weightSum = 0;
            return (
              <>
                {job.Loads.map((load, index) => {
                  weightSum += load.Weight ?? load.Hours ?? 0;
                  return (
                    <>
                      <Grid2
                        container
                        rowSpacing={2}
                        sx={{ border: "1px solid black", marginTop: 1 }}
                        key={Math.random()}
                      >
                        <b
                          style={{ marginLeft: 5, paddingRight: 5, width: 45 }}
                        >
                          {moment(load.StartDate).format("M/D")}
                        </b>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                            borderLeft: "2px solid black",
                          }}
                          xs={2}
                        >
                          {index === 0
                            ? job.LoadTypes?.Description ?? "N/A"
                            : ""}
                        </Grid2>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                          }}
                          xs={2}
                        >
                          {index === 0 ? job.Customers?.Name ?? "N/A" : ""}
                        </Grid2>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                          }}
                          xs={2}
                        >
                          {index === 0
                            ? job.DeliveryLocations?.Description ?? "N/A"
                            : ""}
                        </Grid2>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                          }}
                          xs={1}
                        >
                          {load.TicketNumber ?? "N/A"}
                        </Grid2>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                          }}
                          xs={1}
                        >
                          {index === 0 ? load.TruckRate ?? "N/A" : ""}
                        </Grid2>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                          }}
                          xs={1}
                        >
                          {index === 0 ? load.MaterialRate ?? "N/A" : ""}
                        </Grid2>
                        <Grid2
                          sx={{
                            textAlign: "center",
                            borderRight: "2px solid black",
                          }}
                          xs={1}
                        >
                          {load.Weight
                            ? load.Weight
                            : load.Hours
                            ? load.Hours
                            : "N/A"}
                        </Grid2>
                        <Grid2 sx={{ textAlign: "center" }} xs={true} container>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={6}
                          ></Grid2>
                          <Grid2 sx={{ textAlign: "center" }} xs={6}></Grid2>
                        </Grid2>
                      </Grid2>

                      {index === job.Loads.length - 1 && (
                        <Grid2
                          container
                          rowSpacing={2}
                          sx={{
                            border: "1px solid black",
                            marginTop: 1,
                            backgroundColor: "#bababa",
                          }}
                          key={Math.random()}
                        >
                          <b
                            style={{
                              marginLeft: 5,
                              paddingRight: 5,
                              width: 45,
                            }}
                          ></b>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                              borderLeft: "2px solid black",
                            }}
                            xs={2}
                          >
                            {index === 0 && job.Loads.length > 1
                              ? job.LoadTypes?.Description ?? "N/A"
                              : ""}
                          </Grid2>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={2}
                          >
                            {index === 0 && job.Loads.length > 1
                              ? job.Customers?.Name ?? "N/A"
                              : ""}
                          </Grid2>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={2}
                          >
                            {index === 0 && job.Loads.length > 1
                              ? job.DeliveryLocations?.Description ?? "N/A"
                              : ""}
                          </Grid2>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={1}
                          ></Grid2>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={1}
                          >
                            {index === 0 && job.Loads.length > 1
                              ? load.TruckRate ?? "N/A"
                              : ""}
                          </Grid2>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={1}
                          >
                            {index === 0 && job.Loads.length > 1
                              ? load.MaterialRate ?? "N/A"
                              : ""}
                          </Grid2>
                          <Grid2
                            sx={{
                              textAlign: "center",
                              borderRight: "2px solid black",
                            }}
                            xs={1}
                          >
                            {weightSum}
                          </Grid2>
                          <Grid2
                            sx={{ textAlign: "center" }}
                            xs={true}
                            container
                          >
                            <Grid2
                              sx={{
                                textAlign: "center",
                                borderRight: "2px solid black",
                              }}
                              xs={6}
                            >
                              {index === job.Loads.length - 1
                                ? job.CompanyRevenue
                                  ? job.TruckingRevenue
                                  : "Calculate..."
                                : ""}
                            </Grid2>
                            <Grid2 sx={{ textAlign: "center" }} xs={6}>
                              {index === job.Loads.length - 1
                                ? job.TruckingRevenue
                                  ? job.TruckingRevenue
                                  : "Calculate..."
                                : ""}
                            </Grid2>
                          </Grid2>
                        </Grid2>
                      )}
                    </>
                  );
                })}
                {/* <div style={{ width: "100%", height: 50 }}></div> */}
              </>
            );
          }
        )}
      </div>
    </div>
  );
};

export default DailySheet;
