import React from "react";
import NextLink from "next/link";
import {toast} from "react-toastify";
import {
    CLOSED_JOB_REMATCH_WARNING,
    DAILY_PRINTED_WARNING,
    WEEKLY_PRINTED_WARNING,
} from "../constants/loadWarnings";

const warningToastStyle = {
    width: "98vw",
    margin: 0,
    borderRadius: 0,
    textAlign: "center" as const,
};

interface PrintedToastProps {
    Week: string;
    DriverID?: string;
    CustomerID?: string;
}

function DailyPrintedCustomToast({Week, DriverID, CustomerID}: PrintedToastProps) {
    const isDaily = Boolean(DriverID);
    return (
        <span>
            This load was created successfully, however the {isDaily ? "daily" : "weekly"} it was put on has already
            been printed.&nbsp;
            <NextLink
                href={{
                    pathname: isDaily ? "/dailies" : "/weeklies",
                    query: {forceExpand: DriverID ?? CustomerID, defaultWeek: Week},
                }}
                passHref
            >
                <a target="_blank" rel="noreferrer">
                    <b>Click here to open the {isDaily ? "daily" : "weekly"} in a new tab. </b>
                </a>
            </NextLink>
        </span>
    );
}

function JobClosedCustomToast({Week, CustomerID}: PrintedToastProps) {
    return (
        <span>
            This load was created successfully, however it matches a closed or paid out job. A new job has been made,
            please remember to close the weekly and invoice this new load.&nbsp;
            <NextLink
                href={{
                    pathname: "/weeklies",
                    query: {forceExpand: CustomerID, defaultWeek: Week},
                }}
                passHref
            >
                <a target="_blank" rel="noreferrer">
                    <b>Click here to open the weekly in a new tab. </b>
                </a>
            </NextLink>
        </span>
    );
}

/** Show load mutation warnings. Returns true if a warning toast was shown (suppress success toast). */
export function showLoadWarnings(warnings?: string[] | null): boolean {
    if (!warnings?.length) {
        return false;
    }

    if (warnings.includes(DAILY_PRINTED_WARNING)) {
        const warningIndex = warnings.indexOf(DAILY_PRINTED_WARNING);
        toast(
            <DailyPrintedCustomToast
                Week={warnings[warningIndex + 1] ?? ""}
                DriverID={warnings[warningIndex + 2]}
            />,
            {autoClose: 500000, type: "warning", position: "top-left", style: warningToastStyle},
        );
        return true;
    }

    if (warnings.includes(WEEKLY_PRINTED_WARNING)) {
        const warningIndex = warnings.indexOf(WEEKLY_PRINTED_WARNING);
        toast(
            <DailyPrintedCustomToast
                Week={warnings[warningIndex + 1] ?? ""}
                CustomerID={warnings[warningIndex + 2]}
            />,
            {autoClose: 500000, type: "warning", position: "top-left", style: warningToastStyle},
        );
        return true;
    }

    if (warnings.includes(CLOSED_JOB_REMATCH_WARNING)) {
        const warningIndex = warnings.indexOf(CLOSED_JOB_REMATCH_WARNING);
        toast(
            <JobClosedCustomToast
                Week={warnings[warningIndex + 1] ?? ""}
                CustomerID={warnings[warningIndex + 2]}
            />,
            {autoClose: 500000, type: "warning", position: "top-left", style: warningToastStyle},
        );
        return true;
    }

    return false;
}
