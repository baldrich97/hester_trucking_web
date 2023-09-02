import * as z from "zod"
import * as imports from "../../src/utils/zodParsers"

export const DeliveryLocationsBackupModel = z.object({
  ID: z.number().int(),
  Description: z.string(),
  Deleted: z.boolean().nullish(),
  CustomerID: z.number().int().nullish(),
})
