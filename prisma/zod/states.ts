import * as z from "zod"
import { CompleteCustomers, RelatedCustomersModel, CompleteDrivers, RelatedDriversModel } from "./index"

export const StatesModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  Abbreviation: z.string(),
})

export interface CompleteStates extends z.infer<typeof StatesModel> {
  Customers: CompleteCustomers[]
  Drivers: CompleteDrivers[]
}

/**
 * RelatedStatesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedStatesModel: z.ZodSchema<CompleteStates> = z.lazy(() => StatesModel.extend({
  Customers: RelatedCustomersModel.array(),
  Drivers: RelatedDriversModel.array(),
}))
