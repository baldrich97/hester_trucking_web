import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"
import { CompleteDrivers, RelatedDriversModel, CompleteTrucks, RelatedTrucksModel } from "./index"

export const TrucksDrivenModel = z.object({
  ID: z.number().int(),
  TruckID: z.number().int(),
  DriverID: z.number().int(),
  DateDriven: z.coerce.date(),
})

export interface CompleteTrucksDriven extends z.infer<typeof TrucksDrivenModel> {
  Drivers: CompleteDrivers
  Trucks: CompleteTrucks
}

/**
 * RelatedTrucksDrivenModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedTrucksDrivenModel: z.ZodSchema<CompleteTrucksDriven> = z.lazy(() => TrucksDrivenModel.extend({
  Drivers: RelatedDriversModel,
  Trucks: RelatedTrucksModel,
}))
