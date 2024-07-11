import * as z from "zod"

export const UserModel = z.object({
  id: z.number().int(),
  email: z.string(),
  organization: z.string(),
  password: z.string(),
  username: z.string(),
})
