import * as z from "zod"
import { CompleteDriverForms, RelatedDriverFormsModel, CompleteFormOptions, RelatedFormOptionsModel } from "./index"

export const FormsModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  DisplayName: z.string(),
})

export interface CompleteForms extends z.infer<typeof FormsModel> {
  DriverForms: CompleteDriverForms[]
  FormOptions: CompleteFormOptions[]
}

/**
 * RelatedFormsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedFormsModel: z.ZodSchema<CompleteForms> = z.lazy(() => FormsModel.extend({
  DriverForms: RelatedDriverFormsModel.array(),
  FormOptions: RelatedFormOptionsModel.array(),
}))
