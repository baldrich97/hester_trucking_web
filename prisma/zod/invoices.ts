import * as z from "zod"
import { Invoices_PaymentType } from "@prisma/client"
import { CompleteCustomers, RelatedCustomersModel } from "./index"

export const InvoicesModel = z.object({
  ID: z.number().int(),
  InvoiceDate: z.date(),
  Number: z.number().int().nullish(),
  CustomerID: z.number().int().min(1),
  TotalAmount: z.number().min(1),
  PaidDate: z.date().nullish(),
  CheckNumber: z.string().nullish(),
  Paid: z.boolean().nullish(),
  Printed: z.boolean().nullish(),
  Deleted: z.boolean().nullish(),
  PaymentType: z.nativeEnum(Invoices_PaymentType).nullish(),
})

export interface CompleteInvoices extends z.infer<typeof InvoicesModel> {
  Customers: CompleteCustomers
}

/**
 * RelatedInvoicesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedInvoicesModel: z.ZodSchema<CompleteInvoices> = z.lazy(() => InvoicesModel.extend({
  Customers: RelatedCustomersModel,
}))
