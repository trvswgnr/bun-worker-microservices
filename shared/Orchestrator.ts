import { createMessage, createMessageListener } from "./util";
import type {
    ServiceActions,
    Service,
    Services,
    ActionArgs,
    Message,
    ServicesResult,
    GenericServices,
} from "./types";

export class Orchestrator<T extends ServicesResult<GenericServices>> {
    private services: T;

    constructor(services: T) {
        this.services = services;
    }

    public init() {
        for (const [name, service] of Object.entries(this.services)) {
            service.worker.addEventListener(
                "message",
                createMessageListener((event) => {
                    // console.log("orchestrator received message", event.data);
                    if (!event.data) {
                        // console.log("no data for orchestrator message");
                        return;
                    }
                    const target = event.data.target;
                    if (!(target in this.services)) {
                        throw new Error(`Service not found: ${target}`);
                    }
                    const targetService = this.services[target];
                    targetService.worker.postMessage(event.data);
                }),
            );
        }
    }

    call<
        S extends keyof Services,
        T extends keyof Services,
        A extends keyof ServiceActions<Service<T>>,
        Args extends ActionArgs<Service<T>, A>,
    >(
        target: T,
        action: A,
        args: Args,
    ): Message<S, T, typeof action, typeof args> {
        const service = this.services[target];
        const message = createMessage(
            "orchestrator" as never,
            target,
            action,
            args,
        );
        service.worker.postMessage(message);
        return message;
    }
}