import {createRouter} from "./context";

export const statesRouter = createRouter()
    .query("getAll", {
        async resolve({ctx}) {
            return ctx.prisma.states.findMany({});
        },
    })
