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
import PeopleIcon from "@mui/icons-material/People";
import EngineeringIcon from "@mui/icons-material/Engineering";
import CategoryIcon from "@mui/icons-material/Category";
import AttachMoneyIcon from "@mui/icons-material/AttachMoney";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import EventAvailable from "@mui/icons-material/EventAvailable";
import CalendarMonth from "@mui/icons-material/CalendarMonth";
import LayersIcon from "@mui/icons-material/Layers";
import * as React from "react";
import { styled } from "@mui/material/styles";
import MuiDrawer from "@mui/material/Drawer";
import { useRouter } from "next/router";

const drawerWidth = 240;

const Drawer = styled(MuiDrawer, {
  shouldForwardProp: (prop) => prop !== "open",
})(({ theme, open }) => ({
  "& .MuiDrawer-paper": {
    position: "relative",
    whiteSpace: "nowrap",
    width: drawerWidth,
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

function Sidenav(props: any) {
  let selectedLink = 1;

  const router = useRouter();
  const currentPath = router.asPath;

  if (currentPath.includes("/customers")) {
    selectedLink = 2;
  } else if (currentPath.includes("/deliverylocations")) {
    selectedLink = 3;
  } else if (currentPath.includes("/drivers")) {
    selectedLink = 4;
  } else if (currentPath.includes("/invoices")) {
    selectedLink = 5;
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
  }

  const [selectedIndex, setSelectedIndex] = React.useState(selectedLink);
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
        <NextLink href="/drivers" passHref>
          <ListItemButton
            selected={selectedIndex === 4}
            onClick={() => setSelectedIndex(4)}
          >
            <ListItemIcon>
              <EngineeringIcon />
            </ListItemIcon>
            <ListItemText primary="Drivers" />
          </ListItemButton>
        </NextLink>
        <NextLink href="/invoices" passHref>
          <ListItemButton
            selected={selectedIndex === 5}
            onClick={() => setSelectedIndex(5)}
          >
            <ListItemIcon>
              <AttachMoneyIcon />
            </ListItemIcon>
            <ListItemText primary="Invoices" />
          </ListItemButton>
        </NextLink>
        <NextLink href="/loads" passHref>
          <ListItemButton
            selected={selectedIndex === 6}
            onClick={() => setSelectedIndex(6)}
          >
            <ListItemIcon>
              <CategoryIcon />
            </ListItemIcon>
            <ListItemText primary="Loads" />
          </ListItemButton>
        </NextLink>
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
        <NextLink href="/dailies" passHref>
          <ListItemButton
            selected={selectedIndex === 9}
            onClick={() => setSelectedIndex(9)}
          >
            <ListItemIcon>
              <EventAvailable />
            </ListItemIcon>
            <ListItemText primary="Dailies" />
          </ListItemButton>
        </NextLink>
        <NextLink href="/weeklies" passHref>
          <ListItemButton
            selected={selectedIndex === 10}
            onClick={() => setSelectedIndex(10)}
          >
            <ListItemIcon>
              <CalendarMonth />
            </ListItemIcon>
            <ListItemText primary="Weeklies" />
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
      </List>
    </Drawer>
  );
}

export default Sidenav;
