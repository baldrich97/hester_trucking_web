import * as z from "zod"
import { CompleteStates, RelatedStatesModel, CompleteDriverForms, RelatedDriverFormsModel, CompleteDrivers, RelatedDriversModel } from "./index"

export const CarriersModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  City: z.string().nullish(),
  ContactName: z.string().nullish(),
  Phone: z.string().nullish(),
  State: z.number().int().nullish(),
  Street: z.string().nullish(),
  ZIP: z.string().nullish(),
})

export interface CompleteCarriers extends z.infer<typeof CarriersModel> {
  States?: CompleteStates | null
  DriverForms: CompleteDriverForms[]
  Drivers: CompleteDrivers[]
}

/**
 * RelatedCarriersModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCarriersModel: z.ZodSchema<CompleteCarriers> = z.lazy(() => CarriersModel.extend({
  States: RelatedStatesModel.nullish(),
  DriverForms: RelatedDriverFormsModel.array(),
  Drivers: RelatedDriversModel.array(),
}))
