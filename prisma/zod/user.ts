import * as z from "zod"

export const UserModel = z.object({
  id: z.string(),
  email: z.string(),
  organization: z.string(),
  password: z.string(),
  username: z.string(),
})
