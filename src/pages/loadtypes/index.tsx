import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import LoadType from "../../components/objects/LoadType";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { LoadTypesModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type LoadTypesType = z.infer<typeof LoadTypesModel>;

const columns: TableColumnsType = [
  { name: "Description" },
  { name: "Notes" },
  { name: "ID", as: "", navigateTo: "/loadtypes/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const LoadTypesIndex = ({
  loadtypes,
  count,
}: {
  loadtypes: LoadTypesType[];
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
            label={"Load Types"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="loadtypes.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={loadtypes}
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
        <LoadType
          onCreated={() => {
            tableRef.current?.refresh();
          }}
        />
      </Grid2>
    </Grid2>
  );
};

export default LoadTypesIndex;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.loadTypes.count({
    where: {
      OR: [{ Deleted: false }, { Deleted: null }],
    },
  });

  const loadtypes = await prisma.loadTypes.findMany({
    where: {
      OR: [{ Deleted: false }, { Deleted: null }],
    },
    take: 10,
    orderBy: {
      ID: "desc",
    },
  });

  return {
    props: {
      loadtypes: JSON.parse(JSON.stringify(loadtypes)),
      count,
    },
  };
};
