import NextAuth, {type NextAuthOptions} from "next-auth";

// Prisma adapter for NextAuth, optional and can be removed
import {PrismaAdapter} from "@next-auth/prisma-adapter";
import { prisma } from 'server/db/client'
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt, {genSaltSync} from "bcryptjs"
import {Credentials} from "../../../types/types";
import {z} from "zod";
import {UserModel} from "../../../../prisma/zod";

type User = z.infer<typeof UserModel>;



export const authOptions: NextAuthOptions = {
    callbacks: {
        session({session, token}) {
            if (token.user) {
                session.user = token.user;
            }
            return session;
        },
        async jwt({token, user, account}) {
            if (user) {
                token.user = user;
            }
            return token
        }
    },
    // Configure one or more authentication providers
    adapter: PrismaAdapter(prisma),
    providers: [
        CredentialsProvider({
            // The name to display on the sign in form (e.g. "Sign in with...")
            name: "Credentials",
            // The credentials is used to generate a suitable form on the sign in page.
            // You can specify whatever fields you are expecting to be submitted.
            // e.g. domain, username, password, 2FA token, etc.
            // You can pass any HTML attribute to the <input> tag through the object.
            credentials: {
                //email: {label: "Email", type: "email"},
                username: {label: "Username", type: "text"},
                password: {label: "Password", type: "password"},
                //organization: {label: "Organization Name", type: "text"}
            },
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            async authorize(credentials: Credentials | undefined) {
                if (!credentials) {
                    return null;
                }

                // if (credentials.organization === 'bypass') {
                //     return {id: 4, username: 'test', organization: 'test', email: 'test@test.com'}
                // }

                // if (!credentials.username || !credentials.organization || !credentials.password || !credentials.email) {
                //     return null;
                // }

                return await findUser(credentials);
            }
        })
    ],
    session: {
        strategy: 'jwt',
        maxAge: 60 * 60 * 24 * 7,
    },

};

async function findUser(credentials: Credentials): Promise<User | null> {
    const user = await prisma.user.findFirst({
        where: {
            username: credentials.username,
            //email: credentials.email,
            //organization: credentials.organization
        }
    });

    if (!user) {
        return null;
    } else {
        return bcrypt.compareSync(credentials.password, user.password) ? user : null;
    }
}

export default NextAuth(authOptions);
