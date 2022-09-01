import {Account, User} from "next-auth";

declare module "next-auth/jwt" {
  /** Returned by the `jwt` callback and `getToken`, when using JWT sessions */
  interface JWT {
    /** OpenID ID Token */
    idToken?: string;
    user?: Pick<User, "id" | "username" | "email" | "organization">
  }
}
declare module "next-auth" {
  /**
   * Returned by `useSession`, `getSession` and received as a prop on the `SessionProvider` React Context
   */
  interface Session {
    user?: Pick<User, "id" | "username" | "email" | "organization">
  }

  interface User {
    id: string;
    password: string;
    username: string;
    email: string
    organization: string
    accounts: Account[];
  }
}