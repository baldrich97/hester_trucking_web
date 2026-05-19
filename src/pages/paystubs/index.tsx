import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import PayStub from "../../components/objects/PayStub";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { PayStubsModel, JobsModel, DriversModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type DriversType = z.infer<typeof DriversModel>;
type PayStubsType = z.infer<typeof PayStubsModel>;
type JobsType = z.infer<typeof JobsModel>;
interface PayStubData extends PayStubsType {
  Drivers: DriversType;
  Jobs: JobsType[];
}

const columns: TableColumnsType = [
  { name: "Created" },
  { name: "DepositDate", as: "Deposit Date" },
  { name: "Drivers.FirstName+Drivers.LastName", as: "Driver", column: "DriverID" },
  { name: "Gross", as: "Gross Pay" },
  { name: "NetTotal", as: "Net Pay" },
  { name: "TakeHome", as: "Take Home Pay" },
  { name: "CheckNumber", as: "Check #" },
  { name: "ID", as: "", navigateTo: "/paystubs/" },
];

const overrides: TableColumnOverridesType = [
  { name: "Created", type: "date" },
  { name: "DepositDate", type: "date" },
  { name: "ID", type: "button" },
];

const PayStubs = ({
  count,
  payStubs,
  drivers,
}: {
  count: number;
  payStubs: PayStubData[];
  drivers: DriversType[];
}) => {
  const [search, setSearch] = useState("");
  const tableRef = useRef<GenericTableHandle>(null);

  return (
    <Grid2 container wrap={"nowrap"}>
      <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
        <Grid2 xs={4}>
          <SearchBar
            setSearchQuery={setSearch}
            setShouldSearch={() => undefined}
            query={search}
            label={"Pay Stubs"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="paystubs.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={payStubs}
          initialCount={count}
          defaultOrderBy="ID"
          defaultOrder="desc"
          remoteActive={search.length > 0}
          columns={columns}
          overrides={overrides}
        />
      </Grid2>
      <Divider flexItem orientation={"vertical"} sx={{ mr: "-1px" }} variant={"fullWidth"} />
      <Grid2 xs={4}>
        <PayStub drivers={drivers} />
      </Grid2>
    </Grid2>
  );
};

export default PayStubs;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.payStubs.count();

  const payStubs = await prisma.payStubs.findMany({
    take: 10,
    orderBy: {
      ID: "desc",
    },
    include: {
      Drivers: true,
      Jobs: true,
    },
  });

  const drivers = await prisma.drivers.findMany({
    where: {
      OR: [{ Deleted: false }, { Deleted: null }],
    },
    orderBy: [{ LastName: "asc" }, { FirstName: "asc" }],
  });

  return {
    props: {
      payStubs: JSON.parse(JSON.stringify(payStubs)),
      count,
      drivers: JSON.parse(JSON.stringify(drivers)),
    },
  };
};
