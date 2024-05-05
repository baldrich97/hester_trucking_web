import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteJobs, RelatedJobsModel } from "./index"

export const DailiesModel = z.object({
  ID: z.number().int(),
  DriverID: z.number().int(),
  Week: z.string(),
  LastPrinted: z.date().nullish(),
})

export interface CompleteDailies extends z.infer<typeof DailiesModel> {
  Drivers: CompleteDrivers
  Jobs: CompleteJobs[]
}

/**
 * RelatedDailiesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDailiesModel: z.ZodSchema<CompleteDailies> = z.lazy(() => DailiesModel.extend({
  Drivers: RelatedDriversModel,
  Jobs: RelatedJobsModel.array(),
}))
