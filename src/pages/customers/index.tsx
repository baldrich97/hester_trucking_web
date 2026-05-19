import React, { useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Customer from "../../components/objects/Customer";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { CustomersModel, StatesModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type StatesType = z.infer<typeof StatesModel>;
type CustomersType = z.infer<typeof CustomersModel>;

const columns: TableColumnsType = [
  { name: "Name" },
  { name: "Street" },
  { name: "City" },
  { name: "States.Abbreviation", as: "State" },
  { name: "ZIP" },
  { name: "Phone" },
  { name: "Notes" },
  { name: "ID", as: "", navigateTo: "/customers/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const Customers = ({
  states,
  customers,
  count,
}: {
  states: StatesType[];
  customers: CustomersType[];
  count: number;
}) => {
  const [search, setSearch] = useState("");

  return (
    <Grid2 container wrap={"nowrap"}>
      <Grid2 xs={8} sx={{ paddingRight: 2.5 }}>
        <Grid2 xs={4}>
          <SearchBar
            setSearchQuery={setSearch}
            setShouldSearch={() => undefined}
            query={search}
            label={"Customers"}
          />
        </Grid2>
        <GenericTable
          trpcQuery="customers.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={customers}
          initialCount={count}
          defaultOrderBy="Name"
          defaultOrder="asc"
          remoteActive={search.length > 0}
          columns={columns}
          overrides={overrides}
        />
      </Grid2>
      <Divider flexItem orientation={"vertical"} sx={{ mr: "-1px" }} variant={"fullWidth"} />
      <Grid2 xs={4}>
        <Customer states={states} />
      </Grid2>
    </Grid2>
  );
};

export default Customers;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.customers.count();
  const states = await prisma.states.findMany({});
  const customers = await prisma.customers.findMany({
    include: {
      States: { select: { Abbreviation: true } },
    },
    orderBy: {
      Name: "asc",
    },
    take: 10,
  });

  return {
    props: {
      states,
      customers,
      count,
    },
  };
};
