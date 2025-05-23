
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum
} = require('./runtime/index-browser')


const Prisma = {}

exports.Prisma = Prisma

/**
 * Prisma Client JS version: 4.3.0
 * Query Engine version: c875e43600dfe042452e0b868f7a48b817b9640b
 */
Prisma.prismaVersion = {
  client: "4.3.0",
  engine: "c875e43600dfe042452e0b868f7a48b817b9640b"
}

Prisma.PrismaClientKnownRequestError = () => {
  throw new Error(`PrismaClientKnownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  throw new Error(`PrismaClientUnknownRequestError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientRustPanicError = () => {
  throw new Error(`PrismaClientRustPanicError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientInitializationError = () => {
  throw new Error(`PrismaClientInitializationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.PrismaClientValidationError = () => {
  throw new Error(`PrismaClientValidationError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.NotFoundError = () => {
  throw new Error(`NotFoundError is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  throw new Error(`sqltag is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.empty = () => {
  throw new Error(`empty is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.join = () => {
  throw new Error(`join is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.raw = () => {
  throw new Error(`raw is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
)}
Prisma.validator = () => (val) => val

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}

/**
 * Enums
 */
// Based on
// https://github.com/microsoft/TypeScript/issues/3192#issuecomment-261720275
function makeEnum(x) { return x; }

exports.Prisma.CustomerDeliveryLocationsScalarFieldEnum = makeEnum({
  ID: 'ID',
  CustomerID: 'CustomerID',
  DeliveryLocationID: 'DeliveryLocationID',
  DateUsed: 'DateUsed'
});

exports.Prisma.CustomerLoadTypesScalarFieldEnum = makeEnum({
  ID: 'ID',
  CustomerID: 'CustomerID',
  LoadTypeID: 'LoadTypeID',
  DateDelivered: 'DateDelivered'
});

exports.Prisma.CustomersOrderByRelevanceFieldEnum = makeEnum({
  Name: 'Name',
  Street: 'Street',
  City: 'City',
  ZIP: 'ZIP',
  Phone: 'Phone',
  Email: 'Email',
  Notes: 'Notes',
  MainContact: 'MainContact'
});

exports.Prisma.CustomersScalarFieldEnum = makeEnum({
  ID: 'ID',
  Name: 'Name',
  Street: 'Street',
  City: 'City',
  State: 'State',
  ZIP: 'ZIP',
  Phone: 'Phone',
  Email: 'Email',
  Notes: 'Notes',
  MainContact: 'MainContact',
  Deleted: 'Deleted'
});

exports.Prisma.DailiesOrderByRelevanceFieldEnum = makeEnum({
  Week: 'Week'
});

exports.Prisma.DailiesScalarFieldEnum = makeEnum({
  ID: 'ID',
  DriverID: 'DriverID',
  Week: 'Week',
  LastPrinted: 'LastPrinted'
});

exports.Prisma.DeliveryLocationsOrderByRelevanceFieldEnum = makeEnum({
  Description: 'Description'
});

exports.Prisma.DeliveryLocationsScalarFieldEnum = makeEnum({
  ID: 'ID',
  Description: 'Description',
  Deleted: 'Deleted',
  CustomerID: 'CustomerID'
});

exports.Prisma.DriversOrderByRelevanceFieldEnum = makeEnum({
  FirstName: 'FirstName',
  MiddleName: 'MiddleName',
  LastName: 'LastName',
  Street: 'Street',
  City: 'City',
  ZIP: 'ZIP',
  License: 'License',
  Email: 'Email',
  Phone: 'Phone',
  Notes: 'Notes',
  HireDate: 'HireDate'
});

exports.Prisma.DriversScalarFieldEnum = makeEnum({
  ID: 'ID',
  FirstName: 'FirstName',
  MiddleName: 'MiddleName',
  LastName: 'LastName',
  Street: 'Street',
  City: 'City',
  State: 'State',
  ZIP: 'ZIP',
  DOB: 'DOB',
  License: 'License',
  Email: 'Email',
  Phone: 'Phone',
  Notes: 'Notes',
  Deleted: 'Deleted',
  HireDate: 'HireDate',
  OwnerOperator: 'OwnerOperator'
});

exports.Prisma.InvoicesOrderByRelevanceFieldEnum = makeEnum({
  CheckNumber: 'CheckNumber',
  PaymentType: 'PaymentType'
});

exports.Prisma.InvoicesScalarFieldEnum = makeEnum({
  ID: 'ID',
  InvoiceDate: 'InvoiceDate',
  Number: 'Number',
  CustomerID: 'CustomerID',
  TotalAmount: 'TotalAmount',
  PaidDate: 'PaidDate',
  CheckNumber: 'CheckNumber',
  Paid: 'Paid',
  Printed: 'Printed',
  Deleted: 'Deleted',
  PaymentType: 'PaymentType',
  Consolidated: 'Consolidated',
  ConsolidatedID: 'ConsolidatedID'
});

exports.Prisma.JobsScalarFieldEnum = makeEnum({
  ID: 'ID',
  DriverID: 'DriverID',
  LoadTypeID: 'LoadTypeID',
  CustomerID: 'CustomerID',
  PaidOut: 'PaidOut',
  TruckingRevenue: 'TruckingRevenue',
  CompanyRevenue: 'CompanyRevenue',
  TruckingRate: 'TruckingRate',
  CompanyRate: 'CompanyRate',
  DeliveryLocationID: 'DeliveryLocationID',
  WeeklyID: 'WeeklyID',
  DailyID: 'DailyID',
  MaterialRate: 'MaterialRate',
  DriverRate: 'DriverRate',
  PayStubID: 'PayStubID'
});

exports.Prisma.LoadTypesOrderByRelevanceFieldEnum = makeEnum({
  Description: 'Description',
  Notes: 'Notes'
});

exports.Prisma.LoadTypesScalarFieldEnum = makeEnum({
  ID: 'ID',
  Description: 'Description',
  Deleted: 'Deleted',
  SourceID: 'SourceID',
  Notes: 'Notes'
});

exports.Prisma.LoadsOrderByRelevanceFieldEnum = makeEnum({
  Received: 'Received',
  Notes: 'Notes',
  Week: 'Week'
});

exports.Prisma.LoadsScalarFieldEnum = makeEnum({
  ID: 'ID',
  StartDate: 'StartDate',
  Created: 'Created',
  Weight: 'Weight',
  Hours: 'Hours',
  TotalRate: 'TotalRate',
  TotalAmount: 'TotalAmount',
  TruckRate: 'TruckRate',
  MaterialRate: 'MaterialRate',
  Received: 'Received',
  Notes: 'Notes',
  TicketNumber: 'TicketNumber',
  Invoiced: 'Invoiced',
  CustomerID: 'CustomerID',
  InvoiceID: 'InvoiceID',
  LoadTypeID: 'LoadTypeID',
  DeliveryLocationID: 'DeliveryLocationID',
  TruckID: 'TruckID',
  DriverID: 'DriverID',
  Deleted: 'Deleted',
  JobID: 'JobID',
  Week: 'Week',
  DriverRate: 'DriverRate'
});

exports.Prisma.PayStubsOrderByRelevanceFieldEnum = makeEnum({
  CheckNumber: 'CheckNumber',
  Notes: 'Notes'
});

exports.Prisma.PayStubsScalarFieldEnum = makeEnum({
  ID: 'ID',
  Created: 'Created',
  DriverID: 'DriverID',
  CheckNumber: 'CheckNumber',
  Gross: 'Gross',
  Percentage: 'Percentage',
  NetTotal: 'NetTotal',
  LastPrinted: 'LastPrinted',
  TakeHome: 'TakeHome',
  Deductions: 'Deductions',
  Additions: 'Additions',
  Notes: 'Notes',
  DepositDate: 'DepositDate'
});

exports.Prisma.SortOrder = makeEnum({
  asc: 'asc',
  desc: 'desc'
});

exports.Prisma.StatesOrderByRelevanceFieldEnum = makeEnum({
  Name: 'Name',
  Abbreviation: 'Abbreviation'
});

exports.Prisma.StatesScalarFieldEnum = makeEnum({
  ID: 'ID',
  Name: 'Name',
  Abbreviation: 'Abbreviation'
});

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.TrucksDrivenScalarFieldEnum = makeEnum({
  ID: 'ID',
  TruckID: 'TruckID',
  DriverID: 'DriverID',
  DateDriven: 'DateDriven'
});

exports.Prisma.TrucksOrderByRelevanceFieldEnum = makeEnum({
  Name: 'Name',
  VIN: 'VIN',
  Notes: 'Notes'
});

exports.Prisma.TrucksScalarFieldEnum = makeEnum({
  ID: 'ID',
  Name: 'Name',
  VIN: 'VIN',
  Deleted: 'Deleted',
  Notes: 'Notes'
});

exports.Prisma.UserOrderByRelevanceFieldEnum = makeEnum({
  email: 'email',
  organization: 'organization',
  password: 'password',
  username: 'username'
});

exports.Prisma.UserScalarFieldEnum = makeEnum({
  id: 'id',
  email: 'email',
  organization: 'organization',
  password: 'password',
  username: 'username'
});

exports.Prisma.WeekliesOrderByRelevanceFieldEnum = makeEnum({
  Week: 'Week'
});

exports.Prisma.WeekliesScalarFieldEnum = makeEnum({
  ID: 'ID',
  Week: 'Week',
  CustomerID: 'CustomerID',
  InvoiceID: 'InvoiceID',
  CompanyRate: 'CompanyRate',
  Revenue: 'Revenue',
  LoadTypeID: 'LoadTypeID',
  DeliveryLocationID: 'DeliveryLocationID',
  LastPrinted: 'LastPrinted',
  TotalWeight: 'TotalWeight'
});


exports.Prisma.ModelName = makeEnum({
  User: 'User',
  CustomerLoadTypes: 'CustomerLoadTypes',
  Customers: 'Customers',
  DeliveryLocations: 'DeliveryLocations',
  Drivers: 'Drivers',
  Invoices: 'Invoices',
  LoadTypes: 'LoadTypes',
  States: 'States',
  Trucks: 'Trucks',
  TrucksDriven: 'TrucksDriven',
  Loads: 'Loads',
  CustomerDeliveryLocations: 'CustomerDeliveryLocations',
  Dailies: 'Dailies',
  Jobs: 'Jobs',
  Weeklies: 'Weeklies',
  PayStubs: 'PayStubs'
});

/**
 * Create the Client
 */
class PrismaClient {
  constructor() {
    throw new Error(
      `PrismaClient is unable to be run in the browser.
In case this error is unexpected for you, please report it in https://github.com/prisma/prisma/issues`,
    )
  }
}
exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
