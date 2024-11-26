import { z } from "zod";
import { createServices, createMessageSchema } from "./util";
import { userSchema } from "./schema";
import type { ServicesIn } from "./types";

export const services = createServices({
    user: {
        numWorkers: 1,
        actions: {
            getUser: {
                args: z.tuple([z.string()]),
                return: userSchema,
            },
            logUser: {
                args: z.tuple([z.string()]),
                return: createMessageSchema("logger", "log", [z.string()]),
            },
        },
    },
    logger: {
        numWorkers: 1,
        actions: {
            log: {
                args: z.tuple([z.string()]),
                return: z.void(),
            },
        },
    },
} satisfies ServicesIn);
