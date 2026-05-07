import React, {useEffect, useState} from "react";
import Grid2 from "@mui/material/Unstable_Grid2";
import Carrier from "../../components/objects/Carrier";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import {CarriersModel, StatesModel} from "../../../prisma/zod";
import {z} from "zod";
import GenericTable from "../../elements/GenericTable";
import SearchBar from "../../elements/SearchBar";
import Divider from "@mui/material/Divider";
import {TableColumnsType, TableColumnOverridesType} from "../../utils/types";
import {trpc} from "../../utils/trpc";

type StatesType = z.infer<typeof StatesModel>;
type CarrierRowType = z.infer<typeof CarriersModel> & {
    States: {Abbreviation: string} | null;
};

const columns: TableColumnsType = [
    {name: "Name"},
    {name: "ContactName", as: "Contact"},
    {name: "Phone"},
    {name: "Street"},
    {name: "City"},
    {name: "States.Abbreviation", as: "State"},
    {name: "ZIP"},
    {name: "ID", as: "", navigateTo: "/carriers/"},
];

const overrides: TableColumnOverridesType = [{name: "ID", type: "button"}];

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
    const [trpcData, setData] = useState<CarrierRowType[]>([]);
    const [trpcCount, setCount] = useState(0);
    const [shouldSearch, setShouldSearch] = useState(false);
    const [page, setPage] = useState(0);
    const [order, setOrder] = React.useState<"asc" | "desc">("desc");
    const [orderBy, setOrderBy] = React.useState("ID");

    useEffect(() => {
        if (search.length === 0) {
            setData([]);
            setPage(0);
        }
    }, [search]);

    trpc.useQuery(["carriers.searchPage", {search, page, orderBy, order}], {
        enabled: shouldSearch,
        refetchOnWindowFocus: false,
        onSuccess(data) {
            setData(data.rows as CarrierRowType[]);
            setCount(data.count);
            setShouldSearch(false);
        },
        onError(error) {
            console.warn(error.message);
            setShouldSearch(false);
        },
    });

    return (
        <Grid2 container wrap={"nowrap"}>
            <Grid2 xs={8} sx={{paddingRight: 2.5}}>
                <Grid2 xs={4}>
                    <SearchBar
                        setSearchQuery={setSearch}
                        setShouldSearch={setShouldSearch}
                        query={search}
                        label={"Carriers"}
                    />
                </Grid2>
                <GenericTable
                    data={
                        trpcData.length > 0 || order !== "desc" || orderBy !== "ID"
                            ? trpcData
                            : carriers
                    }
                    columns={columns}
                    overrides={overrides}
                    count={search ? trpcCount : count}
                    refreshData={(
                        pageArg: React.SetStateAction<number>,
                        orderByArg: string,
                        orderArg: "asc" | "desc",
                    ) => {
                        setPage(pageArg);
                        setOrderBy(orderByArg);
                        setOrder(orderArg);
                        setShouldSearch(true);
                    }}
                />
            </Grid2>
            <Divider flexItem orientation={"vertical"} sx={{mr: "-1px"}} variant={"fullWidth"} />
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
        orderBy: {ID: "desc"},
        include: {
            States: {select: {Abbreviation: true}},
        },
    });

    return {
        props: {
            states: JSON.parse(JSON.stringify(states)),
            carriers: JSON.parse(JSON.stringify(carriers)),
            count,
        },
    };
};
