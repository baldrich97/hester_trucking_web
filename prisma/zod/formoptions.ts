import * as z from "zod"
import { FormExpiryCadence } from "@prisma/client"
import { CompleteForms, RelatedFormsModel } from "./index"

export const FormOptionsModel = z.object({
  ID: z.number().int(),
  Form: z.number().int(),
  W2Visible: z.boolean(),
  OOVisible: z.boolean(),
  W2Required: z.boolean(),
  OORequired: z.boolean(),
  ExpiryCadence: z.nativeEnum(FormExpiryCadence),
  IncludeInPdf: z.boolean(),
  PdfColumnLabel: z.string().nullish(),
  PdfOrder: z.number().int(),
  /**
   * For `ROLLING_MONTHS`: number of months the filing stays valid from `Created`.
   */
  ValidityMonths: z.number().int().nullish(),
  /**
   * When true, this form is only required for OO entities with more than one truck on file.
   */
  FleetWide: z.boolean(),
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
