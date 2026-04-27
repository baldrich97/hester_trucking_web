import React, {useEffect, useState} from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Source from "../../components/objects/Source";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {SourcesModel} from "../../../prisma/zod";
import {z} from "zod";
import GenericTable from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type SourcesType = z.infer<typeof SourcesModel>;

const columns: TableColumnsType = [
    {name: "Name"},
    {name: "ID", as: "", navigateTo: "/sources/"},
];

const overrides: TableColumnOverridesType = [{name: "ID", type: "button"}];

const Sources = ({sources, count}: {sources: SourcesType[]; count: number}) => {
    const [search, setSearch] = useState("");
    const [trpcData, setData] = useState<SourcesType[]>([]);
    const [trpcCount, setCount] = useState(0);
    const [page, setPage] = useState(0);
    const [order, setOrder] = React.useState<"asc" | "desc">("asc");
    const [orderBy, setOrderBy] = React.useState("Name");

    useEffect(() => {
        if (search.length === 0) {
            setData([]);
        }
    }, [search]);

    trpc.useQuery(["sources.searchPage", {search, page, orderBy, order}], {
        refetchOnWindowFocus: false,
        onSuccess(data) {
            setData(data.rows);
            setCount(data.count);
        },
        onError(error) {
            console.warn(error.message);
        },
    });

    return (
        <Grid2 container wrap={"nowrap"}>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <Grid2 xs={4}>
                    <SearchBar
                        setSearchQuery={setSearch}
                        setShouldSearch={() => {
                            setPage(0);
                        }}
                        query={search}
                        label={"Sources"}
                    />
                </Grid2>
                <GenericTable
                    data={trpcData.length || (order !== "asc" || orderBy !== "Name") ? trpcData : sources}
                    columns={columns}
                    overrides={overrides}
                    count={search ? trpcCount : count}
                    refreshData={(newPage: React.SetStateAction<number>, newOrderBy: string, newOrder: "asc" | "desc") => {
                        setPage(newPage);
                        setOrderBy(newOrderBy);
                        setOrder(newOrder);
                    }}
                />
            </Grid2>
            <Divider flexItem={true} orientation={"vertical"} sx={{mr: "-1px"}} variant={"fullWidth"} />
            <Grid2 xs={4}>
                <Source />
            </Grid2>
        </Grid2>
    );
};

export default Sources;

export const getServerSideProps: GetServerSideProps = async () => {
    const count = await prisma.sources.count();
    const sources = await prisma.sources.findMany({
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
