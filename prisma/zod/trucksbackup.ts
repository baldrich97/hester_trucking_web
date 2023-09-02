import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const TrucksBackupModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  VIN: z.string().nullish(),
  Deleted: z.boolean().nullish(),
  Notes: z.string().nullish(),
})
