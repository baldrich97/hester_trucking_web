import * as React from "react";
import Typography from "@mui/material/Typography";

function Copyright(props: any) {
    return (
        <Typography variant="body2" color="text.secondary" align="center" className={{}} {...props}>
            {'Copyright © '}
            {'AldrichSoftware '}
            {new Date().getFullYear()}
            {'.'}
        </Typography>
    );
}

export default Copyright;