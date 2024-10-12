import * as z from "zod"
import { CompleteCustomers, RelatedCustomersModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteDrivers, RelatedDriversModel, CompleteInvoices, RelatedInvoicesModel, CompleteJobs, RelatedJobsModel, CompleteLoadTypes, RelatedLoadTypesModel, CompleteTrucks, RelatedTrucksModel } from "./index"

export const LoadsModel = z.object({
  ID: z.number().int(),
  StartDate: z.coerce.date(),
  Created: z.coerce.date(),
  Weight: z.coerce.number().nullish(),
  Hours: z.coerce.number().nullish(),
  TotalRate: z.coerce.number().nullish(),
  TotalAmount: z.coerce.number().nullish(),
  TruckRate: z.coerce.number().nullish(),
  MaterialRate: z.coerce.number().nullish(),
  Received: z.string().nullish(),
  Notes: z.string().nullish(),
  TicketNumber: z.number().int(),
  Invoiced: z.boolean().nullish(),
  CustomerID: z.number().int().min(1),
  InvoiceID: z.number().int().min(1).nullish(),
  LoadTypeID: z.number().int().min(1).nullish(),
  DeliveryLocationID: z.number().int().nullish(),
  TruckID: z.number().int().nullish(),
  DriverID: z.number().int().nullish(),
  Deleted: z.boolean().nullish(),
  Week: z.string(),
  DriverRate: z.number().nullish(),
  JobID: z.number().int().nullish(),
})

export interface CompleteLoads extends z.infer<typeof LoadsModel> {
  Customers: CompleteCustomers
  DeliveryLocations?: CompleteDeliveryLocations | null
  Drivers?: CompleteDrivers | null
  Invoices?: CompleteInvoices | null
  Jobs?: CompleteJobs | null
  LoadTypes?: CompleteLoadTypes | null
  Trucks?: CompleteTrucks | null
}

/**
 * RelatedLoadsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedLoadsModel: z.ZodSchema<CompleteLoads> = z.lazy(() => LoadsModel.extend({
  Customers: RelatedCustomersModel,
  DeliveryLocations: RelatedDeliveryLocationsModel.nullish(),
  Drivers: RelatedDriversModel.nullish(),
  Invoices: RelatedInvoicesModel.nullish(),
  Jobs: RelatedJobsModel.nullish(),
  LoadTypes: RelatedLoadTypesModel.nullish(),
  Trucks: RelatedTrucksModel.nullish(),
}))
