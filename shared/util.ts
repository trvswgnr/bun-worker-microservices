import { z } from "zod";
import type {
    ServiceNames,
    ServiceActions,
    Services,
    ActionArgs,
    Message,
    ServiceInstance,
    ServiceConstructor,
    GenericServices,
    ServicesResult,
} from "./types";
import { baseMessageSchema } from "./schema";
import { WorkerPool } from "./WorkerPool";

export function createServices<const S extends GenericServices>(
    services: S,
): ServicesResult<S> {
    const maxWorkers = Math.max(1, navigator.hardwareConcurrency ?? 1) - 1; // sub 1 to leave 1 for the orchestrator
    const workersEach = Math.max(
        1,
        Math.floor(maxWorkers / Object.keys(services).length),
    );
    return Object.fromEntries(
        Object.entries(services).map(([name, actions]) => {
            const service = {
                worker: new WorkerPool(`./services/${name}.ts`, workersEach),
                actions,
            };
            return [name, service];
        }),
    ) as ServicesResult<S>;
}

export function createMessageSchema<
    Target extends string,
    Action extends string,
    Args extends [] | [z.ZodTypeAny, ...z.ZodTypeAny[]],
>(target: Target, action: Action, args: Args) {
    return baseMessageSchema.extend({
        target: z.literal(target),
        action: z.literal(action),
        args: z.tuple(args),
    });
}

export function createMessage<
    Source extends ServiceNames,
    Target extends ServiceNames,
    Action extends keyof ServiceActions<Services[Target]>,
    Args extends ActionArgs<Services[Target], Action>,
>(
    source: Source,
    target: Target,
    action: Action,
    args: Args,
): Message<Source, Target, Action, Args> {
    return {
        id: crypto.randomUUID(),
        createdAt: new Date(),
        source,
        target,
        action,
        args,
    };
}
export function createServiceConstructor<
    S extends keyof Services,
    A extends readonly unknown[],
>(
    worker: Worker,
    service: { new (...args: A): ServiceInstance<S> },
): ServiceConstructor<S, A> {
    service.prototype.id = crypto.randomUUID();
    service.prototype.init = function (this: ServiceInstance<S>) {
        worker.addEventListener(
            "message",
            createMessageListener((event) => {
                // console.log(
                //     "service",
                //     this.name,
                //     "received message",
                //     event.data,
                // );
                if (!event.data) {
                    console.log("No data for service message");
                    return;
                }
                const { action, args, target } = event.data;
                if (action in this) {
                    const result = this[action](...args);
                    return worker.postMessage(result);
                }
                return worker.postMessage({
                    error: `Action not found for ${String(target)}: ${String(
                        action,
                    )}`,
                });
            }),
        );
    };
    return service as ServiceConstructor<S, A>;
}

export function createMessageListener(
    listener: <
        TSource extends ServiceNames,
        TTarget extends ServiceNames,
        TAction extends keyof ServiceActions<Services[TTarget]>,
        TArgs extends ActionArgs<Services[TTarget], TAction>,
    >(
        event: MessageEvent<
            Message<TSource, TTarget, TAction, TArgs> | undefined
        >,
    ) => void,
) {
    return listener;
}
