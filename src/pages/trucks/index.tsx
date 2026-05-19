import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Truck from "../../components/objects/Truck";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { TrucksModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type TrucksType = z.infer<typeof TrucksModel>;

const columns: TableColumnsType = [
  { name: "Name" },
  { name: "VIN" },
  { name: "Notes" },
  { name: "ID", as: "", navigateTo: "/trucks/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const Trucks = ({ trucks, count }: { trucks: TrucksType[]; count: number }) => {
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
            label={"Trucks"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="trucks.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={trucks}
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
        <Truck />
      </Grid2>
    </Grid2>
  );
};

export default Trucks;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.trucks.count();
  const trucks = await prisma.trucks.findMany({ take: 10, orderBy: { ID: "desc" } });

  return {
    props: {
      trucks,
      count,
    },
  };
};
