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
import {useSourcesCutover} from "../../hooks/useSourcesCutover";

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
            "& .MuiListItemText-root": {
                display: "none",
            },
            "& .MuiCollapse-root": {
                display: "none",
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

const CHEVRON_SLOT_WIDTH = 34;

function NavLinkButton({
    href,
    selected,
    onClick,
    sx,
    children,
}: {
    href: string;
    selected?: boolean;
    onClick?: () => void;
    sx?: object;
    children: React.ReactNode;
}) {
    return (
        <NextLink href={href} passHref legacyBehavior>
            <ListItemButton component="a" selected={selected} onClick={onClick} sx={sx}>
                {children}
            </ListItemButton>
        </NextLink>
    );
}

function NavListItem({
    href,
    label,
    icon,
    selected,
    onSelect,
    drawerOpen,
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
    selected: boolean;
    onSelect: () => void;
    drawerOpen: boolean;
}) {
    if (!drawerOpen) {
        return (
            <NavLinkButton
                href={href}
                selected={selected}
                onClick={onSelect}
                sx={{justifyContent: "center", px: 1, minHeight: 48}}
            >
                <ListItemIcon sx={{minWidth: 0, justifyContent: "center"}}>{icon}</ListItemIcon>
            </NavLinkButton>
        );
    }

    return (
        <NavLinkButton href={href} selected={selected} onClick={onSelect} sx={{pr: 0.5}}>
            <ListItemIcon sx={{minWidth: 40}}>{icon}</ListItemIcon>
            <ListItemText primary={label} />
            <Box sx={{width: CHEVRON_SLOT_WIDTH, flexShrink: 0}} aria-hidden />
        </NavLinkButton>
    );
}

function ExpandableNavItem({
    href,
    label,
    icon,
    parentIndex,
    childIndices,
    selectedIndex,
    setSelectedIndex,
    open,
    onToggle,
    drawerOpen,
    onExpandDrawer,
    children,
}: {
    href: string;
    label: string;
    icon: React.ReactNode;
    parentIndex: number;
    childIndices: number[];
    selectedIndex: number;
    setSelectedIndex: (index: number) => void;
    open: boolean;
    onToggle: () => void;
    drawerOpen: boolean;
    onExpandDrawer: () => void;
    children: React.ReactNode;
}) {
    const selected = [parentIndex, ...childIndices].includes(selectedIndex);

    const handleCollapsedClick = (e: React.MouseEvent) => {
        e.preventDefault();
        onExpandDrawer();
        if (!open) {
            onToggle();
        }
        setSelectedIndex(parentIndex);
    };

    if (!drawerOpen) {
        return (
            <ListItemButton
                selected={selected}
                onClick={handleCollapsedClick}
                sx={{justifyContent: "center", px: 1, minHeight: 48}}
            >
                <ListItemIcon sx={{minWidth: 0, justifyContent: "center"}}>{icon}</ListItemIcon>
            </ListItemButton>
        );
    }

    return (
        <>
            <Box sx={{display: "flex", alignItems: "center", width: "100%", pr: 0.5}}>
                <Box sx={{flex: 1, minWidth: 0}}>
                    <NavLinkButton
                        href={href}
                        selected={selected}
                        onClick={() => setSelectedIndex(parentIndex)}
                    >
                        <ListItemIcon sx={{minWidth: 40}}>{icon}</ListItemIcon>
                        <ListItemText primary={label} />
                    </NavLinkButton>
                </Box>
                <IconButton
                    size="small"
                    sx={{width: CHEVRON_SLOT_WIDTH, flexShrink: 0}}
                    aria-label={`${open ? "Collapse" : "Expand"} ${label}`}
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggle();
                    }}
                >
                    {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </IconButton>
            </Box>
            <Collapse in={open} timeout="auto" unmountOnExit>
                {children}
            </Collapse>
        </>
    );
}

function Sidenav(props: any) {
    const router = useRouter();
    const currentPath = router.asPath;
    const selectedLink = pathToSideNavIndex(currentPath);

    const {data: compliance} = trpc.useQuery(["compliance.driverFormsSummary"], {
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
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
        staleTime: 5 * 60 * 1000,
        refetchInterval: 5 * 60 * 1000,
        refetchOnWindowFocus: false,
    });

    const {active: cutoverActive} = useSourcesCutover();

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

    const drawerOpen = Boolean(props.open);
    const expandDrawer = () => {
        if (!drawerOpen) {
            props.toggleDrawer();
        }
    };

    return (
        <Drawer variant="permanent" open={drawerOpen}>
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
                <NavListItem
                    href="/"
                    label="Dashboard"
                    icon={<DashboardIcon />}
                    selected={selectedIndex === 1}
                    onSelect={() => setSelectedIndex(1)}
                    drawerOpen={drawerOpen}
                />


                <ExpandableNavItem
                    href="/carriers"
                    label="Carriers"
                    icon={<BusinessIcon />}
                    parentIndex={24}
                    childIndices={[25]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isCarriersOpen}
                    onToggle={() => setCarriersOpen(!isCarriersOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/carriers/compliance"
                            selected={selectedIndex === 25}
                            onClick={() => setSelectedIndex(25)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="Carrier compliance" />
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>



                <NavListItem
                    href="/customers"
                    label="Customers"
                    icon={<PeopleIcon />}
                    selected={selectedIndex === 2}
                    onSelect={() => setSelectedIndex(2)}
                    drawerOpen={drawerOpen}
                />

                <ExpandableNavItem
                    href="/dailies"
                    label="Dailies"
                    icon={<EventAvailable />}
                    parentIndex={9}
                    childIndices={[12, 13, 14, 17]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isDailiesOpen}
                    onToggle={() => setDailiesOpen(!isDailiesOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/dailies"
                            selected={selectedIndex === 12}
                            onClick={() => setSelectedIndex(12)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="By Date" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/dailies/w2"
                            selected={selectedIndex === 13}
                            onClick={() => setSelectedIndex(13)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="W2 Missing Pay" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/dailies/operator"
                            selected={selectedIndex === 14}
                            onClick={() => setSelectedIndex(14)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="OO Missing Pay" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/dailies/not_printed"
                            selected={selectedIndex === 17}
                            onClick={() => setSelectedIndex(17)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="Unprinted" />
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>

                <NavListItem
                    href="/deliverylocations"
                    label="Delivery Locations"
                    icon={<MapsHomeWorkIcon />}
                    selected={selectedIndex === 3}
                    onSelect={() => setSelectedIndex(3)}
                    drawerOpen={drawerOpen}
                />

                <ExpandableNavItem
                    href="/drivers"
                    label="Drivers"
                    icon={
                        <Badge
                            color="error"
                            badgeContent={complianceCount}
                            invisible={complianceCount === 0 || (drawerOpen && isDriversOpen)}
                        >
                            <EventAvailable />
                        </Badge>
                    }
                    parentIndex={4}
                    childIndices={[20, 21, 22, 23]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isDriversOpen}
                    onToggle={() => setDriversOpen(!isDriversOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/drivers/form-options"
                            selected={selectedIndex === 20}
                            onClick={() => setSelectedIndex(20)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="Form Options" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/drivers/expiring-soon"
                            selected={selectedIndex === 23}
                            onClick={() => setSelectedIndex(23)}
                            sx={{pl: 4}}
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
                        </NavLinkButton>
                        <NavLinkButton
                            href="/drivers/w2_forms"
                            selected={selectedIndex === 21}
                            onClick={() => setSelectedIndex(21)}
                            sx={{pl: 4}}
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
                        </NavLinkButton>
                        <NavLinkButton
                            href="/drivers/owner_forms"
                            selected={selectedIndex === 22}
                            onClick={() => setSelectedIndex(22)}
                            sx={{pl: 4}}
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
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>



                <ExpandableNavItem
                    href="/invoices"
                    label="Invoices"
                    icon={
                        <Badge
                            color="error"
                            badgeContent={overdueCount}
                            invisible={overdueCount === 0 || (drawerOpen && isInvoicesOpen)}
                        >
                            <AttachMoneyIcon />
                        </Badge>
                    }
                    parentIndex={5}
                    childIndices={[50, 51]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isInvoicesOpen}
                    onToggle={() => setInvoicesOpen(!isInvoicesOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/invoices"
                            selected={selectedIndex === 50}
                            onClick={() => setSelectedIndex(50)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="By Date" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/invoices/overdue"
                            selected={selectedIndex === 51}
                            onClick={() => setSelectedIndex(51)}
                            sx={{pl: 4, display: "flex", justifyContent: "space-between"}}
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
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>

                <ExpandableNavItem
                    href="/loads"
                    label="Loads"
                    icon={<CategoryIcon />}
                    parentIndex={6}
                    childIndices={[15, 16]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isLoadsOpen}
                    onToggle={() => setLoadsOpen(!isLoadsOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/loads"
                            selected={selectedIndex === 15}
                            onClick={() => setSelectedIndex(15)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="Table" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/loads/massedit"
                            selected={selectedIndex === 16}
                            onClick={() => setSelectedIndex(16)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="Mass Edit" />
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>

                <NavListItem
                    href="/loadtypes"
                    label="Load Types"
                    icon={<LayersIcon />}
                    selected={selectedIndex === 7}
                    onSelect={() => setSelectedIndex(7)}
                    drawerOpen={drawerOpen}
                />

                <NavListItem
                    href="/paystubs"
                    label="Paystubs"
                    icon={<PaymentsIcon />}
                    selected={selectedIndex === 11}
                    onSelect={() => setSelectedIndex(11)}
                    drawerOpen={drawerOpen}
                />

                {cutoverActive && (
                    <>
                <ExpandableNavItem
                    href="/reports"
                    label="Reports"
                    icon={<AssessmentIcon />}
                    parentIndex={27}
                    childIndices={[28]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isReportsOpen}
                    onToggle={() => setReportsOpen(!isReportsOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/reports"
                            selected={selectedIndex === 27}
                            onClick={() => setSelectedIndex(27)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="By Source" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/reports/customers"
                            selected={selectedIndex === 28}
                            onClick={() => setSelectedIndex(28)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="By Customer" />
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>

                <NavListItem
                    href="/sources"
                    label="Sources"
                    icon={<HubIcon />}
                    selected={selectedIndex === 26}
                    onSelect={() => setSelectedIndex(26)}
                    drawerOpen={drawerOpen}
                />
                    </>
                )}

                <NavListItem
                    href="/trucks"
                    label="Trucks"
                    icon={<LocalShippingIcon />}
                    selected={selectedIndex === 8}
                    onSelect={() => setSelectedIndex(8)}
                    drawerOpen={drawerOpen}
                />



                <ExpandableNavItem
                    href="/weeklies"
                    label="Weeklies"
                    icon={<CalendarMonth />}
                    parentIndex={10}
                    childIndices={[18, 19]}
                    selectedIndex={selectedIndex}
                    setSelectedIndex={setSelectedIndex}
                    open={isWeekliesOpen}
                    onToggle={() => setWeekliesOpen(!isWeekliesOpen)}
                    drawerOpen={drawerOpen}
                    onExpandDrawer={expandDrawer}
                >
                    <List component="div" disablePadding>
                        <NavLinkButton
                            href="/weeklies"
                            selected={selectedIndex === 18}
                            onClick={() => setSelectedIndex(18)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="By Date" />
                        </NavLinkButton>
                        <NavLinkButton
                            href="/weeklies/not_printed"
                            selected={selectedIndex === 19}
                            onClick={() => setSelectedIndex(19)}
                            sx={{pl: 4}}
                        >
                            <ListItemText primary="Unprinted" />
                        </NavLinkButton>
                    </List>
                </ExpandableNavItem>

            </List>
            </Box>
        </Drawer>

    );
}

export default Sidenav;
