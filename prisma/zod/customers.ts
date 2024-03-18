import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteStates, RelatedStatesModel, CompleteCustomerDeliveryLocations, RelatedCustomerDeliveryLocationsModel, CompleteCustomerLoadTypes, RelatedCustomerLoadTypesModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteInvoices, RelatedInvoicesModel, CompleteJobs, RelatedJobsModel, CompleteLoads, RelatedLoadsModel, CompleteWeeklies, RelatedWeekliesModel } from "./index"

export const CustomersModel = z.object({
  ID: z.number().int(),
  Name: z.string().min(1),
  Street: z.string().min(1),
  City: z.string().min(1),
  State: z.number().int().min(1),
  ZIP: z.string().min(1),
  Phone: z.string().nullish(),
  Email: z.string().nullish(),
  Notes: z.string().nullish(),
  MainContact: z.string().nullish(),
  Deleted: z.boolean().nullish(),
})

export interface CompleteCustomers extends z.infer<typeof CustomersModel> {
  States: CompleteStates
  CustomerDeliveryLocations: CompleteCustomerDeliveryLocations[]
  CustomerLoadTypes: CompleteCustomerLoadTypes[]
  DeliveryLocations: CompleteDeliveryLocations[]
  Invoices: CompleteInvoices[]
  Jobs: CompleteJobs[]
  Loads: CompleteLoads[]
  Weeklies: CompleteWeeklies[]
}

/**
 * RelatedCustomersModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCustomersModel: z.ZodSchema<CompleteCustomers> = z.lazy(() => CustomersModel.extend({
  States: RelatedStatesModel,
  CustomerDeliveryLocations: RelatedCustomerDeliveryLocationsModel.array(),
  CustomerLoadTypes: RelatedCustomerLoadTypesModel.array(),
  DeliveryLocations: RelatedDeliveryLocationsModel.array(),
  Invoices: RelatedInvoicesModel.array(),
  Jobs: RelatedJobsModel.array(),
  Loads: RelatedLoadsModel.array(),
  Weeklies: RelatedWeekliesModel.array(),
}))
