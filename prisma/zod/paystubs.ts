import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteInvoices, RelatedInvoicesModel, CompleteJobs, RelatedJobsModel } from "./index"

export const PayStubsModel = z.object({
  ID: z.number().int(),
  Created: z.date(),
  InvoiceDate: z.date(),
  InvoiceID: z.number().int(),
  DriverID: z.number().int(),
  CheckNumber: z.string(),
  Gross: z.number(),
  Percentage: z.number(),
  FedTax: z.number(),
  StateTax: z.number(),
  SSTax: z.number(),
  MedTax: z.number(),
  NetTotal: z.number(),
})

export interface CompletePayStubs extends z.infer<typeof PayStubsModel> {
  Drivers: CompleteDrivers
  Invoices: CompleteInvoices
  Jobs: CompleteJobs[]
}

/**
 * RelatedPayStubsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPayStubsModel: z.ZodSchema<CompletePayStubs> = z.lazy(() => PayStubsModel.extend({
  Drivers: RelatedDriversModel,
  Invoices: RelatedInvoicesModel,
  Jobs: RelatedJobsModel.array(),
}))
