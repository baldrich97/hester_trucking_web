import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteDrivers, RelatedDriversModel, CompleteInvoices, RelatedInvoicesModel, CompleteLoadTypes, RelatedLoadTypesModel, CompleteTrucks, RelatedTrucksModel } from "./index"

export const LoadsModel = z.object({
  ID: z.number().int(),
  StartDate: imports.parseDate,
  EndDate: imports.parseDate,
  Weight: imports.isNumber.nullish(),
  Hours: imports.isNumber.nullish(),
  TotalRate: imports.isNumber.nullish(),
  TotalAmount: imports.isNumber.nullish(),
  TruckRate: imports.isNumber.nullish(),
  MaterialRate: imports.isNumber.nullish(),
  Received: z.string().nullish(),
  Notes: z.string().nullish(),
  TicketNumber: z.number().int().nullish(),
  Invoiced: z.boolean().nullish(),
  CustomerID: z.number().int().min(1).nullish(),
  InvoiceID: z.number().int().min(1).nullish(),
  LoadTypeID: z.number().int().min(1).nullish(),
  DeliveryLocationID: z.number().int().nullish(),
  TruckID: z.number().int().nullish(),
  DriverID: z.number().int().nullish(),
  Deleted: z.boolean().nullish(),
})

export interface CompleteLoads extends z.infer<typeof LoadsModel> {
  Customers?: CompleteCustomers | null
  DeliveryLocations?: CompleteDeliveryLocations | null
  Drivers?: CompleteDrivers | null
  Invoices?: CompleteInvoices | null
  LoadTypes?: CompleteLoadTypes | null
  Trucks?: CompleteTrucks | null
}

/**
 * RelatedLoadsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedLoadsModel: z.ZodSchema<CompleteLoads> = z.lazy(() => LoadsModel.extend({
  Customers: RelatedCustomersModel.nullish(),
  DeliveryLocations: RelatedDeliveryLocationsModel.nullish(),
  Drivers: RelatedDriversModel.nullish(),
  Invoices: RelatedInvoicesModel.nullish(),
  LoadTypes: RelatedLoadTypesModel.nullish(),
  Trucks: RelatedTrucksModel.nullish(),
}))
