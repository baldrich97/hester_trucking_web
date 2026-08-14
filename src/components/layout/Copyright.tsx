import * as React from "react";
import Typography from "@mui/material/Typography";
import packageJson from "../../../package.json";

function Copyright(props: any) {
    return (
        <Typography variant="body2" color="text.secondary" align="right" noWrap {...props}>
            {"Copyright © "}
            {"AldrichSoftware "}
            {new Date().getFullYear()}
            {". "}
            <span style={{opacity: 0.7}}>v{packageJson.version}</span>
        </Typography>
    );
}

export default Copyright;
