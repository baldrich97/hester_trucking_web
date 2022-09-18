import * as z from "zod"
import { CompleteStates, RelatedStatesModel, CompleteCustomerLoadTypes, RelatedCustomerLoadTypesModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel, CompleteInvoices, RelatedInvoicesModel, CompleteLoads, RelatedLoadsModel } from "./index"

export const CustomersModel = z.object({
  ID: z.number().int(),
  Name: z.string().min(1),
  Street: z.string().min(1),
  City: z.string().min(1),
  State: z.number().int().min(1),
  ZIP: z.string().min(1),
  Phone: z.string().nullish(),
  Email: z.string().email().nullish(),
  Notes: z.string().nullish(),
  MainContact: z.string().nullish(),
  Deleted: z.boolean().nullish(),
})

export interface CompleteCustomers extends z.infer<typeof CustomersModel> {
  States: CompleteStates
  CustomerLoadTypes: CompleteCustomerLoadTypes[]
  DeliveryLocations: CompleteDeliveryLocations[]
  Invoices: CompleteInvoices[]
  Loads: CompleteLoads[]
}

/**
 * RelatedCustomersModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCustomersModel: z.ZodSchema<CompleteCustomers> = z.lazy(() => CustomersModel.extend({
  States: RelatedStatesModel,
  CustomerLoadTypes: RelatedCustomerLoadTypesModel.array(),
  DeliveryLocations: RelatedDeliveryLocationsModel.array(),
  Invoices: RelatedInvoicesModel.array(),
  Loads: RelatedLoadsModel.array(),
}))
