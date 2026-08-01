import ChevronRight from "@mui/icons-material/ChevronRight";
import ExpandMore from "@mui/icons-material/ExpandMore";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Chip from "@mui/material/Chip";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";
import Grid2 from "@mui/material/Unstable_Grid2";
import TableEntityLink from "../../elements/TableEntityLink";
import type {FormExpiryCadence} from "@prisma/client";
import React, {useMemo, useState} from "react";
import {trpc} from "../../utils/trpc";
import LoadingModal from "../../elements/LoadingModal";
import FilterMultiAutocomplete from "../../elements/FilterMultiAutocomplete";
import {calendarNavButtonSx} from "../../theme/muiShared";

type ExpiringRow = {
    formId: number;
    formName: string;
    filed: string;
    endDate: string;
    cadence: FormExpiryCadence;
    required: boolean;
    filer: string | null;
    driverId: number;
    driverName: string;
};

type W2Group = {driverId: number; title: string; rows: ExpiringRow[]};
type OoGroup = {entityKey: string; title: string; rows: ExpiringRow[]};

function fmtLocal(iso: string): string {
    return new Date(iso).toLocaleDateString();
}

function cadenceLabel(c: FormExpiryCadence): string {
    return c.replace(/_/g, " ");
}

function CollapsibleBlock({
    blockKey,
    title,
    subtitle,
    expanded,
    onToggle,
    children,
}: {
    blockKey: string;
    title: React.ReactNode;
    subtitle?: string;
    expanded: boolean;
    onToggle: () => void;
    children: React.ReactNode;
}) {
    return (
        <Paper key={blockKey} sx={{mb: 1.5, overflow: "hidden"}}>
            <Grid2 container columnSpacing={1} alignItems="center" sx={{py: 0.5, px: 0.5}}>
                <Grid2 xs="auto">
                    <Button
                        variant="text"
                        size="small"
                        sx={calendarNavButtonSx}
                        color="inherit"
                        onClick={onToggle}
                        aria-expanded={expanded}
                    >
                        {expanded ? (
                            <ExpandMore sx={{fontSize: 30}} />
                        ) : (
                            <ChevronRight sx={{fontSize: 30}} />
                        )}
                    </Button>
                </Grid2>
                <Grid2 xs>
                    <Typography variant="subtitle1" component="div" sx={{fontWeight: 600}}>
                        {title}
                    </Typography>
                    {subtitle ? (
                        <Typography variant="body2" color="text.secondary">
                            {subtitle}
                        </Typography>
                    ) : null}
                </Grid2>
            </Grid2>
            {expanded ? (
                <Box sx={{px: 2, pb: 2}}>{children}</Box>
            ) : null}
        </Paper>
    );
}

export default function DriverFormsExpiringSoon() {
    const {data, isLoading, refetch, isFetching} = trpc.useQuery(["compliance.driverFormsExpiringSoon", {}], {
        staleTime: 60 * 1000,
    });

    const w2Keys = useMemo(() => data?.w2Groups.map((g) => `w2-${g.driverId}`) ?? [], [data?.w2Groups]);
    const ooKeys = useMemo(() => data?.ooGroups.map((g) => `oo-${g.entityKey}`) ?? [], [data?.ooGroups]);

    /** Omitted key means expanded (default open, like dailies). */
    const [open, setOpen] = useState<Record<string, boolean>>({});

    const toggle = (k: string) => setOpen((p) => ({...p, [k]: !(p[k] ?? true)}));

    const setAll = (keys: string[], value: boolean) => {
        setOpen((p) => {
            const n = {...p};
            for (const k of keys) n[k] = value;
            return n;
        });
    };

    const allKeys = [...w2Keys, ...ooKeys];
    const allExpanded = allKeys.length > 0 && allKeys.every((k) => open[k] !== false);

    const filterOptions = useMemo(() => {
        const w2 =
            data?.w2Groups.map((g) => ({
                key: `w2-${g.driverId}`,
                label: g.title,
            })) ?? [];
        const oo =
            data?.ooGroups.map((g) => ({
                key: `oo-${g.entityKey}`,
                label: g.title,
            })) ?? [];
        return [...w2, ...oo].sort((a, b) => a.label.localeCompare(b.label, undefined, {sensitivity: "base"}));
    }, [data?.w2Groups, data?.ooGroups]);

    const [selectedFilters, setSelectedFilters] = useState<Array<{key: string; label: string}>>([]);

    const filteredW2Groups = useMemo(() => {
        const groups = data?.w2Groups ?? [];
        if (selectedFilters.length === 0) return groups;
        const keys = new Set(selectedFilters.map((o) => o.key));
        return groups.filter((g) => keys.has(`w2-${g.driverId}`));
    }, [data?.w2Groups, selectedFilters]);

    const filteredOoGroups = useMemo(() => {
        const groups = data?.ooGroups ?? [];
        if (selectedFilters.length === 0) return groups;
        const keys = new Set(selectedFilters.map((o) => o.key));
        return groups.filter((g) => keys.has(`oo-${g.entityKey}`));
    }, [data?.ooGroups, selectedFilters]);

    const renderTable = (rows: ExpiringRow[], showDriverColumn: boolean) => (
        <Table size="small">
            <TableHead>
                <TableRow>
                    <TableCell>Form</TableCell>
                    {showDriverColumn ? <TableCell>Driver</TableCell> : null}
                    <TableCell>Filed</TableCell>
                    <TableCell>Expires</TableCell>
                    <TableCell>Cadence</TableCell>
                    <TableCell>Required</TableCell>
                    <TableCell>Filer</TableCell>
                </TableRow>
            </TableHead>
            <TableBody>
                {rows.map((r) => (
                    <TableRow key={`${r.driverId}-${r.formId}-${r.filed}`}>
                        <TableCell>{r.formName}</TableCell>
                        {showDriverColumn ? <TableCell>{r.driverName}</TableCell> : null}
                        <TableCell>{r.formId === -1000 ? "—" : fmtLocal(r.filed)}</TableCell>
                        <TableCell>{fmtLocal(r.endDate)}</TableCell>
                        <TableCell>{cadenceLabel(r.cadence)}</TableCell>
                        <TableCell>
                            {r.required ? (
                                <Chip label="Yes" size="small" color="primary" variant="outlined" />
                            ) : (
                                <Chip label="No" size="small" variant="outlined" />
                            )}
                        </TableCell>
                        <TableCell>{r.filer?.trim() ? r.filer : "—"}</TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    const renderW2Section = (groups: W2Group[]) => (
        <Box sx={{mb: 3}}>
            <Typography variant="h6" sx={{mb: 1}}>
                W-2 drivers
            </Typography>
            {groups.map((g) => {
                const k = `w2-${g.driverId}`;
                const soonest = g.rows[0]?.endDate;
                return (
                    <CollapsibleBlock
                        key={k}
                        blockKey={k}
                        title={
                            <TableEntityLink href={`/drivers/${g.driverId}?tab=forms`} sameTab>
                                {g.title}
                            </TableEntityLink>
                        }
                        subtitle={soonest ? `Soonest: ${fmtLocal(soonest)}` : undefined}
                        expanded={open[k] !== false}
                        onToggle={() => toggle(k)}
                    >
                        {renderTable(g.rows, false)}
                    </CollapsibleBlock>
                );
            })}
        </Box>
    );

    const renderOoSection = (groups: OoGroup[]) => (
        <Box>
            <Typography variant="h6" sx={{mb: 1}}>
                Owner-operators
            </Typography>
            {groups.map((g) => {
                const k = `oo-${g.entityKey}`;
                const soonest = g.rows[0]?.endDate;
                // Carrier entities (`c:…`): filings are scoped to the carrier; hide per-driver column.
                // Solo OO (`s:…`): one driver row — show who the filing sits on.
                const showDriverColumn = g.entityKey.startsWith("s:");
                const profileDriverId = g.entityKey.startsWith("s:")
                    ? parseInt(g.entityKey.slice(2), 10)
                    : g.rows[0]?.driverId;
                const titleNode = profileDriverId ? (
                    <TableEntityLink href={`/drivers/${profileDriverId}?tab=forms`} sameTab>
                        {g.title}
                    </TableEntityLink>
                ) : (
                    g.title
                );
                return (
                    <CollapsibleBlock
                        key={k}
                        blockKey={k}
                        title={titleNode}
                        subtitle={soonest ? `Soonest: ${fmtLocal(soonest)}` : undefined}
                        expanded={open[k] !== false}
                        onToggle={() => toggle(k)}
                    >
                        {renderTable(g.rows, showDriverColumn)}
                    </CollapsibleBlock>
                );
            })}
        </Box>
    );

    return (
        <Box sx={{width: "100%"}}>
            <LoadingModal isOpen={isLoading || isFetching} />
            <Typography variant="h4" gutterBottom>
                Forms expiring soon
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{mb: 2}}>
                On-file forms and driver licenses whose compliance end date is within the next {data?.daysAhead ?? 30}&nbsp;
                days (still compliant today). Update filings from a driver&apos;s&nbsp;
                <strong>Forms</strong> tab on their profile, or from the fleet&nbsp;
                <TableEntityLink href="/drivers/w2_forms">W2 Forms</TableEntityLink>
                &nbsp;or&nbsp;
                <TableEntityLink href="/drivers/owner_forms">OO Forms</TableEntityLink>
                &nbsp;pages.
            </Typography>
            <Box sx={{mb: 2}}>
                <FilterMultiAutocomplete
                    label="Drivers / operators"
                    options={filterOptions}
                    value={selectedFilters}
                    onChange={setSelectedFilters}
                    getOptionLabel={(o) => o.label}
                    isOptionEqualToValue={(a, b) => a.key === b.key}
                    placeholder="Search drivers or operators…"
                />
            </Box>
            <Box sx={{mb: 2, display: "flex", gap: 1, flexWrap: "wrap"}}>
                <Button
                    size="small"
                    variant="outlined"
                    disabled={isFetching}
                    onClick={() => void refetch()}
                >
                    Refresh
                </Button>
                {allKeys.length > 0 ? (
                    <Button size="small" variant="text" onClick={() => setAll(allKeys, !allExpanded)}>
                        {allExpanded ? "Collapse all" : "Expand all"}
                    </Button>
                ) : null}
            </Box>
            {!isLoading && data && filteredW2Groups.length === 0 && filteredOoGroups.length === 0 ? (
                <Paper sx={{p: 3}}>
                    <Typography>
                        {selectedFilters.length > 0
                            ? "No matching drivers or operators for the selected filter."
                            : `No forms or licenses expiring in the next ${data.daysAhead} days.`}
                    </Typography>
                </Paper>
            ) : null}
            {data && filteredW2Groups.length > 0 ? renderW2Section(filteredW2Groups) : null}
            {data && filteredOoGroups.length > 0 ? renderOoSection(filteredOoGroups) : null}
        </Box>
    );
}
