import type {ReactNode} from "react";
import type {UrlObject} from "url";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import {tableTextLinkSx} from "../theme/muiShared";

type Props = {
    href: string | UrlObject;
    children: ReactNode;
};

/** Cross-entity navigation: new tab, body-colored underline (matches GenericTable link cells). */
export default function TableEntityLink({href, children}: Props) {
    return (
        <NextLink href={href} passHref legacyBehavior>
            <Box
                component="a"
                target="_blank"
                rel="noopener noreferrer"
                sx={tableTextLinkSx}
            >
                {children}
            </Box>
        </NextLink>
    );
}
