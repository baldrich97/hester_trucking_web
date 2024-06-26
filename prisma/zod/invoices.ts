import * as z from "zod"
import { CompleteCustomers, RelatedCustomersModel, CompleteLoads, RelatedLoadsModel, CompleteWeeklies, RelatedWeekliesModel } from "./index"

export const InvoicesModel = z.object({
  ID: z.number().int(),
  InvoiceDate: z.coerce.date(),
  Number: z.number().int().nullish(),
  CustomerID: z.number().int().min(1),
  TotalAmount: z.number().min(1),
  PaidDate: z.coerce.date().nullish(),
  CheckNumber: z.string().nullish(),
  Paid: z.boolean().nullish(),
  Printed: z.boolean().nullish(),
  Deleted: z.boolean().nullish(),
  PaymentType: z.string().nullish(),
  Consolidated: z.boolean().nullish(),
  ConsolidatedID: z.number().int().nullish(),
})

export interface CompleteInvoices extends z.infer<typeof InvoicesModel> {
  Customers: CompleteCustomers
  Loads: CompleteLoads[]
  Weeklies: CompleteWeeklies[]
}

/**
 * RelatedInvoicesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedInvoicesModel: z.ZodSchema<CompleteInvoices> = z.lazy(() => InvoicesModel.extend({
  Customers: RelatedCustomersModel,
  Loads: RelatedLoadsModel.array(),
  Weeklies: RelatedWeekliesModel.array(),
}))
