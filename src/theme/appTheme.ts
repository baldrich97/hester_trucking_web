import {createTheme} from "@mui/material/styles";

/**
 * Global theme: one primary blue, semantic colors for actions, no ALL-CAPS buttons.
 */
export function createAppTheme() {
    return createTheme({
        palette: {
            primary: {
                main: "#1565C0",
                dark: "#0d47a1",
                light: "#42a5f5",
                contrastText: "#fff",
            },
            secondary: {
                main: "#757575",
                dark: "#616161",
                light: "#9e9e9e",
                contrastText: "#fff",
            },
            success: {
                main: "#43a047",
                dark: "#2e7d32",
                light: "#81c784",
                contrastText: "#fff",
            },
            warning: {
                main: "#fb8c00",
                dark: "#ef6c00",
                light: "#ffb74d",
                contrastText: "#fff",
            },
            error: {
                main: "#d32f2f",
                dark: "#c62828",
                light: "#ef5350",
                contrastText: "#fff",
            },
            info: {
                main: "#0288d1",
                dark: "#01579b",
                light: "#29b6f6",
                contrastText: "#fff",
            },
        },
        shape: {
            borderRadius: 8,
        },
        components: {
            MuiButton: {
                styleOverrides: {
                    root: {
                        textTransform: "none",
                        padding: 5
                    },
                    contained: {
                        boxShadow: "none",
                        color: "#fff",
                        "&:hover": {
                            boxShadow: "none",
                            color: "#fff",
                        },
                        "&:active": {
                            color: "#fff",
                        },
                    },
                    containedPrimary: ({theme}) => ({
                        "&:hover": {backgroundColor: theme.palette.primary.dark},
                        "&:active": {backgroundColor: theme.palette.primary.dark},
                    }),
                    containedSecondary: ({theme}) => ({
                        "&:hover": {backgroundColor: theme.palette.secondary.dark},
                        "&:active": {backgroundColor: theme.palette.secondary.dark},
                    }),
                    containedSuccess: ({theme}) => ({
                        "&:hover": {backgroundColor: theme.palette.success.dark},
                        "&:active": {backgroundColor: theme.palette.success.dark},
                    }),
                    containedError: ({theme}) => ({
                        "&:hover": {backgroundColor: theme.palette.error.dark},
                        "&:active": {backgroundColor: theme.palette.error.dark},
                    }),
                    containedWarning: ({theme}) => ({
                        "&:hover": {backgroundColor: theme.palette.warning.dark},
                        "&:active": {backgroundColor: theme.palette.warning.dark},
                    }),
                    containedInfo: ({theme}) => ({
                        "&:hover": {backgroundColor: theme.palette.info.dark},
                        "&:active": {backgroundColor: theme.palette.info.dark},
                    }),
                },
            },
            MuiTable: {
                styleOverrides: {
                    root: ({theme}) => ({
                        // Underline/text-link styling only for plain anchors, not Buttons (anchors get .MuiButtonBase-root).
                        "& tbody td a:not(.MuiButtonBase-root)": {
                            color: theme.palette.text.primary,
                            textDecoration: "underline",
                        },
                        "& tbody td a:not(.MuiButtonBase-root):visited": {
                            color: theme.palette.text.primary,
                        },
                    }),
                },
            },
        },
    });
}
