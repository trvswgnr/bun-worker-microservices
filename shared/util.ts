import { z } from "zod";
import type {
    ServiceNames,
    ServiceActions,
    Services,
    ActionArgs,
    Message,
    ServiceInstance,
    ServiceConstructor,
    ServicesIn,
    ServicesOut,
} from "./types";
import { baseMessageSchema } from "./schema";
import { WorkerPool } from "./WorkerPool";

export function createServices<const S extends ServicesIn>(
    services: S,
): ServicesOut<S> {
    const maxWorkers = Math.max(1, (navigator.hardwareConcurrency ?? 1) - 1); // sub 1 to leave 1 for the orchestrator
    return Object.fromEntries(
        Object.entries(services).map(([name, service]) => {
            const numWorkers = distributeWorkers(services, maxWorkers)[name]
                .numWorkers;
            const s = {
                worker: new WorkerPool(`./services/${name}.ts`, numWorkers),
                actions: service.actions,
                numWorkers,
            };
            return [name, s];
        }),
    ) as ServicesOut<S>;
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

function createMessage<
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
function createServiceConstructor<
    S extends keyof Services,
    A extends readonly unknown[],
>(
    name: S,
    worker: Worker,
    service: { new (...args: A): ServiceInstance<S> },
): ServiceConstructor<S, A> {
    service.prototype.name = name;
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

        worker.addEventListener("error", (event) => {
            throw (
                event.error ??
                // @ts-expect-error we know name is a property
                new Error(`unknown worker error from service "${this.name}"`)
            );
        });
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

export function distributeWorkers(
    servicesObject: ServicesIn,
    availableWorkers: number,
): ServicesIn {
    const services = Object.entries(servicesObject);
    // calc total ratio sum
    const totalRatio = services.reduce(
        (sum, [_name, service]) => sum + service.numWorkers,
        0,
    );

    // init result map
    const workersPerService = new Map<string, number>();

    // 1st pass: calc raw numbers and handle floor
    let totalAssigned = 0;

    for (const [name, service] of services) {
        // calc raw number of workers based on ratio
        const rawWorkers = (service.numWorkers / totalRatio) * availableWorkers;
        // floor so it's an int
        const assignedWorkers = Math.max(1, Math.floor(rawWorkers));
        workersPerService.set(name, assignedWorkers);
        totalAssigned += assignedWorkers;
    }

    // 2nd pass: distribute rest of workers based on decimal parts
    const remainingToDistribute = availableWorkers - totalAssigned;

    if (remainingToDistribute > 0) {
        // calc decimal parts and sort services by them
        const decimalParts = services
            .map(([name, service]) => ({
                name,
                decimal:
                    ((service.numWorkers / totalRatio) * availableWorkers) % 1,
            }))
            .sort((a, b) => b.decimal - a.decimal);

        // distribute rest of workers to services with highest decimal parts
        for (let i = 0; i < remainingToDistribute; i++) {
            const serviceName = decimalParts[i % services.length].name;
            workersPerService.set(
                serviceName,
                // biome-ignore lint/style/noNonNullAssertion: we know it's there
                workersPerService.get(serviceName)! + 1,
            );
        }
    }

    return Object.fromEntries(
        services.map(([name, service]) => {
            const numWorkers = workersPerService.get(name);
            if (numWorkers === undefined) {
                throw new Error(`Service not found: ${name}`);
            }
            return [name, { ...service, numWorkers }];
        }),
    );
}

export function createUtils<T extends ServiceNames>(name: T, worker: Worker) {
    return {
        createServiceConstructor: <A extends readonly unknown[]>(service: {
            new (...args: A): ServiceInstance<T>;
        }) => createServiceConstructor(name, worker, service),
        createMessage: <
            Target extends ServiceNames,
            Action extends keyof ServiceActions<Services[Target]>,
            Args extends ActionArgs<Services[Target], Action>,
        >(
            target: Target,
            action: Action,
            args: Args,
        ) => createMessage(name, target, action, args),
    };
}
