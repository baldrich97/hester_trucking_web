import * as z from "zod"
import { CompleteLoadTypes, RelatedLoadTypesModel, CompleteSources, RelatedSourcesModel } from "./index"

export const SourceLoadTypesModel = z.object({
  ID: z.number().int(),
  SourceID: z.number().int(),
  LoadTypeID: z.number().int(),
  UseCount: z.number().int(),
  Created: z.date(),
})

export interface CompleteSourceLoadTypes extends z.infer<typeof SourceLoadTypesModel> {
  LoadTypes: CompleteLoadTypes
  Sources: CompleteSources
}

/**
 * RelatedSourceLoadTypesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedSourceLoadTypesModel: z.ZodSchema<CompleteSourceLoadTypes> = z.lazy(() => SourceLoadTypesModel.extend({
  LoadTypes: RelatedLoadTypesModel,
  Sources: RelatedSourcesModel,
}))
