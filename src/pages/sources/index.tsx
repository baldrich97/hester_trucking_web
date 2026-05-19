import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Source from "../../components/objects/Source";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { SourcesModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type SourcesType = z.infer<typeof SourcesModel>;

const columns: TableColumnsType = [
  { name: "Name" },
  { name: "ID", as: "", navigateTo: "/sources/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const Sources = ({ sources, count }: { sources: SourcesType[]; count: number }) => {
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
            label={"Sources"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="sources.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={sources}
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
        <Source
          onCreated={() => {
            tableRef.current?.refresh();
          }}
        />
      </Grid2>
    </Grid2>
  );
};

export default Sources;

export const getServerSideProps: GetServerSideProps = async () => {
  const prismaAny = prisma as any;
  const count = await prismaAny.sources.count();
  const sources = await prismaAny.sources.findMany({
    take: 10,
    orderBy: {
      Name: "asc",
    },
  });

  return {
    props: {
      sources: JSON.parse(JSON.stringify(sources)),
      count,
    },
  };
};
