import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Carrier from "../../components/objects/Carrier";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { CarriersModel, StatesModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type StatesType = z.infer<typeof StatesModel>;
type CarrierRowType = z.infer<typeof CarriersModel> & {
  States: { Abbreviation: string } | null;
};

const columns: TableColumnsType = [
  { name: "Name" },
  { name: "ContactName", as: "Contact" },
  { name: "Phone" },
  { name: "Street" },
  { name: "City" },
  { name: "States.Abbreviation", as: "State" },
  { name: "ZIP" },
  { name: "ID", as: "", navigateTo: "/carriers/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const CarriersIndex = ({
  states,
  carriers,
  count,
}: {
  states: StatesType[];
  carriers: CarrierRowType[];
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
            label={"Carriers"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="carriers.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={carriers}
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
        <Carrier states={states} />
      </Grid2>
    </Grid2>
  );
};

export default CarriersIndex;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.carriers.count();
  const states = await prisma.states.findMany({});
  const carriers = await prisma.carriers.findMany({
    take: 10,
    orderBy: { ID: "desc" },
    include: { States: { select: { Abbreviation: true } } },
  });

  return {
    props: {
      states,
      carriers,
      count,
    },
  };
};
