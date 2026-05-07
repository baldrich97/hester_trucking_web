import React from "react";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import MuiLink from "@mui/material/Link";
import NextLink from "next/link";

export default function CarrierComplianceHub() {
    return (
        <Box sx={{maxWidth: 720}}>
            <Typography variant="h5" sx={{mb: 2}}>
                Carrier compliance
            </Typography>
            <Typography variant="body1" sx={{mb: 2}}>
                Use Form options to define which paperwork is required, how often it renews, and
                which items are fleet-wide (only required when an owner-operator entity has more than
                one truck on file). Owner-operator filings are shared across the entity (everyone under
                the same carrier, or a solo operator). Assign drivers to a carrier on each driver profile
                and keep carrier contact info current for compliance headers.
            </Typography>
            <Typography component="ul" sx={{pl: 3}}>
                <li>
                    <MuiLink component={NextLink} href="/drivers/form-options">
                        Form options
                    </MuiLink>
                </li>
                <li>
                    <MuiLink component={NextLink} href="/drivers/w2_forms">
                        W-2 forms grid
                    </MuiLink>
                </li>
                <li>
                    <MuiLink component={NextLink} href="/drivers/owner_forms">
                        Non-W-2 (owner operator) forms grid
                    </MuiLink>
                </li>
                <li>
                    <MuiLink component={NextLink} href="/carriers">
                        Carriers list
                    </MuiLink>
                </li>
            </Typography>
        </Box>
    );
}
