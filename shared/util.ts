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

        worker.addEventListener("error", (event) => {
            throw (
                event.error ??
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

// function assert(condition: boolean, message: string) {
//     if (!condition) {
//         throw new Error(`Assertion failed: ${message}`);
//     }
// }

/** helper function to sum all workers in a distribution */
function getTotalWorkers(distribution: Map<string, number>): number {
    return Array.from(distribution.values()).reduce(
        (sum, count) => sum + count,
        0,
    );
}

// // tests
// function runTests() {
//     console.log("Running tests...");

//     // 1: basic
//     {
//         const services = [
//             { name: "A", ratio: 2 },
//             { name: "B", ratio: 1 },
//             { name: "C", ratio: 1 },
//         ];
//         const result = assignNumWorkers(services, 8);
//         assert(
//             result.get("A") === 4,
//             "Service A should get 4 workers (2/4 ratio of 8 workers)",
//         );
//         assert(
//             result.get("B") === 2,
//             "Service B should get 2 workers (1/4 ratio of 8 workers)",
//         );
//         assert(
//             result.get("C") === 2,
//             "Service C should get 2 workers (1/4 ratio of 8 workers)",
//         );
//         assert(
//             getTotalWorkers(result) === 8,
//             "Total workers should be 8 (9 - 1 orchestrator)",
//         );
//     }

//     // 2: equal
//     {
//         const services = [
//             { name: "A", ratio: 1 },
//             { name: "B", ratio: 1 },
//             { name: "C", ratio: 1 },
//         ];
//         const result = assignNumWorkers(services, 6);
//         assert(
//             result.get("A") === 2,
//             "Service A should get 2 workers (equal ratio)",
//         );
//         assert(
//             result.get("B") === 2,
//             "Service B should get 2 workers (equal ratio)",
//         );
//         assert(
//             result.get("C") === 2,
//             "Service C should get 2 workers (equal ratio)",
//         );
//         assert(
//             getTotalWorkers(result) === 6,
//             "Total workers should be 6 (7 - 1 orchestrator)",
//         );
//     }

//     // 3: small worker pool
//     {
//         const services = [
//             { name: "A", ratio: 3 },
//             { name: "B", ratio: 2 },
//             { name: "C", ratio: 1 },
//         ];
//         const result = assignNumWorkers(services, 3);
//         assert(
//             getTotalWorkers(result) === 3,
//             "Total workers should be 3 (4 - 1 orchestrator)",
//         );

//         assert(result.get("A") === 1, "Service A should get at least 1 worker");
//         assert(result.get("B") === 1, "Service B should get at least 1 worker");
//         assert(
//             result.get("C") === 1,
//             "Service C might get 0 workers due to small pool, but should get at least 1",
//         );
//     }

//     // 4: single
//     {
//         const services = [{ name: "A", ratio: 1 }];
//         const result = assignNumWorkers(services, 4);
//         assert(
//             result.get("A") === 4,
//             "Single service should get all workers minus orchestrator",
//         );
//         assert(
//             getTotalWorkers(result) === 4,
//             "Total workers should be 4 (5 - 1 orchestrator)",
//         );
//     }

//     // 5: large ratios
//     {
//         const services = [
//             { name: "A", ratio: 100 },
//             { name: "B", ratio: 50 },
//             { name: "C", ratio: 25 },
//         ];
//         const result = assignNumWorkers(services, 9);
//         assert(
//             getTotalWorkers(result) === 9,
//             "Total workers should be 9 (10 - 1 orchestrator)",
//         );
//         assert(
//             // biome-ignore lint/style/noNonNullAssertion: we know they're there
//             result.get("A")! > result.get("B")!,
//             "Service A should get more workers than B",
//         );
//         assert(
//             // biome-ignore lint/style/noNonNullAssertion: we know they're there
//             result.get("B")! > result.get("C")!,
//             "Service B should get more workers than C",
//         );
//     }

//     // 6: even number (again)
//     {
//         const services = [
//             { name: "a", ratio: 2 },
//             { name: "b", ratio: 2 },
//             { name: "c", ratio: 2 },
//             { name: "d", ratio: 2 },
//         ];
//         const result = assignNumWorkers(services, 15);
//         console.log(result);
//         assert(result.get("a") === 4, `shit got ${result.get("a")}`);
//     }

//     console.log("All tests passed!");
// }

// // Run the tests
// try {
//     runTests();
// } catch (e) {
//     const error = e instanceof Error ? e : new Error("unknown error");
//     console.error("Test failed:", error.message);
// }
