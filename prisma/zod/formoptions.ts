import * as z from "zod"
import { CompleteForms, RelatedFormsModel } from "./index"

export const FormOptionsModel = z.object({
  ID: z.number().int(),
  Form: z.number().int(),
  W2Visible: z.boolean(),
  OOVisible: z.boolean(),
  W2Required: z.boolean(),
  OORequired: z.boolean(),
  CompanyWide: z.boolean(),
})

export interface CompleteFormOptions extends z.infer<typeof FormOptionsModel> {
  Forms: CompleteForms
}

/**
 * RelatedFormOptionsModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedFormOptionsModel: z.ZodSchema<CompleteFormOptions> = z.lazy(() => FormOptionsModel.extend({
  Forms: RelatedFormsModel,
}))
