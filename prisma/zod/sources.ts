import * as z from "zod"
import { CompleteSourceLoadTypes, RelatedSourceLoadTypesModel, CompleteLoads, RelatedLoadsModel, CompleteJobs, RelatedJobsModel, CompleteWeeklies, RelatedWeekliesModel } from "./index"

export const SourcesModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  ShortName: z.string().nullish(),
})

export interface CompleteSources extends z.infer<typeof SourcesModel> {
  SourceLoadTypes: CompleteSourceLoadTypes[]
  Loads: CompleteLoads[]
  Jobs: CompleteJobs[]
  Weeklies: CompleteWeeklies[]
}

/**
 * RelatedSourcesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedSourcesModel: z.ZodSchema<CompleteSources> = z.lazy(() => SourcesModel.extend({
  SourceLoadTypes: RelatedSourceLoadTypesModel.array(),
  Loads: RelatedLoadsModel.array(),
  Jobs: RelatedJobsModel.array(),
  Weeklies: RelatedWeekliesModel.array(),
}))
