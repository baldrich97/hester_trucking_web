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
            },
            warning: {
                main: "#fb8c00",
                dark: "#ef6c00",
                light: "#ffb74d",
            },
            error: {
                main: "#d32f2f",
                dark: "#c62828",
                light: "#ef5350",
            },
            info: {
                main: "#0288d1",
                dark: "#01579b",
                light: "#29b6f6",
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
                    },
                },
            },
            MuiTable: {
                styleOverrides: {
                    root: ({theme}) => ({
                        "& tbody td a:not(:has(.MuiButtonBase-root))": {
                            color: theme.palette.text.primary,
                            textDecoration: "underline",
                        },
                        "& tbody td a:not(:has(.MuiButtonBase-root)):visited": {
                            color: theme.palette.text.primary,
                        },
                    }),
                },
            },
        },
    });
}
