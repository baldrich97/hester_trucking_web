import type {ReactNode} from "react";
import type {UrlObject} from "url";
import NextLink from "next/link";
import Box from "@mui/material/Box";
import {tableTextLinkSx} from "../theme/muiShared";

type Props = {
    href: string | UrlObject;
    children: ReactNode;
    /** When true, navigate in the current tab instead of opening a new one. */
    sameTab?: boolean;
};

/** Cross-entity navigation: new tab by default, body-colored underline (matches GenericTable link cells). */
export default function TableEntityLink({href, children, sameTab = false}: Props) {
    return (
        <NextLink href={href} passHref legacyBehavior>
            <Box
                component="a"
                {...(sameTab ? {} : {target: "_blank", rel: "noopener noreferrer"})}
                sx={tableTextLinkSx}
            >
                {children}
            </Box>
        </NextLink>
    );
}
