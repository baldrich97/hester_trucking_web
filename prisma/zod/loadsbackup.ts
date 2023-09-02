import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const LoadsBackupModel = z.object({
  ID: z.number().int(),
  StartDate: z.date(),
  EndDate: z.date(),
  Weight: z.number().nullish(),
  Hours: z.number().nullish(),
  TotalRate: z.number().nullish(),
  TotalAmount: z.number().nullish(),
  TruckRate: z.number().nullish(),
  MaterialRate: z.number().nullish(),
  Received: z.string().nullish(),
  Notes: z.string().nullish(),
  TicketNumber: z.number().int().nullish(),
  Invoiced: z.boolean().nullish(),
  CustomerID: z.number().int().nullish(),
  InvoiceID: z.number().int().nullish(),
  LoadTypeID: z.number().int().nullish(),
  DeliveryLocationID: z.number().int().nullish(),
  TruckID: z.number().int().nullish(),
  DriverID: z.number().int().nullish(),
  Deleted: z.boolean().nullish(),
})
