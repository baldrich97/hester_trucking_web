import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel } from "./index"

export const CustomerDeliveryLocationsModel = z.object({
  ID: z.number().int(),
  CustomerID: z.number().int(),
  DeliveryLocationID: z.number().int(),
  DateUsed: z.coerce.date(),
})

export interface CompleteCustomerDeliveryLocations extends z.infer<typeof CustomerDeliveryLocationsModel> {
  Customers: CompleteCustomers
  DeliveryLocations: CompleteDeliveryLocations
}

/**
 * RelatedCustomerDeliveryLocationsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCustomerDeliveryLocationsModel: z.ZodSchema<CompleteCustomerDeliveryLocations> = z.lazy(() => CustomerDeliveryLocationsModel.extend({
  Customers: RelatedCustomersModel,
  DeliveryLocations: RelatedDeliveryLocationsModel,
}))
