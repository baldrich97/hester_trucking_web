import * as z from "zod"
import { CompleteCustomers, RelatedCustomersModel, CompleteLoadTypes, RelatedLoadTypesModel } from "./index"

export const CustomerLoadTypesModel = z.object({
  ID: z.number().int(),
  CustomerID: z.number().int(),
  LoadTypeID: z.number().int(),
  DateDelivered: z.coerce.date(),
})

export interface CompleteCustomerLoadTypes extends z.infer<typeof CustomerLoadTypesModel> {
  Customers: CompleteCustomers
  LoadTypes: CompleteLoadTypes
}

/**
 * RelatedCustomerLoadTypesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCustomerLoadTypesModel: z.ZodSchema<CompleteCustomerLoadTypes> = z.lazy(() => CustomerLoadTypesModel.extend({
  Customers: RelatedCustomersModel,
  LoadTypes: RelatedLoadTypesModel,
}))
