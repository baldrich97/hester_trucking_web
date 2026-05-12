import * as z from "zod"
import { CompleteLoads, RelatedLoadsModel, CompleteStates, RelatedStatesModel, CompleteTrucksDriven, RelatedTrucksDrivenModel } from "./index"

export const TrucksModel = z.object({
  ID: z.number().int(),
  Name: z.string().min(1),
  VIN: z.string().nullish(),
  Deleted: z.boolean().nullish(),
  Notes: z.string().nullish(),
  Make: z.string().nullish(),
  LicensePlate: z.string().nullish(),
  Model: z.string().nullish(),
  TruckNumber: z.string().nullish(),
  LicensedState: z.number().int().nullish(),
  /**
   * Model year (required for OO compliance when truck is on file).
   */
  ModelYear: z.number().int().nullish(),
  Active: z.boolean(),
})

export interface CompleteTrucks extends z.infer<typeof TrucksModel> {
  Loads: CompleteLoads[]
  LicensedIn?: CompleteStates | null
  TrucksDriven: CompleteTrucksDriven[]
}

/**
 * RelatedTrucksModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTrucksModel: z.ZodSchema<CompleteTrucks> = z.lazy(() => TrucksModel.extend({
  Loads: RelatedLoadsModel.array(),
  LicensedIn: RelatedStatesModel.nullish(),
  TrucksDriven: RelatedTrucksDrivenModel.array(),
}))
