import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const CustomersBackupModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
  Street: z.string(),
  City: z.string(),
  State: z.number().int(),
  ZIP: z.string(),
  Phone: z.string().nullish(),
  Email: z.string().nullish(),
  Notes: z.string().nullish(),
  MainContact: z.string().nullish(),
  Deleted: z.boolean().nullish(),
})
