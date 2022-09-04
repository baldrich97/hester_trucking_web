import {createRouter} from "./context";
import {z} from "zod";

export const loadtypesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return await ctx.prisma.load_Type.findMany();
        },
    })
    .query('get', {
        input: z.object({
            id: z.string()
        }),
        async resolve({ctx, input}) {
            return await ctx.prisma.load_Type.findUnique({
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
            return await ctx.prisma.load_Type.create({
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
            return await ctx.prisma.load_Type.update({
                where: {
                    id: input.id
                }, data: {
                    description: input.description
                }
            })
        },
    });

