import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const LoadTypesBackupModel = z.object({
  ID: z.number().int(),
  Description: z.string(),
  Deleted: z.boolean().nullish(),
  SourceID: z.number().int().nullish(),
  Notes: z.string().nullish(),
})
