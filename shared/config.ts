import { z } from "zod";
import { createServices, createMessageSchema } from "./util";
import { userSchema } from "./schema";

export const services = createServices({
    user: {
        getUser: {
            args: z.tuple([z.string()]),
            return: userSchema,
        },
        logUser: {
            args: z.tuple([z.string()]),
            return: createMessageSchema("logger", "log", [z.string()]),
        },
    },
    logger: {
        log: {
            args: z.tuple([z.string()]),
            return: z.void(),
        },
    },
});
