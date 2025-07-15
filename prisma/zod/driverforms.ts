import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteForms, RelatedFormsModel } from "./index"

export const DriverFormsModel = z.object({
  ID: z.number().int(),
  Driver: z.number().int(),
  Form: z.number().int(),
  Expiration: z.coerce.date().nullish(),
  Created: z.coerce.date(),
})

export interface CompleteDriverForms extends z.infer<typeof DriverFormsModel> {
  Drivers: CompleteDrivers
  Forms: CompleteForms
}

/**
 * RelatedDriverFormsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDriverFormsModel: z.ZodSchema<CompleteDriverForms> = z.lazy(() => DriverFormsModel.extend({
  Drivers: RelatedDriversModel,
  Forms: RelatedFormsModel,
}))
