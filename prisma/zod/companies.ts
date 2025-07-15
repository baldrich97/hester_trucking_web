import * as z from "zod"

export const CompaniesModel = z.object({
  ID: z.number().int(),
  Name: z.string(),
})
