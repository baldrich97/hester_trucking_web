import * as z from "zod"
import { CompleteDailies, RelatedDailiesModel, CompleteStates, RelatedStatesModel, CompleteJobs, RelatedJobsModel, CompleteLoads, RelatedLoadsModel, CompletePayStubs, RelatedPayStubsModel, CompleteTrucksDriven, RelatedTrucksDrivenModel } from "./index"

export const DriversModel = z.object({
  ID: z.number().int(),
  FirstName: z.string().min(1),
  MiddleName: z.string().nullish(),
  LastName: z.string().min(1),
  Street: z.string().nullish(),
  City: z.string().nullish(),
  State: z.number().int().nullish(),
  ZIP: z.string().nullish(),
  DOB: z.date().nullish(),
  License: z.string().nullish(),
  Email: z.string().nullish(),
  Phone: z.string().nullish(),
  Notes: z.string().nullish(),
  Deleted: z.boolean().nullish(),
  HireDate: z.string().nullish(),
  OwnerOperator: z.boolean(),
})

export interface CompleteDrivers extends z.infer<typeof DriversModel> {
  Dailies: CompleteDailies[]
  States?: CompleteStates | null
  Jobs: CompleteJobs[]
  Loads: CompleteLoads[]
  PayStubs: CompletePayStubs[]
  TrucksDriven: CompleteTrucksDriven[]
}

/**
 * RelatedDriversModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDriversModel: z.ZodSchema<CompleteDrivers> = z.lazy(() => DriversModel.extend({
  Dailies: RelatedDailiesModel.array(),
  States: RelatedStatesModel.nullish(),
  Jobs: RelatedJobsModel.array(),
  Loads: RelatedLoadsModel.array(),
  PayStubs: RelatedPayStubsModel.array(),
  TrucksDriven: RelatedTrucksDrivenModel.array(),
}))
