import {
  CompleteFormOptions,
  DriverFormsModel,
  DriversModel,
} from "../../../prisma/zod";
import React, { useMemo, useState } from "react";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import Grid2 from "@mui/material/Unstable_Grid2";
import {
  Box,
  Button,
  Checkbox,
  IconButton,
  Tooltip,
  Typography,
} from "@mui/material";
import { z } from "zod";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import ExpandMore from "@mui/icons-material/ExpandMore";
import ChevronRight from "@mui/icons-material/ChevronRight";
import type { Carriers, States, Trucks } from "@prisma/client";
import { calendarNavButtonSx } from "../../theme/muiShared";
import {
  collectEntityTrucks,
  driverMissingRequiredForm,
  entityDistinctTruckCount,
  getDriverFormRecord,
  groupOoDriversByEntity,
  isDriverFormRecordCompliant,
  isFormSatisfiedForDriver,
  isFormSatisfiedForOoEntity,
  isOoFormRequired,
  ooEntityMissingRequiredForm,
  ooEntityTrucksVitalOk,
  primaryDriverIdForEntity,
  truckOoVitalMissingReasons,
  truckOoVitalsOk,
  type DriverComplianceShape,
  type FormOptionComplianceShape,
} from "../../utils/driverFormCompliance";
import {
  cadenceTooltipDetail,
  fmtDate,
} from "../../utils/driverFormFilingUtils";
import TableEntityLink from "../../elements/TableEntityLink";
import FilterMultiAutocomplete from "../../elements/FilterMultiAutocomplete";
import DriverFormFilingModal from "./DriverFormFilingModal";
import { useDriverFormFiling } from "../../hooks/useDriverFormFiling";
import { toast } from "react-toastify";

const DataModel = DriversModel.extend({
  DriverForms: z.array(DriverFormsModel).optional(),
});

export type DriverFormsDataType = z.infer<typeof DataModel> & {
  TrucksDriven?: { TruckID: number; Trucks: Trucks | null }[];
  Carriers?: (Carriers & { States: States | null }) | null;
  States?: States | null;
};

const OO_LEFT_COL = {
  flex: "0 0 300px",
  minWidth: 260,
  maxWidth: 400,
} as const;
const OO_STATUS_W = 40;
const OO_CHEVRON_W = 44;

function formatDriverAddress(d: DriverFormsDataType): string {
  const abbr = d.States?.Abbreviation ?? "";
  const cityLine = [d.City, abbr, d.ZIP]
    .filter((x) => x && String(x).trim())
    .join(" ");
  return [d.Street, cityLine].filter((x) => x && String(x).trim()).join(" · ");
}

function formatCarrierAddress(c: Carriers & { States: States | null }): string {
  const abbr = c.States?.Abbreviation ?? "";
  const cityLine = [c.City, abbr, c.ZIP]
    .filter((x) => x && String(x).trim())
    .join(" ");
  return [c.Street, cityLine].filter((x) => x && String(x).trim()).join(" · ");
}

function driverDisplayName(d: DriverFormsDataType): string {
  return `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim() || `Driver ${d.ID}`;
}

function ooEntityLabel(drivers: DriverFormsDataType[]): string {
  const lead = drivers[0];
  if (!lead) return "Operator";
  return lead.Carriers?.Name?.trim() || driverDisplayName(lead) || "Operator";
}

const Driver_Forms = ({
  data,
  all_forms,
  mode,
}: {
  data: DriverFormsDataType[];
  all_forms: CompleteFormOptions[];
  mode: "w2" | "oo";
}) => {
  const compareLabels = (a: string, b: string): number =>
    a.localeCompare(b, undefined, { sensitivity: "base" });
  const driverShapes: DriverComplianceShape[] = useMemo(
    () =>
      data.map((d) => ({
        ID: d.ID,
        CarrierID: d.CarrierID ?? null,
        OwnerOperator: d.OwnerOperator,
        DriverForms: (d.DriverForms ?? []).map((df) => ({
          Form: df.Form,
          Expiration: df.Expiration
            ? new Date(df.Expiration as unknown as string)
            : null,
          Created: new Date(df.Created as unknown as string),
          CarrierID: (df as { CarrierID?: number | null }).CarrierID ?? null,
          Filer: (df as { Filer?: string | null }).Filer ?? null,
        })),
        TrucksDriven: d.TrucksDriven,
      })),
    [data],
  );
  const formOptShapes: FormOptionComplianceShape[] = useMemo(
    () =>
      all_forms.map((f) => ({
        Form: f.Form,
        FleetWide: f.FleetWide,
        ExpiryCadence: f.ExpiryCadence,
        ValidityMonths: f.ValidityMonths ?? null,
        W2Visible: f.W2Visible,
        OOVisible: f.OOVisible,
        W2Required: f.W2Required,
        OORequired: f.OORequired,
      })),
    [all_forms],
  );
  const shapeFor = (id: number) => driverShapes.find((s) => s.ID === id)!;
  const findFilingHolderDriverId = (
    entityDrivers: DriverFormsDataType[],
    form: CompleteFormOptions,
    entityCarrierId: number | null | undefined,
  ): number | null => {
    const carrierScope = entityCarrierId != null && entityCarrierId > 0;
    for (const d of entityDrivers) {
      const r = getDriverFormRecord(shapeFor(d.ID).DriverForms, form.Form);
      if (
        !r ||
        !isDriverFormRecordCompliant(r, form.ExpiryCadence, form.ValidityMonths)
      ) {
        continue;
      }
      if (!carrierScope) return d.ID;
      const cid = r.CarrierID;
      if (cid === entityCarrierId || cid == null || cid === undefined) {
        return d.ID;
      }
    }
    return null;
  };
  const filing = useDriverFormFiling({
    mode,
    driverShapes,
    formOptShapes,
    shapeFor,
    findFilingHolderDriverId,
  });
  const [ooExpanded, setOoExpanded] = useState<Record<string, boolean>>({});
  const [ooExpandAllOpen, setOoExpandAllOpen] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [selectedDriverFilters, setSelectedDriverFilters] = useState<
    Array<{ id: number; label: string }>
  >([]);
  const [selectedEntityFilters, setSelectedEntityFilters] = useState<
    Array<{ key: string; label: string }>
  >([]);
  const pdfKind = mode === "w2" ? "w2" : "oo";
  const downloadPdf = () => {
    if (pdfDownloading) return;
    setPdfDownloading(true);
    window.setTimeout(() => setPdfDownloading(false), 2000);
    toast.info("Generating PDF...", { autoClose: 2000, type: "info" });
    const element = document.createElement("a");
    element.href = `/api/getPDF/driver-forms/${pdfKind}`;
    element.download = `driver-forms-${pdfKind}.pdf`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };
  const ooEntityEntries = useMemo(() => {
    if (mode !== "oo") return [] as [string, DriverFormsDataType[]][];
    const m = groupOoDriversByEntity(data);
    const entries = Array.from(m.entries());
    entries.sort((a, b) => {
      const aLead = a[1][0];
      const bLead = b[1][0];
      const aLabel =
        aLead?.Carriers?.Name?.trim() ||
        `${aLead?.FirstName ?? ""} ${aLead?.LastName ?? ""}`.trim() ||
        "";
      const bLabel =
        bLead?.Carriers?.Name?.trim() ||
        `${bLead?.FirstName ?? ""} ${bLead?.LastName ?? ""}`.trim() ||
        "";
      const byLabel = compareLabels(aLabel, bLabel);
      if (byLabel !== 0) return byLabel;
      return (aLead?.ID ?? 0) - (bLead?.ID ?? 0);
    });
    return entries;
  }, [data, mode]);
  const w2DriverFilterOptions = useMemo(() => {
    if (mode !== "w2") return [] as Array<{ id: number; label: string }>;
    return data
      .map((d) => ({ id: d.ID, label: driverDisplayName(d) }))
      .sort((a, b) => compareLabels(a.label, b.label));
  }, [data, mode]);
  const filteredW2Data = useMemo(() => {
    if (mode !== "w2" || selectedDriverFilters.length === 0) return data;
    const ids = new Set(selectedDriverFilters.map((o) => o.id));
    return data.filter((d) => ids.has(d.ID));
  }, [data, mode, selectedDriverFilters]);
  const ooEntityFilterOptions = useMemo(
    () =>
      ooEntityEntries.map(([key, drivers]) => ({
        key,
        label: ooEntityLabel(drivers),
      })),
    [ooEntityEntries],
  );
  const filteredOoEntityEntries = useMemo(() => {
    if (selectedEntityFilters.length === 0) return ooEntityEntries;
    const keys = new Set(selectedEntityFilters.map((o) => o.key));
    return ooEntityEntries.filter(([k]) => keys.has(k));
  }, [ooEntityEntries, selectedEntityFilters]);
  const renderFormHeaderRow = () => (
    <Grid2 container alignItems="flex-end" sx={{ mb: 1 }}>
      {mode === "oo" ? (
        <Grid2 sx={{ width: OO_STATUS_W + OO_CHEVRON_W, flexShrink: 0 }} />
      ) : null}
      <Grid2 sx={OO_LEFT_COL}>
        <Typography fontWeight="bold">
          {mode === "oo" ? "Carrier / operator" : "Driver"}
        </Typography>
        {mode === "w2" ? (
          <>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Address
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
            >
              Phone
            </Typography>
          </>
        ) : null}
      </Grid2>
      <Grid2 xs container spacing={0} sx={{ display: "flex" }}>
        {all_forms.map((form) => (
          <Grid2 key={form.ID} xs sx={{ minWidth: 0, textAlign: "center" }}>
            <Typography
              fontWeight="bold"
              variant="body2"
              noWrap
              title={form.Forms.DisplayName}
            >
              {form.Forms.DisplayName}
            </Typography>
          </Grid2>
        ))}
      </Grid2>
    </Grid2>
  );
  const renderOoEntity = (
    entityKey: string,
    entityDrivers: DriverFormsDataType[],
  ) => {
    const primaryId = primaryDriverIdForEntity(entityDrivers);
    const primary = entityDrivers.find((d) => d.ID === primaryId)!;
    const carrier = primary.Carriers ?? null;
    const entityCarrierId = primary.CarrierID ?? null;
    const entityShapes = entityDrivers.map((d) => shapeFor(d.ID));
    const truckCount = entityDistinctTruckCount(entityDrivers);
    const trucksMap = collectEntityTrucks(entityDrivers);
    const formsBad = ooEntityMissingRequiredForm(
      entityShapes,
      formOptShapes,
      truckCount,
      entityCarrierId,
    );
    const trucksBad = !ooEntityTrucksVitalOk(entityDrivers);
    const entityBad = formsBad || trucksBad;
    const expanded = ooExpanded[entityKey] ?? false;
    const setExpanded = (v: boolean) =>
      setOoExpanded((prev) => ({ ...prev, [entityKey]: v }));
    const missingFormLabels: string[] = [];
    for (const opt of formOptShapes) {
      if (!isOoFormRequired(opt, truckCount)) continue;
      if (!isFormSatisfiedForOoEntity(entityShapes, entityCarrierId, opt)) {
        const label =
          all_forms.find((f) => f.Form === opt.Form)?.Forms.DisplayName ??
          `Form ${opt.Form}`;
        missingFormLabels.push(label);
      }
    }
    const truckTooltipLines: string[] = [];
    for (const t of Array.from(trucksMap.values())) {
      if (truckOoVitalsOk(t)) continue;
      const miss = truckOoVitalMissingReasons(t);
      truckTooltipLines.push(`${t.Name}: missing ${miss.join(", ")}`);
    }
    const entityTooltipParts: string[] = [];
    if (missingFormLabels.length) {
      entityTooltipParts.push(`Forms: ${missingFormLabels.join("; ")}`);
    }
    if (truckTooltipLines.length) {
      entityTooltipParts.push(`Trucks: ${truckTooltipLines.join(" · ")}`);
    }
    if (!entityTooltipParts.length) {
      entityTooltipParts.push("Entity forms and trucks look complete.");
    }
    const titleLines: { bold?: boolean; text: string }[] = [];
    if (carrier) {
      titleLines.push({ bold: true, text: carrier.Name });
      if (carrier.ContactName?.trim()) {
        titleLines.push({ text: carrier.ContactName });
      }
      const addr = formatCarrierAddress(carrier);
      if (addr) titleLines.push({ text: addr });
      if (carrier.Phone?.trim()) titleLines.push({ text: carrier.Phone });
    } else {
      const name =
        `${primary.FirstName ?? ""} ${primary.LastName ?? ""}`.trim();
      titleLines.push({ bold: true, text: name || "Operator" });
      const addr = formatDriverAddress(primary);
      if (addr) titleLines.push({ text: addr });
      if (primary.Phone?.trim()) titleLines.push({ text: primary.Phone });
    }
    const renderEntityFormCheckboxes = () => (
      <Box
        sx={{ flex: 1, display: "flex", minWidth: 0, alignItems: "flex-start" }}
      >
        {all_forms.map((form) => {
          const fShape = formOptShapes.find((o) => o.Form === form.Form)!;
          const satisfied = isFormSatisfiedForOoEntity(
            entityShapes,
            entityCarrierId,
            fShape,
          );
          const localOnPrimary = getDriverFormRecord(
            shapeFor(primaryId).DriverForms,
            form.Form,
          );
          const requiredOo = isOoFormRequired(fShape, truckCount);
          const compliantPrimary =
            localOnPrimary &&
            isDriverFormRecordCompliant(
              localOnPrimary,
              form.ExpiryCadence,
              form.ValidityMonths,
            );
          const showError =
            (requiredOo && !satisfied) ||
            (Boolean(localOnPrimary) && !compliantPrimary);
          let recordForTooltip = localOnPrimary;
          if (!localOnPrimary && satisfied) {
            for (const d of entityDrivers) {
              const r = getDriverFormRecord(
                shapeFor(d.ID).DriverForms,
                form.Form,
              );
              if (
                r &&
                isDriverFormRecordCompliant(
                  r,
                  form.ExpiryCadence,
                  form.ValidityMonths,
                )
              ) {
                recordForTooltip = r;
                break;
              }
            }
          }
          const tooltipParts: string[] = [];
          if (recordForTooltip) {
            const filed = new Date(recordForTooltip.Created);
            tooltipParts.push(`Filed: ${fmtDate(filed)}`);
            tooltipParts.push(
              cadenceTooltipDetail(
                form.ExpiryCadence,
                filed,
                recordForTooltip.Expiration,
                form.ValidityMonths,
              ),
            );
            if (recordForTooltip.Filer?.trim()) {
              tooltipParts.push(`Filer: ${recordForTooltip.Filer.trim()}`);
            }
            if (!localOnPrimary && satisfied) {
              tooltipParts.push("(Another driver in this entity)");
            }
          }
          return (
            <Box
              key={form.ID}
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                justifyContent: "center",
              }}
            >
              <Tooltip title={tooltipParts.join(" · ")}>
                <Checkbox
                  checked={satisfied}
                  disabled={filing.isSaving}
                  onClick={() =>
                    filing.handleCheckboxClickOo(entityDrivers, form)
                  }
                  color={showError ? "error" : "primary"}
                />
              </Tooltip>
            </Box>
          );
        })}
      </Box>
    );
    return (
      <Box
        key={entityKey}
        sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.5 }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 0 }}>
          <Box
            sx={{
              width: OO_STATUS_W,
              flexShrink: 0,
              display: "flex",
              justifyContent: "center",
              pt: 1,
            }}
          >
            {entityBad ? (
              <Tooltip title={entityTooltipParts.join(" ")}>
                <CloseIcon color="error" />
              </Tooltip>
            ) : (
              <Tooltip title={entityTooltipParts.join(" ")}>
                <CheckIcon color="success" />
              </Tooltip>
            )}
          </Box>
          <Box sx={{ width: OO_CHEVRON_W, flexShrink: 0 }}>
            <IconButton
              size="small"
              sx={calendarNavButtonSx}
              color="inherit"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
            >
              {expanded ? (
                <ExpandMore sx={{ fontSize: 30 }} />
              ) : (
                <ChevronRight sx={{ fontSize: 30 }} />
              )}
            </IconButton>
          </Box>
          <Box sx={{ ...OO_LEFT_COL, pt: 0.5 }}>
            {titleLines.map((line, i) => (
              <Typography
                key={i}
                variant={line.bold ? "subtitle1" : "body2"}
                fontWeight={line.bold ? 700 : 400}
              >
                {line.text}
              </Typography>
            ))}
            {carrier ? (
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ mt: 0.5, display: "block" }}
              >
                Drivers:{" "}
                {entityDrivers
                  .map((d) => `${d.FirstName ?? ""} ${d.LastName ?? ""}`.trim())
                  .join(", ")}
              </Typography>
            ) : null}
            {carrier ? (
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                Filing apply to the carrier as a whole.
              </Typography>
            ) : null}
            <Typography variant="caption" sx={{ mt: 0.5, display: "block" }}>
              <TableEntityLink href={`/drivers/${primaryId}?tab=forms`} sameTab>
                Edit forms for this entity
              </TableEntityLink>
            </Typography>
          </Box>
          {renderEntityFormCheckboxes()}
        </Box>
        {expanded ? (
          <>
            {Array.from(trucksMap.entries()).map(([tid, t]) => {
              const ok = truckOoVitalsOk(t);
              const miss = truckOoVitalMissingReasons(t);
              const truckTip = ok
                ? "Truck record complete for OO compliance."
                : `Missing: ${miss.join(", ")}`;
              return (
                <Box
                  key={tid}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0,
                    py: 0.75,
                  }}
                >
                  <Box
                    sx={{
                      width: OO_STATUS_W,
                      flexShrink: 0,
                      display: "flex",
                      justifyContent: "center",
                    }}
                  >
                    <Tooltip title={truckTip}>
                      {ok ? (
                        <CheckIcon color="success" fontSize="small" />
                      ) : (
                        <CloseIcon color="error" fontSize="small" />
                      )}
                    </Tooltip>
                  </Box>
                  <Box sx={{ width: OO_CHEVRON_W, flexShrink: 0 }} />
                  <Box sx={OO_LEFT_COL}>
                    <Typography
                      component="div"
                      variant="body2"
                      fontWeight={600}
                    >
                      <TableEntityLink href={`/trucks/${tid}`}>
                        {t.Name}
                      </TableEntityLink>
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Plate {t.LicensePlate?.trim() || "—"} · VIN{" "}
                      {t.VIN?.trim() || "—"} · Year {t.ModelYear ?? "—"}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }} />
                </Box>
              );
            })}
            {trucksMap.size === 0 ? (
              <Typography
                variant="body2"
                color="error"
                sx={{ pl: OO_STATUS_W + OO_CHEVRON_W, py: 1 }}
              >
                No trucks on file for this entity.
              </Typography>
            ) : null}
          </>
        ) : null}
      </Box>
    );
  };
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Box sx={{ mb: 2 }}>
        {mode === "w2" ? (
          <FilterMultiAutocomplete
            label="Drivers"
            options={w2DriverFilterOptions}
            value={selectedDriverFilters}
            onChange={setSelectedDriverFilters}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.id === b.id}
            placeholder="Search drivers…"
          />
        ) : (
          <FilterMultiAutocomplete
            label="Operators / carriers"
            options={ooEntityFilterOptions}
            value={selectedEntityFilters}
            onChange={setSelectedEntityFilters}
            getOptionLabel={(o) => o.label}
            isOptionEqualToValue={(a, b) => a.key === b.key}
            placeholder="Search operators or carriers…"
          />
        )}
      </Box>
      <Box sx={{ mb: 2, display: "flex", gap: 2, alignItems: "center" }}>
        {mode === "oo" ? (
          <Tooltip
            title={
              ooExpandAllOpen
                ? "Collapse all carrier / operator sections."
                : "Expand all carrier / operator sections."
            }
          >
            <Button
              variant="text"
              type="button"
              size="small"
              sx={calendarNavButtonSx}
              color="inherit"
              onClick={() => {
                const next = !ooExpandAllOpen;
                setOoExpandAllOpen(next);
                const m: Record<string, boolean> = {};
                for (const [k] of ooEntityEntries) {
                  m[k] = next;
                }
                setOoExpanded(m);
              }}
            >
              {ooExpandAllOpen ? (
                <ExpandMore sx={{ fontSize: 40 }} />
              ) : (
                <ChevronRight sx={{ fontSize: 40 }} />
              )}
            </Button>
          </Tooltip>
        ) : null}
        <Button
          variant="outlined"
          disabled={pdfDownloading}
          onClick={downloadPdf}
        >
          Download PDF
        </Button>
      </Box>
      {mode === "oo" ? (
        <Box>
          {renderFormHeaderRow()}
          {filteredOoEntityEntries.map(([k, drivers]) =>
            renderOoEntity(k, drivers),
          )}
        </Box>
      ) : (
        <Grid2 container direction="column" spacing={1}>
          {renderFormHeaderRow()}
          {filteredW2Data.map((driver) => {
            const dShape = shapeFor(driver.ID);
            const formsBad = driverMissingRequiredForm(
              dShape,
              formOptShapes,
              driverShapes,
              "w2",
            );
            const addr = formatDriverAddress(driver);
            const phone = driver.Phone?.trim() || "—";
            return (
              <Grid2
                container
                key={driver.ID}
                alignItems="center"
                wrap="nowrap"
              >
                <Grid2 sx={OO_LEFT_COL}>
                  <Typography component="div">
                    <TableEntityLink href={`/drivers/${driver.ID}`}>
                      {`${driver.FirstName ?? ""} ${driver.LastName ?? ""}`.trim()}
                    </TableEntityLink>
                    {formsBad ? (
                      <Typography
                        component="span"
                        color="error"
                        sx={{ ml: 0.5 }}
                      >
                        *
                      </Typography>
                    ) : null}
                  </Typography>
                  <Typography variant="caption" sx={{ display: "block" }}>
                    <TableEntityLink
                      href={`/drivers/${driver.ID}?tab=forms`}
                      sameTab
                    >
                      Edit forms
                    </TableEntityLink>
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {addr || "—"}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {phone}
                  </Typography>
                </Grid2>
                <Grid2 xs container sx={{ display: "flex", minWidth: 0 }}>
                  {all_forms.map((form) => {
                    const fShape = formOptShapes.find(
                      (o) => o.Form === form.Form,
                    )!;
                    const satisfied = isFormSatisfiedForDriver(
                      dShape,
                      fShape,
                      driverShapes,
                    );
                    const localMatch = getDriverFormRecord(
                      dShape.DriverForms,
                      form.Form,
                    );
                    const required = form.W2Required;
                    const compliantWhenPresent =
                      localMatch &&
                      isDriverFormRecordCompliant(
                        localMatch,
                        form.ExpiryCadence,
                        form.ValidityMonths,
                      );
                    const showError =
                      (required && !satisfied) ||
                      (Boolean(localMatch) && !compliantWhenPresent);
                    const tooltipParts: string[] = [];
                    if (localMatch) {
                      const filed = new Date(localMatch.Created);
                      tooltipParts.push(`Filed: ${fmtDate(filed)}`);
                      tooltipParts.push(
                        cadenceTooltipDetail(
                          form.ExpiryCadence,
                          filed,
                          localMatch.Expiration,
                          form.ValidityMonths,
                        ),
                      );
                    }
                    return (
                      <Grid2
                        key={form.ID}
                        xs
                        sx={{
                          minWidth: 0,
                          display: "flex",
                          justifyContent: "center",
                        }}
                      >
                        <Tooltip title={tooltipParts.join(" · ")}>
                          <Checkbox
                            checked={satisfied}
                            disabled={filing.isSaving}
                            onClick={() =>
                              filing.handleCheckboxClickW2(driver, form)
                            }
                            color={showError ? "error" : "primary"}
                          />
                        </Tooltip>
                      </Grid2>
                    );
                  })}
                </Grid2>
              </Grid2>
            );
          })}
        </Grid2>
      )}
      <DriverFormFilingModal
        open={filing.modalOpen}
        mode={mode}
        selectedForm={filing.selectedForm}
        selectedDate={filing.selectedDate}
        filerName={filing.filerName}
        expiryPreview={filing.expiryPreview}
        isSaving={filing.isSaving}
        onClose={filing.handleModalClose}
        onDateChange={filing.setSelectedDate}
        onFilerChange={filing.setFilerName}
        onSave={filing.handleDateSave}
      />
    </LocalizationProvider>
  );
};
export default Driver_Forms;
