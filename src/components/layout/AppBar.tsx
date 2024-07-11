import Toolbar from "@mui/material/Toolbar";
import IconButton from "@mui/material/IconButton";
import MenuIcon from "@mui/icons-material/Menu";
import Typography from "@mui/material/Typography";
import Badge from "@mui/material/Badge";
import NotificationsIcon from "@mui/icons-material/Notifications";
import * as React from "react";
import {AppBarProps as MuiAppBarProps} from "@mui/material/AppBar/AppBar";
import {styled} from "@mui/material/styles";
import MuiAppBar from "@mui/material/AppBar";
import { signOut } from "next-auth/react";

interface AppBarProps extends MuiAppBarProps {
    open?: boolean;
}

const drawerWidth = 240;

const AppBarContent = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({theme, open}) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    ...(open && {
        marginLeft: drawerWidth,
        width: `calc(100% - ${drawerWidth}px)`,
        transition: theme.transitions.create(['width', 'margin'], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
        }),
    }),
}));

function AppBar(props: any) {
    console.log(props.user)
    return (
        <AppBarContent position="absolute" open={props.open}>
            <Toolbar
                sx={{
                    pr: '24px', // keep right padding when drawer closed
                }}
            >
                <IconButton
                    edge="start"
                    color="inherit"
                    aria-label="open drawer"
                    onClick={() => {props.toggleDrawer()}}
                    sx={{
                        marginRight: '36px',
                        ...(props.open && {display: 'none'}),
                    }}
                >
                    <MenuIcon/>
                </IconButton>
                <Typography
                    component="h1"
                    variant="h6"
                    color="inherit"
                    noWrap
                    sx={{flexGrow: 1}}
                >
                    Hester Trucking Inc.
                </Typography>
                {/*<IconButton color="inherit">
                    <Badge badgeContent={4} color="secondary">
                        <NotificationsIcon/>
                    </Badge>
                </IconButton>*/}
                {props.user && <b>{props.user.username}</b>}
                &nbsp;&nbsp;
                <button onClick={async () => await signOut()}>
                    Sign Out
                </button>
            </Toolbar>
        </AppBarContent>
    )
}

export default AppBar;