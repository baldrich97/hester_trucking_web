import React, { useRef, useState } from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import DeliveryLocation from "../../components/objects/DeliveryLocation";
import { GetServerSideProps } from "next";
import { prisma } from "server/db/client";
import { DeliveryLocationsModel } from "../../../prisma/zod";
import { z } from "zod";
import GenericTable, { GenericTableHandle } from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import { TableColumnsType, TableColumnOverridesType } from "../../utils/types";

type DeliveryLocationsType = z.infer<typeof DeliveryLocationsModel>;

const columns: TableColumnsType = [
  { name: "Description" },
  { name: "ID", as: "", navigateTo: "/deliverylocations/" },
];

const overrides: TableColumnOverridesType = [{ name: "ID", type: "button" }];

const DeliveryLocations = ({
  deliverylocations,
  count,
}: {
  deliverylocations: DeliveryLocationsType[];
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
            label={"Delivery Locations"}
          />
        </Grid2>
        <GenericTable
          tableRef={tableRef}
          trpcQuery="deliverylocations.searchPage"
          trpcInput={{ search }}
          resultShape="paginated"
          initialRows={deliverylocations}
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
        <DeliveryLocation />
      </Grid2>
    </Grid2>
  );
};

export default DeliveryLocations;

export const getServerSideProps: GetServerSideProps = async () => {
  const count = await prisma.deliveryLocations.count();
  const deliverylocations = await prisma.deliveryLocations.findMany({
    take: 10,
    orderBy: { ID: "desc" },
  });

  return {
    props: {
      deliverylocations,
      count,
    },
  };
};
