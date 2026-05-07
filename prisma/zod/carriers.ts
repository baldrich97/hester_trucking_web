import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteDriverForms, RelatedDriverFormsModel, CompleteStates, RelatedStatesModel } from "./index"

export const CarriersModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  ContactName: z.string().nullish(),
  Phone: z.string().nullish(),
  Street: z.string().nullish(),
  City: z.string().nullish(),
  State: z.number().int().nullish(),
  ZIP: z.string().nullish(),
})

export interface CompleteCarriers extends z.infer<typeof CarriersModel> {
  Drivers: CompleteDrivers[]
  DriverForms: CompleteDriverForms[]
  States?: CompleteStates | null
}

/**
 * RelatedCarriersModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCarriersModel: z.ZodSchema<CompleteCarriers> = z.lazy(() => CarriersModel.extend({
  Drivers: RelatedDriversModel.array(),
  DriverForms: RelatedDriverFormsModel.array(),
  States: RelatedStatesModel.nullish(),
}))
