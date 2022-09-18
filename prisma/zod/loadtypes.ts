import * as z from "zod"
import { CompleteCustomerLoadTypes, RelatedCustomerLoadTypesModel, CompleteLoads, RelatedLoadsModel } from "./index"

export const LoadTypesModel = z.object({
  ID: z.number().int(),
  Description: z.string().min(1),
  Deleted: z.boolean().nullish(),
  SourceID: z.number().int().nullish(),
  Notes: z.string().nullish(),
})

export interface CompleteLoadTypes extends z.infer<typeof LoadTypesModel> {
  CustomerLoadTypes: CompleteCustomerLoadTypes[]
  Loads: CompleteLoads[]
}

/**
 * RelatedLoadTypesModel contains all relations on your model in addition to the scalars
 *
 * NOTE: Lazy required in case of potential circular dependencies within schema
 */
export const RelatedLoadTypesModel: z.ZodSchema<CompleteLoadTypes> = z.lazy(() => LoadTypesModel.extend({
  CustomerLoadTypes: RelatedCustomerLoadTypesModel.array(),
  Loads: RelatedLoadsModel.array(),
}))
