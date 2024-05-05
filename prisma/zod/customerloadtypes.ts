import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteLoadTypes, RelatedLoadTypesModel } from "./index"

export const CustomerLoadTypesModel = z.object({
  ID: z.number().int(),
  CustomerID: z.number().int(),
  LoadTypeID: z.number().int(),
  DateDelivered: imports.parseDate,
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
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
export const RelatedCustomerLoadTypesModel: z.ZodSchema<CompleteCustomerLoadTypes> = z.lazy(() => CustomerLoadTypesModel.extend({
  Customers: RelatedCustomersModel,
  LoadTypes: RelatedLoadTypesModel,
}))
