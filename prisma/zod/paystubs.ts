import * as z from "zod"
import { CompleteJobs, RelatedJobsModel, CompleteDrivers, RelatedDriversModel } from "./index"

export const PayStubsModel = z.object({
  ID: z.number().int(),
  Created: z.coerce.date(),
  DriverID: z.number().int(),
  CheckNumber: z.string(),
  Gross: z.coerce.number(),
  Percentage: z.coerce.number(),
  NetTotal: z.coerce.number(),
  LastPrinted: z.coerce.date().nullish(),
  TakeHome: z.coerce.number(),
  Deductions: z.number(),
  Additions: z.number(),
  Notes: z.string().nullish(),
  DepositDate: z.coerce.date().nullish(),
})

export interface CompletePayStubs extends z.infer<typeof PayStubsModel> {
  Jobs: CompleteJobs[]
  Drivers: CompleteDrivers
}

/**
 * RelatedPayStubsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPayStubsModel: z.ZodSchema<CompletePayStubs> = z.lazy(() => PayStubsModel.extend({
  Jobs: RelatedJobsModel.array(),
  Drivers: RelatedDriversModel,
}))
