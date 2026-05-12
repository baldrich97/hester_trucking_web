import * as z from "zod"
import { CompleteCarriers, RelatedCarriersModel, CompleteCustomers, RelatedCustomersModel, CompleteDrivers, RelatedDriversModel, CompleteTrucks, RelatedTrucksModel } from "./index"

export const StatesModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  Abbreviation: z.string(),
})

export interface CompleteStates extends z.infer<typeof StatesModel> {
  Carriers: CompleteCarriers[]
  Customers: CompleteCustomers[]
  Drivers: CompleteDrivers[]
  TrucksLicensedIn: CompleteTrucks[]
}

/**
 * RelatedStatesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedStatesModel: z.ZodSchema<CompleteStates> = z.lazy(() => StatesModel.extend({
  Carriers: RelatedCarriersModel.array(),
  Customers: RelatedCustomersModel.array(),
  Drivers: RelatedDriversModel.array(),
  TrucksLicensedIn: RelatedTrucksModel.array(),
}))
