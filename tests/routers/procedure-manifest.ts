export type ProcedureKind = "query" | "mutation";

export type ProcedureCase = {
    /** Full tRPC path, e.g. `loads.getAll` */
    path: string;
    kind: ProcedureKind;
    /** Omit for void queries; pass `null` to send explicit null */
    input?: unknown;
    /** If true, set SOURCES_CUTOVER_FORCE=true for this call */
    cutover?: boolean;
    /** If true, pass a fake session (auth.* procedures) */
    authenticated?: boolean;
    /** Skip with reason (documented exceptions) */
    skip?: string;
};

const week = "2026-W30";
const today = new Date("2026-07-20T12:00:00.000Z");

function q(path: string, input?: unknown, extra?: Partial<ProcedureCase>): ProcedureCase {
    return {path, kind: "query", input, ...extra};
}

function m(path: string, input?: unknown, extra?: Partial<ProcedureCase>): ProcedureCase {
    return {path, kind: "mutation", input, ...extra};
}

/** Every active tRPC procedure — used by router-matrix tests. */
export const ALL_PROCEDURES: ProcedureCase[] = [
    // config
    q("config.sourcesCutover"),

    // states
    q("states.getAll"),

    // customers
    q("customers.getAll"),
    q("customers.get", {ID: 1}),
    q("customers.search", {search: "a"}),
    q("customers.searchPage", {page: 0}),
    m("customers.put", {Name: "[TEST] Customer", Address: "1 Main", City: "Town", StateID: 1, Zip: "12345", Phone: "555-0100"}),
    m("customers.post", {ID: 1, Name: "[TEST] Customer", Address: "1 Main", City: "Town", StateID: 1, Zip: "12345", Phone: "555-0100"}),

    // trucks
    q("trucks.getAll"),
    q("trucks.get", {ID: 1}),
    q("trucks.search", {search: "a"}),
    m("trucks.put", {Name: "[TEST] Truck", Active: true}),
    m("trucks.post", {ID: 1, Name: "[TEST] Truck", Active: true}),

    // drivers
    q("drivers.getAll"),
    q("drivers.get", {ID: 1}),
    q("drivers.search", {search: "a"}),
    m("drivers.put", {FirstName: "[TEST]", LastName: "Driver", Active: true, OwnerOperator: false}),
    m("drivers.post", {ID: 1, FirstName: "[TEST]", LastName: "Driver", Active: true, OwnerOperator: false}),

    // deliverylocations
    q("deliverylocations.getAll"),
    q("deliverylocations.get", {ID: 1}),
    q("deliverylocations.search", {search: "a", CustomerID: 1}),
    m("deliverylocations.put", {Description: "[TEST] Site"}),
    m("deliverylocations.post", {ID: 1, Description: "[TEST] Site"}),

    // loadtypes
    q("loadtypes.getAll"),
    q("loadtypes.get", {ID: 1}),
    q("loadtypes.search", {search: "a", era: "legacy"}, {cutover: true}),
    q("loadtypes.searchPage", {page: 0}),
    m("loadtypes.put", {Description: "[TEST] Type", Deleted: false}),
    m("loadtypes.post", {ID: 116, Description: "[TEST] Type", Deleted: false}),

    // loads
    q("loads.getAllPage", {page: 0}),
    q("loads.getUninvPage", {page: 0}),
    q("loads.getAll"),
    q("loads.getUninv"),
    q("loads.get", {ID: 1}),
    q("loads.getByJobId", {jobId: 1}),
    q("loads.getByCustomer", {customer: 1}),
    q("loads.openLegacyJobs", {DriverID: 1, Week: week}, {cutover: true}),
    q("loads.getCount", {page: 0}),
    q("loads.getUninvCount", {page: 0}),
    m("loads.put_duplicate_checker", {
        TicketNumber: 999001, DriverID: 1, TruckID: 1, CustomerID: 1, LoadTypeID: 116,
        DeliveryLocationID: 1, Week: week, StartDate: today, Created: today,
        Weight: 18, TruckRate: 10, MaterialRate: 5, DriverRate: 8, TotalRate: 15, TotalAmount: 270,
    }),
    m("loads.post_duplicate_checker", {
        ID: 1, TicketNumber: 999001, DriverID: 1, TruckID: 1, CustomerID: 1, LoadTypeID: 116,
        DeliveryLocationID: 1, Week: week, StartDate: today, Created: today,
        Weight: 18, TruckRate: 10, MaterialRate: 5, DriverRate: 8, TotalRate: 15, TotalAmount: 270,
    }),
    m("loads.put", {
        TicketNumber: 999002, DriverID: 1, TruckID: 1, CustomerID: 1, LoadTypeID: 116,
        DeliveryLocationID: 1, Week: week, StartDate: today, Created: today,
        Weight: 18, TruckRate: 10, MaterialRate: 5, DriverRate: 8, TotalRate: 15, TotalAmount: 270,
    }),
    m("loads.post", {
        ID: 1, TicketNumber: 999001, DriverID: 1, TruckID: 1, CustomerID: 1, LoadTypeID: 116,
        DeliveryLocationID: 1, Week: week, StartDate: today, Created: today,
        Weight: 18, TruckRate: 10, MaterialRate: 5, DriverRate: 8, TotalRate: 15, TotalAmount: 270,
    }),
    m("loads.post_mass_edit", {
        selectedLoads: [1],
        data: {
            TicketNumber: 999003, DriverID: 1, TruckID: 1, CustomerID: 1, LoadTypeID: 116,
            DeliveryLocationID: 1, Week: week, StartDate: today, Created: today,
            Weight: 18, TruckRate: 10, MaterialRate: 5, DriverRate: 8, TotalRate: 15, TotalAmount: 270,
        },
    }, {cutover: true}),
    m("loads.delete", {ID: 1}),

    // invoices
    q("invoices.getAllOverdue"),
    q("invoices.getOverdueCount"),
    q("invoices.getOverdueFilteredCount", {page: 0}),
    q("invoices.getAll", {page: 0}),
    q("invoices.getAllPaid", {page: 0}),
    q("invoices.getAllUnpaid", {page: 0}),
    q("invoices.getAllConsolidated", {page: 0}),
    q("invoices.getAllPage", {page: 0}),
    q("invoices.getAllUnpaidPage", {page: 0}),
    q("invoices.getAllPaidPage", {page: 0}),
    q("invoices.getAllConsolidatedPage", {page: 0}),
    q("invoices.getAllConsolidateable", {page: 0}),
    q("invoices.getCount", {page: 0}),
    q("invoices.get", {ID: 1}),
    m("invoices.put", {
        Number: 888001, CustomerID: 1, InvoiceDate: today, TotalAmount: 100, selected: ["1"],
    }),
    m("invoices.putConsolidated", {ids: [1]}),
    m("invoices.post", {ID: 1, Number: 888001, CustomerID: 1, InvoiceDate: today, TotalAmount: 100}),
    m("invoices.postPrinted", {ID: 1}),
    m("invoices.postPaid", {ID: 1, PaidDate: today, CheckNumber: "CHK1"}),
    m("invoices.delete", {ID: 1}),

    // customerloadtypes / customerdeliverylocations
    q("customerloadtypes.getAll", {CustomerID: 1}),
    m("customerloadtypes.put", {CustomerID: 1, LoadTypeID: 116, DateDelivered: today}),
    m("customerloadtypes.post", {CustomerID: 1, LoadTypeID: 116, DateDelivered: today}),
    m("customerloadtypes.delete", {CustomerID: 1, LoadTypeID: 116}),
    q("customerdeliverylocations.getAll", {CustomerID: 1}),
    m("customerdeliverylocations.put", {CustomerID: 1, DeliveryLocationID: 1, DateUsed: today}),
    m("customerdeliverylocations.post", {CustomerID: 1, DeliveryLocationID: 1, DateUsed: today}),
    m("customerdeliverylocations.delete", {CustomerID: 1, DeliveryLocationID: 1}),

    // trucksdriven
    q("trucksdriven.search", {DriverID: 1, TruckID: 1}),

    // dailies
    q("dailies.getAll"),
    q("dailies.getByWeek", {week}),
    q("dailies.getNotPrinted"),
    q("dailies.getByWeekW2", {week}),
    q("dailies.getByWeekOperator", {week}),

    // weeklies
    q("weeklies.getByWeek", {week}),
    q("weeklies.getNotPrinted"),
    q("weeklies.getByCustomer", {customer: 1}),
    m("weeklies.post", {ID: 1, Week: week, CustomerID: 1, LoadTypeID: 116, DeliveryLocationID: 1}),
    m("weeklies.postClosed", {ID: 1}),

    // jobs
    q("jobs.getAll"),
    q("jobs.getByDriver", {driver: 1}),
    m("jobs.postClosed", {ID: 1}),
    m("jobs.postPaid", {ID: 1}),

    // paystubs
    q("paystubs.getAll"),
    q("paystubs.get", {ID: 1}),
    q("paystubs.search", {search: "a"}),
    m("paystubs.put", {
        Created: today, DriverID: 1, CheckNumber: "[TEST]-1", Gross: 100, Percentage: 0.25,
        NetTotal: 75, TakeHome: 75, Deductions: 0, Additions: 0, selected: ["1"],
    }),
    m("paystubs.post", {
        ID: 1, Created: today, DriverID: 1, CheckNumber: "[TEST]-1", Gross: 100, Percentage: 0.25,
        NetTotal: 75, TakeHome: 75, Deductions: 0, Additions: 0, selected: ["1"],
    }),
    m("paystubs.postPrinted", {ID: 1}),
    m("paystubs.delete", {ID: 1}),

    // driverForms
    m("driverForms.put", {Driver: 1, Form: 1, Expiration: new Date("2027-01-01"), FiledDate: today}),
    m("driverForms.delete", {driverId: 1, formId: 1}),

    // carriers
    q("carriers.getAll"),
    q("carriers.getOne", {ID: 1}),
    q("carriers.searchPage", {page: 0}),
    m("carriers.put", {Name: "[TEST] Carrier"}),
    m("carriers.post", {ID: 1, Name: "[TEST] Carrier"}),
    m("carriers.delete", {ID: 1}),

    // formsCatalog / formOptions
    m("formsCatalog.createWithOptions", {
        formName: "[TEST] Form", displayName: "[TEST]", w2Visible: true, ooVisible: false,
    }),
    q("formOptions.getAll"),
    m("formOptions.update", {ID: 1, W2Visible: true, OOVisible: true}),

    // compliance
    q("compliance.driverFormsSummary"),
    q("compliance.driverFormsExpiringSoon"),

    // sources (cutover)
    q("sources.getAll", undefined, {cutover: true}),
    q("sources.get", {ID: 1}, {cutover: true}),
    q("sources.search", {search: "a"}, {cutover: true}),
    q("sources.searchPage", {page: 0}, {cutover: true}),
    q("sources.searchAvailableLoadTypes", {SourceID: 1}, {cutover: true}),
    m("sources.put", {Name: "[TEST] Source", ShortName: "T-SRC"}, {cutover: true}),
    m("sources.post", {ID: 1, Name: "[TEST] Source", ShortName: "T-SRC"}, {cutover: true}),
    m("sources.delete", {ID: 1}, {cutover: true}),
    m("sources.assignLoadTypes", {SourceID: 1, LoadTypeIDs: [116]}, {cutover: true}),
    m("sources.removeLoadType", {SourceID: 1, LoadTypeID: 116}, {cutover: true}),

    // reports (cutover)
    q("reports.sourceAudit", {
        sourceId: 1, startDate: new Date("2024-01-01"), endDate: new Date("2024-12-31"),
    }, {cutover: true}),
    q("reports.customerAudit", {
        customerId: 1, startDate: new Date("2024-01-01"), endDate: new Date("2024-12-31"),
    }, {cutover: true}),

    // auth (protected)
    q("auth.getSession", undefined, {authenticated: true}),
    q("auth.getSecretMessage", undefined, {authenticated: true}),
];
