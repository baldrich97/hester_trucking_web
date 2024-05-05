import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteDeliveryLocations, RelatedDeliveryLocationsModel } from "./index"

export const CustomerDeliveryLocationsModel = z.object({
  ID: z.number().int(),
  CustomerID: z.number().int(),
  DeliveryLocationID: z.number().int(),
  DateUsed: imports.parseDate,
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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
export const RelatedCustomerDeliveryLocationsModel: z.ZodSchema<CompleteCustomerDeliveryLocations> = z.lazy(() => CustomerDeliveryLocationsModel.extend({
  Customers: RelatedCustomersModel,
  DeliveryLocations: RelatedDeliveryLocationsModel,
}))
