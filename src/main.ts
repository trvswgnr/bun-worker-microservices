import {
    ServiceName,
    MessageType,
    isResponseMessage,
    isErrorMessage,
    isBroadcastMessage,
    type ServiceMessage,
    type Topic,
} from "./util";

export class ServiceOrchestrator {
    private workers: Map<ServiceName, Worker> = new Map();
    private messageCallbacks: Map<
        string,
        <T extends Topic>(message: ServiceMessage<T>) => void
    > = new Map();

    constructor() {
        this.initializeServices();
    }

    private initializeServices() {
        // Initialize each service worker
        for (const serviceName of Object.values(ServiceName)) {
            const worker = new Worker(`./services/${serviceName}.ts`);

            worker.onmessage = <T extends Topic>(
                event: MessageEvent<ServiceMessage<T>>,
            ) => {
                this.handleWorkerMessage(event.data);
            };

            worker.addEventListener("error", (error) => {
                console.error(`Error in ${serviceName} service:`, error);
            });

            this.workers.set(serviceName, worker);
        }
    }

    private handleWorkerMessage<T extends Topic>(message: ServiceMessage<T>) {
        if (isResponseMessage(message) || isErrorMessage(message)) {
            // Handle response to a specific request
            const callback = this.messageCallbacks.get(message.requestId || "");
            if (callback) {
                callback(message);
                this.messageCallbacks.delete(message.requestId || "");
            }
        } else if (isBroadcastMessage(message)) {
            // Broadcast to all other services
            this.broadcast(message);
        } else {
            // Forward the message to the target service
            const targetWorker = message.target
                ? this.workers.get(message.target)
                : null;
            if (targetWorker) {
                targetWorker.postMessage(message);
            }
        }
    }

    public async sendRequest<T extends Topic>(
        target: ServiceName,
        action: string,
        payload: unknown,
    ): Promise<ServiceMessage<T>> {
        return new Promise<ServiceMessage<T>>((resolve) => {
            const id = crypto.randomUUID();
            const message = {
                type: MessageType.REQUEST,
                id,
                timestamp: Date.now(),
                source: ServiceName.AUTH, // Main service identifier
                target,
                action,
                payload,
            };

            this.messageCallbacks.set(
                id,
                resolve as <T extends Topic>(
                    message: ServiceMessage<T>,
                ) => void,
            );
            const worker = this.workers.get(target);
            if (worker) {
                worker.postMessage(message);
            } else {
                resolve({
                    type: MessageType.ERROR,
                    id: crypto.randomUUID(),
                    timestamp: Date.now(),
                    source: ServiceName.AUTH,
                    error: `Service ${target} not found`,
                    requestId: id,
                });
            }
        });
    }

    private broadcast<T extends Topic>(message: ServiceMessage<T>) {
        this.workers.forEach((worker, serviceName) => {
            if (serviceName !== message.source) {
                worker.postMessage(message);
            }
        });
    }

    public shutdown() {
        for (const worker of this.workers.values()) {
            worker.terminate();
        }
    }
}
