import type { z } from "zod";
import type { services } from "./config";
import type { uuidSchema, userSchema } from "./schema";
import type { WorkerPool } from "./WorkerPool";

export type GenericAction = { args: z.ZodTypeAny; return: z.ZodTypeAny };
export type GenericService = Record<string, GenericAction>;
export type GenericServices = Record<string, GenericService>;
export type ServicesResult<S extends GenericServices> = {
    [K in keyof S]: {
        worker: WorkerPool;
        actions: S[K];
    };
};

export type Services = typeof services;
export type ServiceNames = keyof Services;
export type Service<T extends ServiceNames> = Services[T];
export type ServiceActions<S extends Service<ServiceNames>> = S["actions"];

export type ActionArgs<
    S extends Service<keyof Services>,
    T extends keyof ServiceActions<S>,
> = ServiceActions<S>[T] extends {
    args: infer A extends z.ZodType;
}
    ? z.infer<A>
    : never;

export type ActionReturn<
    S extends Service<keyof Services>,
    T extends keyof ServiceActions<S>,
> = ServiceActions<S>[T] extends {
    return: infer R extends z.ZodType;
}
    ? z.infer<R>
    : never;

export type Message<
    Source extends ServiceNames,
    Target extends ServiceNames,
    Action extends keyof ServiceActions<Services[Target]>,
    Args extends ActionArgs<Services[Target], Action>,
> = {
    id: z.infer<typeof uuidSchema>;
    createdAt: Date;
    source: Source;
    target: Target;
    action: Action;
    args: Args;
};

export type ServiceInstance<S extends keyof Services> = {
    [K in keyof ServiceActions<Services[S]>]: (
        ...args: ActionArgs<Services[S], K>
    ) => ActionReturn<Services[S], K>;
} & { name: S };

export type ServiceConstructor<
    S extends keyof Services,
    A extends readonly unknown[],
> = {
    new (...args: A): ServiceInstance<S> & { name: S; init: () => void };
};

export type User = z.infer<typeof userSchema>;
