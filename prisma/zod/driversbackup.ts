import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const DriversBackupModel = z.object({
  ID: z.number().int(),
  FirstName: z.string(),
  MiddleName: z.string().nullish(),
  LastName: z.string(),
  Street: z.string().nullish(),
  City: z.string().nullish(),
  State: z.number().int().nullish(),
  ZIP: z.string().nullish(),
  DOB: z.date().nullish(),
  License: z.string().nullish(),
  Email: z.string().nullish(),
  Phone: z.string().nullish(),
  Notes: z.string().nullish(),
  Deleted: z.boolean().nullish(),
  HireDate: z.string().nullish(),
})
