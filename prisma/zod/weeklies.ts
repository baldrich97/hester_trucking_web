import * as z from "zod"
import { CompleteJobs, RelatedJobsModel, CompleteCustomers, RelatedCustomersModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteInvoices, RelatedInvoicesModel, CompleteLoadTypes, RelatedLoadTypesModel } from "./index"

export const WeekliesModel = z.object({
  ID: z.number().int(),
  Week: z.string(),
  CustomerID: z.number().int(),
  InvoiceID: z.number().int().nullish(),
  CompanyRate: z.number().nullish(),
  Revenue: z.number().nullish(),
  LoadTypeID: z.number().int(),
  DeliveryLocationID: z.number().int(),
  LastPrinted: z.date().nullish(),
  TotalWeight: z.number().nullish(),
})

export interface CompleteWeeklies extends z.infer<typeof WeekliesModel> {
  Jobs: CompleteJobs[]
  Customers: CompleteCustomers
  DeliveryLocations: CompleteDeliveryLocations
  Invoices?: CompleteInvoices | null
  LoadTypes: CompleteLoadTypes
}

/**
 * RelatedWeekliesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedWeekliesModel: z.ZodSchema<CompleteWeeklies> = z.lazy(() => WeekliesModel.extend({
  Jobs: RelatedJobsModel.array(),
  Customers: RelatedCustomersModel,
  DeliveryLocations: RelatedDeliveryLocationsModel,
  Invoices: RelatedInvoicesModel.nullish(),
  LoadTypes: RelatedLoadTypesModel,
}))
