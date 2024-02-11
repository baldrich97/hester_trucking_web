/* eslint-disable react-hooks/rules-of-hooks */
import React, { useState } from "react";
import CustomerObject from "../components/objects/Customer";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import {
  CustomersModel,
  DeliveryLocationsModel,
  DriversModel,
  LoadTypesModel,
  TrucksModel,
} from "../../prisma/zod";
import { z } from "zod";
import Grid2 from "@mui/material/Unstable_Grid2";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import { Button, Divider, Modal, Typography } from "@mui/material";
import Load from "components/objects/Load";
import Invoice from "components/objects/Invoice";

type CustomersType = z.infer<typeof CustomersModel>;
type LoadTypesType = z.infer<typeof LoadTypesModel>;
type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;
type TrucksType = z.infer<typeof TrucksModel>;
type DriversType = z.infer<typeof DriversModel>;

const Home = ({
  customers,
  lastInvoice,
  loadTypes,
  deliveryLocations,
  trucks,
  drivers,
}: {
  customers: CustomersType[];
  lastInvoice: number;
  loadTypes: LoadTypesType[];
  deliveryLocations: DeliveryLocationsType[];
  trucks: TrucksType[];
  drivers: DriversType[];
}) => {
  const [tabValue, setTabValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  console.log(lastInvoice);

  return (
    <Grid2 container>
      <Grid2 xs={12} sx={{ paddingRight: 2.5 }}>
        <Box sx={{ borderBottom: 1, borderColor: "divider", marginBottom: 2 }}>
          <Tabs value={tabValue} onChange={handleChange}>
            <Tab label="Data Input" />
            {/* <Tab label="Graphs" /> */}
          </Tabs>
        </Box>
        {tabValue === 0 && (
          <Grid2 container>
            <Grid2 xs={6}>
              <Load
                customers={customers}
                loadTypes={loadTypes}
                deliveryLocations={deliveryLocations}
                trucks={trucks}
                drivers={drivers}
                resetButton={true}
              />
            </Grid2>
            <Divider
              flexItem={true}
              orientation={"vertical"}
              sx={{ paddingLeft: "1.5rem" }}
              variant={"fullWidth"}
            />
            <Grid2 xs={5}>
              <Invoice customers={customers} lastInvoice={lastInvoice} />
            </Grid2>
          </Grid2>
        )}
        {tabValue === 1 && null}
      </Grid2>
    </Grid2>
  );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async (context) => {
  const customers = await prisma.customers.findMany({ take: 10 });

  const loadTypes = await prisma.loadTypes.findMany({
    orderBy: {
      Description: "asc",
    },
    take: 10,
  });

  const trucks = await prisma.trucks.findMany({
    orderBy: {
      Name: "asc",
    },
    take: 10,
  });

  const drivers = await prisma.drivers.findMany({
    orderBy: {
      LastName: "asc",
    },
    take: 10,
  });

  const deliveryLocations = await prisma.deliveryLocations.findMany({
    orderBy: {
      Description: "asc",
    },
    take: 10,
  });

  const lastInvoice = await prisma.invoices.aggregate({
    _max: {
      Number: true,
    },
  });

  return {
    props: {
      customers,
      trucks,
      drivers: JSON.parse(JSON.stringify(drivers)),
      deliveryLocations,
      loadTypes,
      lastInvoice: (lastInvoice?._max.Number ?? 0) + 1,
    },
  };
};
