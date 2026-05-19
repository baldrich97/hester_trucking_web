import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Driver from "../../components/objects/Driver";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { DriversModel, StatesModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type StatesType = z.infer<typeof StatesModel>;
type DriversType = z.infer<typeof DriversModel>;

const columns: TableColumnsType = [
  { name: "FirstName", as: "First Name" },
  { name: "LastName", as: "Last Name" },
  { name: "Street" },
  { name: "City" },
  { name: "States.Abbreviation", as: "State" },
  { name: "ZIP" },
  { name: "Phone" },
  { name: "Notes" },
  { name: "ID", as: "", navigateTo: "/drivers/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const Drivers = ({
  states,
  drivers,
  count,
}: {
  states: StatesType[];
  drivers: DriversType[];
  count: number;
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
            label={"Drivers"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="drivers.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={drivers}
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
        <Driver states={states} />
      </Grid2>
    </Grid2>
  );
};

export default Drivers;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.drivers.count();
  const states = await prisma.states.findMany({});
  const drivers = await prisma.drivers.findMany({
    include: {
      States: { select: { Abbreviation: true } },
    },
    take: 10,
    orderBy: { ID: "desc" },
  });

  return {
    props: {
      states,
      drivers: JSON.parse(JSON.stringify(drivers)),
      count,
    },
  };
};
