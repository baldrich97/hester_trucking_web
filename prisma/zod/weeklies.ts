import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteCustomers, RelatedCustomersModel, CompleteInvoices, RelatedInvoicesModel } from "./index"

export const WeekliesModel = z.object({
  ID: z.number().int(),
  Week: z.string(),
  CustomerID: z.number().int(),
  InvoiceID: z.number().int(),
  CompanyRate: z.number(),
  Revenue: z.number(),
})

export interface CompleteWeeklies extends z.infer<typeof WeekliesModel> {
  Customers: CompleteCustomers
  Invoices: CompleteInvoices
}

/**
 * RelatedWeekliesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedWeekliesModel: z.ZodSchema<CompleteWeeklies> = z.lazy(() => WeekliesModel.extend({
  Customers: RelatedCustomersModel,
  Invoices: RelatedInvoicesModel,
}))
