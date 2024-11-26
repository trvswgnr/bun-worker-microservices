import type { z } from "zod";
import type { services } from "./config";
import type { uuidSchema, userSchema } from "./schema";
import type { WorkerPool } from "./WorkerPool";

export type TupleContains<T extends readonly unknown[], V> = T extends [
    infer First,
    ...infer Rest,
]
    ? First extends V
        ? true
        : TupleContains<Rest, V>
    : false;

export type ActionIn = { args: z.ZodTypeAny; return: z.ZodTypeAny };
export type ServiceIn = {
    /**
     * The relative number of workers to create for this service, as a ratio of
     * the total number of workers.
     */
    numWorkers: number;
    /**
     * The actions that this service can perform.
     */
    actions: Record<string, ActionIn>;
};
export type ServicesIn = Record<string, ServiceIn>;

export type ServiceOut<S extends ServiceIn> = {
    /**
     * The worker pool for this service.
     */
    worker: WorkerPool;
    /**
     * The actions that this service can perform.
     */
    actions: S["actions"];
    /**
     * The number of workers created for this service.
     */
    numWorkers: S["numWorkers"];
};

export type ServicesOut<S extends ServicesIn> = {
    [K in keyof S]: ServiceOut<S[K]>;
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
};

export type ServiceConstructor<
    S extends keyof Services,
    A extends readonly unknown[],
> = {
    new (
        ...args: A
    ): ServiceInstance<S> & { id: string; name: S; init: () => void };
};

export type User = z.infer<typeof userSchema>;

export type NonEmptyArray<T> = [T, ...T[]];
