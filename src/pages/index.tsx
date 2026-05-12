/* eslint-disable react-hooks/rules-of-hooks */
import React from "react";
import {GetServerSideProps} from "next";
import {prisma} from "server/db/client";
import Grid2 from "@mui/material/Unstable_Grid2";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import Load from "components/objects/Load";
import Invoice from "components/objects/Invoice";

const Home = ({lastInvoice}: {lastInvoice: number}) => {
    const [tabValue, setTabValue] = React.useState(0);

    const handleChange = (event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    return (
        <Grid2 container>
            <Grid2 xs={12} sx={{paddingRight: 2.5}}>
                <Box sx={{borderBottom: 1, borderColor: "divider", marginBottom: 2}}>
                    <Tabs value={tabValue} onChange={handleChange}>
                        <Tab label="Data Input"/>
                        {/* <Tab label="Graphs" /> */}
                    </Tabs>
                </Box>
            </Grid2>
            <Grid2 xs={12}>
                <Grid2 container wrap={'nowrap'}>
                    {tabValue === 0 && (

                        <>
                            <Grid2 xs={6}>
                                <Load resetButton={true} />
                            </Grid2>
                            <Divider
                                flexItem={true}
                                orientation={"vertical"}
                                sx={{paddingLeft: "1.5rem"}}
                                variant={"fullWidth"}
                            />
                            <Grid2 xs={5}>
                                <Invoice lastInvoice={lastInvoice}/>
                            </Grid2>
                        </>

                    )}
                </Grid2>
                {tabValue === 1 && null}
            </Grid2>
        </Grid2>
    );
};

export default Home;

export const getServerSideProps: GetServerSideProps = async () => {
    const lastInvoice = await prisma.invoices.aggregate({
        _max: {
            Number: true,
        },
    });

    return {
        props: {
            lastInvoice: (lastInvoice?._max.Number ?? 0) + 1,
        },
    };
};
