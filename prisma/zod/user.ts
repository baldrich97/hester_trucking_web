import * as z from "zod"
import * as imports from "../null"

export const UserModel = z.object({
  id: z.string(),
  email: z.string(),
  organization: z.string(),
  password: z.string(),
  username: z.string(),
})
