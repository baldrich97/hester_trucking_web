import * as z from "zod"
import { CompleteDrivers, RelatedDriversModel, CompleteForms, RelatedFormsModel, CompleteCarriers, RelatedCarriersModel } from "./index"

export const DriverFormsModel = z.object({
  ID: z.number().int(),
  Driver: z.number().int(),
  Form: z.number().int(),
  Expiration: z.coerce.date().nullish(),
  Created: z.coerce.date(),
  /**
   * When set, this filing is scoped to the carrier (OO entity) rather than only the driver row.
   */
  CarrierID: z.number().int().nullish(),
  /**
   * Optional display of who physically submitted the paperwork.
   */
  Filer: z.string().nullish(),
})

export interface CompleteDriverForms extends z.infer<typeof DriverFormsModel> {
  Drivers: CompleteDrivers
  Forms: CompleteForms
  Carriers?: CompleteCarriers | null
}

/**
 * RelatedDriverFormsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedDriverFormsModel: z.ZodSchema<CompleteDriverForms> = z.lazy(() => DriverFormsModel.extend({
  Drivers: RelatedDriversModel,
  Forms: RelatedFormsModel,
  Carriers: RelatedCarriersModel.nullish(),
}))
