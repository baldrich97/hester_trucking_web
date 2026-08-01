import * as z from "zod"
import { CompleteJobs, RelatedJobsModel, CompleteLoads, RelatedLoadsModel, CompleteSourceLoadTypes, RelatedSourceLoadTypesModel, CompleteWeeklies, RelatedWeekliesModel } from "./index"

export const SourcesModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  ShortName: z.string().nullish(),
})

export interface CompleteSources extends z.infer<typeof SourcesModel> {
  Jobs: CompleteJobs[]
  Loads: CompleteLoads[]
  SourceLoadTypes: CompleteSourceLoadTypes[]
  Weeklies: CompleteWeeklies[]
}

/**
 * RelatedSourcesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedSourcesModel: z.ZodSchema<CompleteSources> = z.lazy(() => SourcesModel.extend({
  Jobs: RelatedJobsModel.array(),
  Loads: RelatedLoadsModel.array(),
  SourceLoadTypes: RelatedSourceLoadTypesModel.array(),
  Weeklies: RelatedWeekliesModel.array(),
}))
