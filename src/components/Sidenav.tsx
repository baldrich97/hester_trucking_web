import * as React from 'react';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import NextLink from 'next/link';
import Divider from '@mui/material/Divider';
import InboxIcon from '@mui/icons-material/Inbox';
import DraftsIcon from '@mui/icons-material/Drafts';
import {Drawer} from "@mui/material";

const Sidenav = () => {
    const [selectedIndex, setSelectedIndex] = React.useState(1);

    const handleListItemClick = (
        event: React.MouseEvent<HTMLDivElement, MouseEvent>,
        index: number,
    ) => {
        setSelectedIndex(index);
    };

    return (
        <Drawer variant='permanent' anchor='left' PaperProps={{sx: {minWidth: "10%"}}}>
            <List component="nav" aria-label="main mailbox folders">
                <ListItemButton
                    selected={selectedIndex === 0}
                    onClick={(event) => handleListItemClick(event, 0)}
                >
                    <ListItemIcon>
                        <InboxIcon/>
                    </ListItemIcon>
                    <NextLink href='/test' passHref>
                        Dashboard
                    </NextLink>
                </ListItemButton>
                <ListItemButton
                    selected={selectedIndex === 1}
                    onClick={(event) => handleListItemClick(event, 1)}
                >
                    <ListItemIcon>
                        <DraftsIcon/>
                    </ListItemIcon>
                    <NextLink href='/' passHref>
                        Customers
                    </NextLink>
                </ListItemButton>
            </List>
            <Divider/>
            <List component="nav" aria-label="secondary mailbox folder">
                <ListItemButton
                    selected={selectedIndex === 2}
                    onClick={(event) => handleListItemClick(event, 2)}
                >
                    <NextLink href='/test' passHref>
                        Loads
                    </NextLink>
                </ListItemButton>
                <ListItemButton
                    selected={selectedIndex === 3}
                    onClick={(event) => handleListItemClick(event, 3)}
                >
                    <NextLink href='/' passHref>
                        Invoices
                    </NextLink>
                </ListItemButton>
            </List>
        </Drawer>
    );
}

export default Sidenav;
