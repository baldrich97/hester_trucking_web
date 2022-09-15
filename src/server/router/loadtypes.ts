import {createRouter} from "./context";
import {z} from "zod";

export const loadtypesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return await ctx.prisma.loadTypes.findMany()
        },
    })
    /*.query('get', {
        input: z.object({
            id: z.string()
        }),
        async resolve({ctx, input}) {
            return await ctx.prisma.loadTypes.findUnique({
                where: {
                    id: input.id
                }
            })

        }
    }).mutation('put', {
        // validate input with Zod
        input: z.object({
            description: z.string()
        }),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return await ctx.prisma.loadTypes.create({
                data: input
            })
        },
    }).mutation('post', {
        // validate input with Zod
        input: z.object({
            id: z.string(),
            description: z.string()
        }),
        async resolve({ctx, input}) {
            // use your ORM of choice
            return await ctx.prisma.loadTypes.update({
                where: {
                    id: input.id
                }, data: {
                    description: input.description
                }
            })
        },
    });*/

