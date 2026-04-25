import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel } from "./index"

export const CarriersModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
})

export interface CompleteCarriers extends z.infer<typeof CarriersModel> {
  Drivers: CompleteDrivers[]
}

/**
 * RelatedCarriersModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedCarriersModel: z.ZodSchema<CompleteCarriers> = z.lazy(() => CarriersModel.extend({
  Drivers: RelatedDriversModel.array(),
}))
