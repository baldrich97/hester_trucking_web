import type {SxProps, Theme} from "@mui/material/styles";

/** Compact icon / text buttons in dailies & weeklies toolbars. */
export const calendarNavButtonSx: SxProps<Theme> = {
    minHeight: 30,
    maxHeight: 30,
    minWidth: 30,
    maxWidth: 30,
};

export const calendarTodayButtonSx: SxProps<Theme> = {
    minHeight: 30,
    maxHeight: 30,
    minWidth: 50,
    maxWidth: 50,
};

/** Prev/next week icon buttons (slightly wider than expand). */
export const calendarChevronNavSx: SxProps<Theme> = {
    minHeight: 30,
    maxHeight: 30,
    minWidth: 40,
    maxWidth: 40,
};

export const calendarWeekLabelSx: SxProps<Theme> = {
    minHeight: 30,
    maxHeight: 30,
    minWidth: 250,
    maxWidth: 250,
};

/** Text links: body color + underline; no default blue / purple visited. */
export const tableTextLinkSx: SxProps<Theme> = {
    color: "text.primary",
    textDecoration: "underline",
    "&:visited": {color: "text.primary"},
    "&:hover": {color: "text.primary"},
};

/**
 * Nav controls in table cells that must read as buttons (bold white on filled BG), not underline text links.
 * Use with contained Buttons, including anchors used with NextLink.
 */
export const tableContainedNavButtonSx: SxProps<Theme> = {
    fontWeight: 700,
    fontSize: 15,
    textDecoration: "none !important",
    color: "#fff !important",
    "&:visited": {
        color: "#fff !important",
    },
    "&:hover": {
        color: "#fff !important",
    },
};
