import * as z from "zod"
import { CompleteLoads, RelatedLoadsModel, CompleteTrucksDriven, RelatedTrucksDrivenModel } from "./index"

export const TrucksModel = z.object({
  ID: z.number().int(),
  Name: z.string().min(1),
  VIN: z.string().nullish(),
  Deleted: z.boolean().nullish(),
  Notes: z.string().nullish(),
})

export interface CompleteTrucks extends z.infer<typeof TrucksModel> {
  Loads: CompleteLoads[]
  TrucksDriven: CompleteTrucksDriven[]
}

/**
 * RelatedTrucksModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTrucksModel: z.ZodSchema<CompleteTrucks> = z.lazy(() => TrucksModel.extend({
  Loads: RelatedLoadsModel.array(),
  TrucksDriven: RelatedTrucksDrivenModel.array(),
}))
