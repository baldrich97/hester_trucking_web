import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import ChevronLeftIcon from "@mui/icons-material/ChevronLeft";
import Divider from "@mui/material/Divider";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemText from "@mui/material/ListItemText";
import ListItemIcon from "@mui/material/ListItemIcon";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PaymentsIcon from "@mui/icons-material/Payments";
import NextLink from "next/link";
import MapsHomeWorkIcon from "@mui/icons-material/MapsHomeWork";
import BusinessIcon from "@mui/icons-material/Business";
import PeopleIcon from "@mui/icons-material/People";
import EngineeringIcon from "@mui/icons-material/Engineering";
import CategoryIcon from "@mui/icons-material/Category";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventAvailable from "@mui/icons-material/EventAvailable";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import LayersIcon from "@mui/icons-material/Layers";
import HubIcon from "@mui/icons-material/Hub";
import AssessmentIcon from "@mui/icons-material/Assessment";
import * as React from "react";
import {styled} from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import Box from "@mui/material/Box";
import {useRouter} from "next/router";
import ExpandLess from "@mui/icons-material/ExpandLess";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Collapse from "@mui/material/Collapse";
import Badge from "@mui/material/Badge";
import {trpc} from "../../utils/trpc";

const drawerWidth = 240;

const Drawer = styled(MuiDrawer, {
    shouldForwardProp: (prop) => prop !== "open",
})(({theme, open}) => ({
    "& .MuiDrawer-paper": {
        position: "relative",
        whiteSpace: "nowrap",
        width: drawerWidth,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: theme.transitions.create("width", {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
        boxSizing: "border-box",
        ...(!open && {
            overflowX: "hidden",
            transition: theme.transitions.create("width", {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
            }),
            width: theme.spacing(7),
            [theme.breakpoints.up("sm")]: {
                width: theme.spacing(9),
            },
        }),
    },
}));

/** Side nav highlight index; keep driver sub-routes (20–22) disjoint from invoices (50–51). */
function pathToSideNavIndex(currentPath: string): number {
    let selectedLink = 1;

    if (currentPath.includes("/reports/customers")) {
        selectedLink = 28;
    } else if (currentPath.includes("/reports")) {
        selectedLink = 27;
    } else if (currentPath.includes("/customers")) {
        selectedLink = 2;
    } else if (currentPath.includes("/deliverylocations")) {
        selectedLink = 3;
    } else if (currentPath.includes("/drivers/owner_forms")) {
        selectedLink = 22;
    } else if (currentPath.includes("/drivers/w2_forms")) {
        selectedLink = 21;
    } else if (currentPath.includes("/drivers/expiring-soon")) {
        selectedLink = 23;
    } else if (currentPath.includes("/drivers/form-options")) {
        selectedLink = 20;
    } else if (currentPath.includes("/drivers")) {
        selectedLink = 4;
    } else if (currentPath.includes("/invoices/overdue")) {
        selectedLink = 51;
    } else if (currentPath.includes("/invoices")) {
        selectedLink = 50;
    } else if (currentPath.includes("/loads")) {
        selectedLink = 6;
    } else if (currentPath.includes("/loadtypes")) {
        selectedLink = 7;
    } else if (currentPath.includes("/trucks")) {
        selectedLink = 8;
    } else if (currentPath.includes("/dailies")) {
        selectedLink = 9;
    } else if (currentPath.includes("/weeklies")) {
        selectedLink = 10;
    } else if (currentPath.includes("/paystubs")) {
        selectedLink = 11;
    } else if (currentPath.includes("/carriers")) {
        selectedLink = 24;
    } else if (currentPath.includes("/sources")) {
        selectedLink = 26;
    }

    return selectedLink;
}

function Sidenav(props: any) {
    const router = useRouter();
    const currentPath = router.asPath;
    const selectedLink = pathToSideNavIndex(currentPath);

    const {data: compliance} = trpc.useQuery(["compliance.driverFormsSummary"], {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });
    const complianceCount = compliance?.totalIssues ?? 0;
    const w2ComplianceCount = compliance?.w2Issues ?? 0;
    const ooComplianceCount = compliance?.ooIssues ?? 0;
    const expiringSoonCount = compliance?.expiringSoonTotal ?? 0;

    const [isDailiesOpen, setDailiesOpen] = React.useState<boolean>(false);
    const [isCarriersOpen, setCarriersOpen] = React.useState<boolean>(false);
    const [isDriversOpen, setDriversOpen] = React.useState<boolean>(false);
    const [isWeekliesOpen, setWeekliesOpen] = React.useState<boolean>(false);
    const [isLoadsOpen, setLoadsOpen] = React.useState<boolean>(false);
    const [isInvoicesOpen, setInvoicesOpen] = React.useState<boolean>(false);
    const [isReportsOpen, setReportsOpen] = React.useState<boolean>(false);

    const {data: overdueCount = 0} = trpc.useQuery(["invoices.getOverdueCount"], {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
    });

    React.useEffect(() => {
        if (currentPath.includes("/invoices") && overdueCount) {
            setInvoicesOpen(true);
        }
    }, [currentPath, overdueCount]);

    React.useEffect(() => {
        if (currentPath.includes("/drivers") && (complianceCount || expiringSoonCount)) {
            setDriversOpen(true);
        }
    }, [currentPath, complianceCount, expiringSoonCount]);

    const [selectedIndex, setSelectedIndex] = React.useState(selectedLink);

    React.useEffect(() => {
        setSelectedIndex(pathToSideNavIndex(currentPath));
    }, [currentPath]);

    return (
        <Drawer variant="permanent" open={props.open}>
            <Toolbar
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "flex-end",
                    px: [1],
                }}
            >
                <IconButton
                    onClick={() => {
                        props.toggleDrawer();
                    }}
                >
                    <ChevronLeftIcon />
                </IconButton>
            </Toolbar>
            <Divider />
            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                }}
            >
            <List component="nav">
                <NextLink href="/" passHref>
                    <ListItemButton
                        selected={selectedIndex === 1}
                        onClick={() => setSelectedIndex(1)}
                    >
                        <ListItemIcon>
                            <DashboardIcon />
                        </ListItemIcon>
                        <ListItemText primary="Dashboard" />
                    </ListItemButton>
                </NextLink>


                <ListItemButton
                    selected={[24, 25].includes(selectedIndex)}
                >
                    <NextLink href="/carriers" passHref>
                        <ListItemIcon>
                            <BusinessIcon
                                onClick={() => {
                                    setSelectedIndex(24);
                                }}
                            />
                        </ListItemIcon>
                    </NextLink>
                    <NextLink href="/carriers" passHref>
                        <ListItemText primary="Carriers" onClick={() => {
                            setSelectedIndex(24);
                        }} />
                    </NextLink>
                    {isCarriersOpen ? <ExpandLess onClick={() => setCarriersOpen(!isCarriersOpen)} /> :
                        <ExpandMore onClick={() => setCarriersOpen(!isCarriersOpen)} />}
                </ListItemButton>

                <Collapse in={isCarriersOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <NextLink href="/carriers/compliance" passHref>
                            <ListItemButton
                                selected={selectedIndex === 25}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(25)}
                            >
                                <ListItemText primary="Carrier compliance" />
                            </ListItemButton>
                        </NextLink>
                        {/*<NextLink href="/drivers/w2" passHref>*/}
                        {/*    <ListItemButton*/}
                        {/*        selected={selectedIndex === 21}*/}
                        {/*        sx={{ pl: 4 }}*/}
                        {/*        onClick={() => setSelectedIndex(21)}*/}
                        {/*    >*/}
                        {/*        <ListItemText primary="W2 Forms" />*/}
                        {/*    </ListItemButton>*/}
                        {/*</NextLink>*/}
                        {/*<NextLink href="/drivers/operator" passHref>*/}
                        {/*    <ListItemButton*/}
                        {/*        selected={selectedIndex === 22}*/}
                        {/*        sx={{ pl: 4 }}*/}
                        {/*        onClick={() => setSelectedIndex(22)}*/}
                        {/*    >*/}
                        {/*        <ListItemText primary="Non-W2 Forms" />*/}
                        {/*    </ListItemButton>*/}
                        {/*</NextLink>*/}
                        {/*<NextLink href="/drivers/companies" passHref>*/}
                        {/*    <ListItemButton*/}
                        {/*        selected={selectedIndex === 23}*/}
                        {/*        sx={{ pl: 4 }}*/}
                        {/*        onClick={() => setSelectedIndex(23)}*/}
                        {/*    >*/}
                        {/*        <ListItemText primary="Company Compliance" />*/}
                        {/*    </ListItemButton>*/}
                        {/*</NextLink>*/}
                    </List>
                </Collapse>



                <NextLink href="/customers" passHref>
                    <ListItemButton
                        selected={selectedIndex === 2}
                        onClick={() => setSelectedIndex(2)}
                    >
                        <ListItemIcon>
                            <PeopleIcon />
                        </ListItemIcon>
                        <ListItemText primary="Customers" />
                    </ListItemButton>
                </NextLink>

                <ListItemButton
                    selected={[9, 12, 13, 14, 17].includes(selectedIndex)}
                >
                    <NextLink href="/dailies" passHref>
                        <ListItemIcon>
                            <EventAvailable
                                onClick={() => {
                                    setSelectedIndex(9);
                                }}
                            />
                        </ListItemIcon>
                    </NextLink>
                    <NextLink href="/dailies" passHref>
                        <ListItemText primary="Dailies" onClick={() => {
                            setSelectedIndex(9);
                        }} />
                    </NextLink>
                    {isDailiesOpen ? <ExpandLess onClick={() => setDailiesOpen(!isDailiesOpen)} /> :
                        <ExpandMore onClick={() => setDailiesOpen(!isDailiesOpen)} />}
                </ListItemButton>

                <Collapse in={isDailiesOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <NextLink href="/dailies" passHref>
                            <ListItemButton
                                selected={selectedIndex === 12}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(12)} // Use unique index for nested items
                            >
                                <ListItemText primary="By Date" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/dailies/w2" passHref>
                            <ListItemButton
                                selected={selectedIndex === 13}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(13)}
                            >
                                <ListItemText primary="W2 Missing Pay" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/dailies/operator" passHref>
                            <ListItemButton
                                selected={selectedIndex === 14}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(14)}
                            >
                                <ListItemText primary="OO Missing Pay" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/dailies/not_printed" passHref>
                            <ListItemButton
                                selected={selectedIndex === 17}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(17)}
                            >
                                <ListItemText primary="Unprinted" />
                            </ListItemButton>
                        </NextLink>
                    </List>
                </Collapse>

                <NextLink href="/deliverylocations" passHref>
                    <ListItemButton
                        selected={selectedIndex === 3}
                        onClick={() => setSelectedIndex(3)}
                    >
                        <ListItemIcon>
                            <MapsHomeWorkIcon />
                        </ListItemIcon>
                        <ListItemText primary="Delivery Locations" />
                    </ListItemButton>
                </NextLink>

                <ListItemButton
                    selected={[4, 20, 21, 22, 23].includes(selectedIndex)}
                >
                    <NextLink href="/drivers" passHref>
                        <ListItemIcon>
                            <Badge
                                color="error"
                                badgeContent={complianceCount}
                                invisible={complianceCount === 0 || isDriversOpen}
                            >
                                <EventAvailable
                                    onClick={() => {
                                        setSelectedIndex(4);
                                    }}
                                />
                            </Badge>
                        </ListItemIcon>
                    </NextLink>
                    <NextLink href="/drivers" passHref>
                        <ListItemText
                            primary="Drivers"
                            onClick={() => {
                                setSelectedIndex(4);
                            }}
                        />
                    </NextLink>
                    {isDriversOpen ? <ExpandLess onClick={() => setDriversOpen(!isDriversOpen)} /> :
                        <ExpandMore onClick={() => setDriversOpen(!isDriversOpen)} />}
                </ListItemButton>

                <Collapse in={isDriversOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <NextLink href="/drivers/form-options" passHref>
                            <ListItemButton
                                selected={selectedIndex === 20}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(20)}
                            >
                                <ListItemText primary="Form Options" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/drivers/expiring-soon" passHref>
                            <ListItemButton
                                selected={selectedIndex === 23}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(23)}
                            >
                                <ListItemText primary="Exp Soon" />
                                {isDriversOpen && expiringSoonCount > 0 ? (
                                    <span
                                        style={{
                                            marginLeft: "auto",
                                            minWidth: 22,
                                            height: 22,
                                            borderRadius: 11,
                                            background: "#ed6c02",
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0 7px",
                                        }}
                                    >
                                        {expiringSoonCount}
                                    </span>
                                ) : null}
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/drivers/w2_forms" passHref>
                            <ListItemButton
                                selected={selectedIndex === 21}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(21)}
                            >
                                <ListItemText primary="W2 Forms" />
                                {isDriversOpen && w2ComplianceCount > 0 ? (
                                    <span
                                        style={{
                                            marginLeft: "auto",
                                            minWidth: 22,
                                            height: 22,
                                            borderRadius: 11,
                                            background: "#d32f2f",
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0 7px",
                                        }}
                                    >
                                        {w2ComplianceCount}
                                    </span>
                                ) : null}
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/drivers/owner_forms" passHref>
                            <ListItemButton
                                selected={selectedIndex === 22}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(22)}
                            >
                                <ListItemText primary="OO Forms" />
                                {isDriversOpen && ooComplianceCount > 0 ? (
                                    <span
                                        style={{
                                            marginLeft: "auto",
                                            minWidth: 22,
                                            height: 22,
                                            borderRadius: 11,
                                            background: "#d32f2f",
                                            color: "#fff",
                                            fontSize: 12,
                                            fontWeight: 700,
                                            display: "inline-flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            padding: "0 7px",
                                        }}
                                    >
                                        {ooComplianceCount}
                                    </span>
                                ) : null}
                            </ListItemButton>
                        </NextLink>
                        {/*<NextLink href="/drivers/companies" passHref>*/}
                        {/*    <ListItemButton*/}
                        {/*        selected={selectedIndex === 23}*/}
                        {/*        sx={{ pl: 4 }}*/}
                        {/*        onClick={() => setSelectedIndex(23)}*/}
                        {/*    >*/}
                        {/*        <ListItemText primary="Company Compliance" />*/}
                        {/*    </ListItemButton>*/}
                        {/*</NextLink>*/}
                    </List>
                </Collapse>



                <ListItemButton
                    selected={[5, 50, 51].includes(selectedIndex)}
                >
                    <NextLink href="/invoices" passHref>
                        <ListItemIcon>
                            <Badge
                                color="error"
                                badgeContent={overdueCount}
                                invisible={overdueCount === 0 || isInvoicesOpen}
                            >
                                <AttachMoneyIcon
                                    onClick={() => {
                                        setSelectedIndex(5);
                                    }}
                                />
                            </Badge>
                        </ListItemIcon>
                    </NextLink>
                    <NextLink href="/invoices" passHref>
                        <ListItemText
                            primary="Invoices"
                            onClick={() => {
                                setSelectedIndex(5);
                            }}
                        />
                    </NextLink>
                    {isInvoicesOpen ? (
                        <ExpandLess onClick={() => setInvoicesOpen(!isInvoicesOpen)} />
                    ) : (
                        <ExpandMore onClick={() => setInvoicesOpen(!isInvoicesOpen)} />
                    )}
                </ListItemButton>

                <Collapse in={isInvoicesOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <NextLink href="/invoices" passHref>
                            <ListItemButton
                                selected={selectedIndex === 50}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(50)}
                            >
                                <ListItemText primary="By Date" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/invoices/overdue" passHref>
                            <ListItemButton
                                selected={selectedIndex === 51}
                                sx={{ pl: 4, display: "flex", justifyContent: "space-between" }}
                                onClick={() => setSelectedIndex(51)}
                            >
                                <ListItemText primary="Overdue" />
                                {isInvoicesOpen && overdueCount > 0 && (
                                    <Badge
                                        color="error"
                                        badgeContent={overdueCount}
                                        sx={{marginRight: 2}}
                                    >
                                        <span />
                                    </Badge>
                                )}
                            </ListItemButton>
                        </NextLink>
                    </List>
                </Collapse>

                <ListItemButton
                    selected={[6, 15, 16].includes(selectedIndex)}
                >
                    <NextLink href="/loads" passHref>
                        <ListItemIcon>
                            <CategoryIcon
                                onClick={() => {
                                    setSelectedIndex(6);
                                }}
                            />
                        </ListItemIcon>
                    </NextLink>
                    <NextLink href="/loads" passHref>
                        <ListItemText primary="Loads" onClick={() => {
                            setSelectedIndex(6);
                        }} />
                    </NextLink>
                    {isLoadsOpen ? <ExpandLess onClick={() => setLoadsOpen(!isLoadsOpen)} /> :
                        <ExpandMore onClick={() => setLoadsOpen(!isLoadsOpen)} />}
                </ListItemButton>

                <Collapse in={isLoadsOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <NextLink href="/loads" passHref>
                            <ListItemButton
                                selected={selectedIndex === 15}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(15)} // Use unique index for nested items
                            >
                                <ListItemText primary="Table" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/loads/massedit" passHref>
                            <ListItemButton
                                selected={selectedIndex === 16}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(16)}
                            >
                                <ListItemText primary="Mass Edit" />
                            </ListItemButton>
                        </NextLink>
                    </List>
                </Collapse>

                <NextLink href="/loadtypes" passHref>
                    <ListItemButton
                        selected={selectedIndex === 7}
                        onClick={() => setSelectedIndex(7)}
                    >
                        <ListItemIcon>
                            <LayersIcon />
                        </ListItemIcon>
                        <ListItemText primary="Load Types" />
                    </ListItemButton>
                </NextLink>

                <NextLink href="/paystubs" passHref>
                    <ListItemButton
                        selected={selectedIndex === 11}
                        onClick={() => setSelectedIndex(11)}
                    >
                        <ListItemIcon>
                            <PaymentsIcon />
                        </ListItemIcon>
                        <ListItemText primary="Paystubs" />
                    </ListItemButton>
                </NextLink>

                {/*<ListItemButton*/}
                {/*    selected={[27, 28].includes(selectedIndex)}*/}
                {/*>*/}
                {/*    <NextLink href="/reports" passHref>*/}
                {/*        <ListItemIcon>*/}
                {/*            <AssessmentIcon*/}
                {/*                onClick={() => {*/}
                {/*                    setSelectedIndex(27);*/}
                {/*                }}*/}
                {/*            />*/}
                {/*        </ListItemIcon>*/}
                {/*    </NextLink>*/}
                {/*    <NextLink href="/reports" passHref>*/}
                {/*        <ListItemText primary="Reports" onClick={() => {*/}
                {/*            setSelectedIndex(27);*/}
                {/*        }} />*/}
                {/*    </NextLink>*/}
                {/*    {isReportsOpen ? <ExpandLess onClick={() => setReportsOpen(!isReportsOpen)} /> :*/}
                {/*        <ExpandMore onClick={() => setReportsOpen(!isReportsOpen)} />}*/}
                {/*</ListItemButton>*/}

                {/*<Collapse in={isReportsOpen} timeout="auto" unmountOnExit>*/}
                {/*    <List component="div" disablePadding>*/}
                {/*        <NextLink href="/reports" passHref>*/}
                {/*            <ListItemButton*/}
                {/*                selected={selectedIndex === 27}*/}
                {/*                sx={{ pl: 4 }}*/}
                {/*                onClick={() => setSelectedIndex(27)}*/}
                {/*            >*/}
                {/*                <ListItemText primary="By Source" />*/}
                {/*            </ListItemButton>*/}
                {/*        </NextLink>*/}
                {/*        <NextLink href="/reports/customers" passHref>*/}
                {/*            <ListItemButton*/}
                {/*                selected={selectedIndex === 28}*/}
                {/*                sx={{ pl: 4 }}*/}
                {/*                onClick={() => setSelectedIndex(28)}*/}
                {/*            >*/}
                {/*                <ListItemText primary="By Customer" />*/}
                {/*            </ListItemButton>*/}
                {/*        </NextLink>*/}
                {/*    </List>*/}
                {/*</Collapse>*/}

                <NextLink href="/sources" passHref>
                    <ListItemButton
                        selected={selectedIndex === 26}
                        onClick={() => setSelectedIndex(26)}
                    >
                        <ListItemIcon>
                            <HubIcon />
                        </ListItemIcon>
                        <ListItemText primary="Sources" />
                    </ListItemButton>
                </NextLink>

                <NextLink href="/trucks" passHref>
                    <ListItemButton
                        selected={selectedIndex === 8}
                        onClick={() => setSelectedIndex(8)}
                    >
                        <ListItemIcon>
                            <LocalShippingIcon />
                        </ListItemIcon>
                        <ListItemText primary="Trucks" />
                    </ListItemButton>
                </NextLink>



                <ListItemButton
                    selected={[10, 18, 19].includes(selectedIndex)}
                >
                    <NextLink href="/weeklies" passHref>
                        <ListItemIcon>
                            <CalendarMonth
                                onClick={() => {
                                    setSelectedIndex(9);
                                }}
                            />
                        </ListItemIcon>
                    </NextLink>
                    <NextLink href="/weeklies" passHref>
                        <ListItemText primary="Weeklies" onClick={() => {
                            setSelectedIndex(10);
                        }} />
                    </NextLink>
                    {isWeekliesOpen ? <ExpandLess onClick={() => setWeekliesOpen(!isWeekliesOpen)} /> :
                        <ExpandMore onClick={() => setWeekliesOpen(!isWeekliesOpen)} />}
                </ListItemButton>

                <Collapse in={isWeekliesOpen} timeout="auto" unmountOnExit>
                    <List component="div" disablePadding>
                        <NextLink href="/weeklies" passHref>
                            <ListItemButton
                                selected={selectedIndex === 18}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(18)} // Use unique index for nested items
                            >
                                <ListItemText primary="By Date" />
                            </ListItemButton>
                        </NextLink>
                        <NextLink href="/weeklies/not_printed" passHref>
                            <ListItemButton
                                selected={selectedIndex === 19}
                                sx={{ pl: 4 }}
                                onClick={() => setSelectedIndex(19)}
                            >
                                <ListItemText primary="Unprinted" />
                            </ListItemButton>
                        </NextLink>
                    </List>
                </Collapse>

            </List>
            </Box>
        </Drawer>

    );
}

export default Sidenav;
