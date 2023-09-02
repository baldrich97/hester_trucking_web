import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const InvoicesBackupModel = z.object({
  ID: z.number().int(),
  InvoiceDate: z.date(),
  Number: z.number().int().nullish(),
  CustomerID: z.number().int(),
  TotalAmount: z.number(),
  PaidDate: z.date().nullish(),
  CheckNumber: z.string().nullish(),
  Paid: z.boolean().nullish(),
  Printed: z.boolean().nullish(),
  Deleted: z.boolean().nullish(),
  PaymentType: z.string().nullish(),
})
