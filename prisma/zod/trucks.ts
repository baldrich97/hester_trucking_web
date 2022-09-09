import * as z from "zod"
import * as imports from "../null"
import { CompleteTrucksDriven, RelatedTrucksDrivenModel } from "./index"

export const TrucksModel = z.object({
  ID: z.number().int(),
  Name: z.string().min(1),
  VIN: z.string().nullish(),
  Deleted: z.boolean().nullish(),
  Notes: z.string().nullish(),
})

export interface CompleteTrucks extends z.infer<typeof TrucksModel> {
  TrucksDriven: CompleteTrucksDriven[]
}

/**
 * RelatedTrucksModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTrucksModel: z.ZodSchema<CompleteTrucks> = z.lazy(() => TrucksModel.extend({
  TrucksDriven: RelatedTrucksDrivenModel.array(),
}))
