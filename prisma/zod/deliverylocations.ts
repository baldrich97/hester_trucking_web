import * as z from "zod"
import * as imports from "../null"
import { CompleteCustomers, RelatedCustomersModel } from "./index"

export const DeliveryLocationsModel = z.object({
  ID: z.number().int(),
  Description: z.string(),
  Deleted: z.boolean().nullish(),
  CustomerID: z.number().int().nullish(),
})

export interface CompleteDeliveryLocations extends z.infer<typeof DeliveryLocationsModel> {
  Customers?: CompleteCustomers | null
}

/**
 * RelatedDeliveryLocationsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDeliveryLocationsModel: z.ZodSchema<CompleteDeliveryLocations> = z.lazy(() => DeliveryLocationsModel.extend({
  Customers: RelatedCustomersModel.nullish(),
}))
