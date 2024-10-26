import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteJobs, RelatedJobsModel } from "./index"

export const PayStubsModel = z.object({
  ID: z.number().int(),
  Created: z.coerce.date(),
  DriverID: z.number().int(),
  CheckNumber: z.string(),
  Gross: z.coerce.number(),
  Percentage: z.coerce.number(),
  FedTax: z.coerce.number(),
  StateTax: z.coerce.number(),
  SSTax: z.coerce.number(),
  MedTax: z.coerce.number(),
  NetTotal: z.coerce.number(),
  LastPrinted: z.coerce.date().nullish(),
  TakeHome: z.coerce.number(),
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
