// src/pages/_app.tsx
import {httpBatchLink} from "@trpc/client/links/httpBatchLink";
import {loggerLink} from "@trpc/client/links/loggerLink";
import {withTRPC} from "@trpc/next";
import {SessionProvider} from "next-auth/react";
import type {AppType} from "next/dist/shared/lib/utils";
import superjson from "superjson";
import type {AppRouter} from "../server/router";
import "../styles/globals.css";
import '@fontsource/roboto/300.css';
import '@fontsource/roboto/400.css';
import '@fontsource/roboto/500.css';
import '@fontsource/roboto/700.css';
import Toolbar from "@mui/material/Toolbar";
import Container from "@mui/material/Container";
import Box from "@mui/material/Box";
import * as React from "react";
import Sidenav from "../components/layout/Sidenav";
import AppBar from "../components/layout/AppBar";
import CssBaseline from "@mui/material/CssBaseline";
import {createTheme, ThemeProvider} from '@mui/material/styles';
import Copyright from "../components/layout/Copyright";

const mdTheme = createTheme();

const MyApp: AppType = ({
                            Component,
                            pageProps: {session, ...pageProps},
                        }) => {
    const [open, setOpen] = React.useState(true);
    const toggleDrawer = () => {
        setOpen(!open);
    };
    return (
        <SessionProvider session={session}>
            <ThemeProvider theme={mdTheme}>
                <Box sx={{display: 'flex'}}>
                    <CssBaseline/>
                    <AppBar toggleDrawer={toggleDrawer} open={open}/>
                    <Sidenav toggleDrawer={toggleDrawer} open={open}/>
                    <Box
                        component="main"
                        sx={{
                            backgroundColor: (theme) =>
                                theme.palette.mode === 'light'
                                    ? theme.palette.grey[100]
                                    : theme.palette.grey[900],
                            flexGrow: 1,
                            height: '100vh',
                            overflow: 'auto',
                        }}
                    >
                        <Toolbar/>
                        <Container maxWidth={false} sx={{mt: 4, mb: 4}}>
                            <Component {...pageProps}/>
                        </Container>
                        <Copyright sx={{
                            pt: 4,
                            position: 'fixed',
                            bottom: 0,
                            width: '100%',
                            height: 60,
                            textAlign: 'right',
                            right: 5
                        }}/>
                    </Box>
                </Box>
            </ThemeProvider>
        </SessionProvider>
    );
};

export default withTRPC<AppRouter>({
    config() {

      /*  if (typeof window !== 'undefined') {
            // during client requests
            return {
                transformer: superjson, // optional - adds superjson serialization
                url: '/api/trpc',
            };
        }
*/
        /**
         * If you want to use SSR, you need to use the server's full URL
         * @link https://trpc.io/docs/ssr
         */
        const url = process.env.NEXTAUTH_URL
            ? `https://${process.env.NEXTAUTH_URL}/api/trpc`
            : 'http://localhost:3000/api/trpc';

        return {
            links: [
                loggerLink({
                    enabled: (opts) =>
                        process.env.NODE_ENV === "development" ||
                        (opts.direction === "down" && opts.result instanceof Error),
                }),
                httpBatchLink({url}),
            ],
            url,
            transformer: superjson,
            headers: {
                // optional - inform server that it's an ssr request
                'x-ssr': '1',
            },
            /**
             * @link https://react-query.tanstack.com/reference/QueryClient
             */
            // queryClientConfig: { defaultOptions: { queries: { staleTime: 60 } } },
        };
    },
    /**
     * @link https://trpc.io/docs/ssr
     */
    ssr: false, //setting this to true breaks basic trpc queries for some reason
})(MyApp);
