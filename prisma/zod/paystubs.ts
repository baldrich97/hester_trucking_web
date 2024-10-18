import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteJobs, RelatedJobsModel } from "./index"

export const PayStubsModel = z.object({
  ID: z.number().int(),
  Created: z.date(),
  DriverID: z.number().int(),
  CheckNumber: z.string(),
  Gross: z.number(),
  Percentage: z.number(),
  FedTax: z.number(),
  StateTax: z.number(),
  SSTax: z.number(),
  MedTax: z.number(),
  NetTotal: z.number(),
  LastPrinted: z.date().nullish(),
  TakeHome: z.number(),
})

export interface CompletePayStubs extends z.infer<typeof PayStubsModel> {
  Drivers: CompleteDrivers
  Jobs: CompleteJobs[]
}

/**
 * RelatedPayStubsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedPayStubsModel: z.ZodSchema<CompletePayStubs> = z.lazy(() => PayStubsModel.extend({
  Drivers: RelatedDriversModel,
  Jobs: RelatedJobsModel.array(),
}))
