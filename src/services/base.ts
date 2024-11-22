import {
    MessageType,
    isRequestMessage,
    type ServiceName,
    type ServiceMessage,
    type RequestMessage,
    type Topic,
} from "../util";

declare const self: Worker;

export abstract class BaseService {
    protected readonly serviceName: ServiceName;
    private handlers: Map<string, <T, U>(payload: T) => Promise<U>> = new Map();

    constructor(serviceName: ServiceName) {
        this.serviceName = serviceName;
        this.initialize();
    }

    protected abstract registerHandlers(): void;

    private initialize() {
        self.onmessage = <T extends Topic>(
            event: MessageEvent<ServiceMessage<T>>,
        ) => {
            this.handleMessage(event.data);
        };

        this.registerHandlers();
    }

    protected registerHandler(
        action: string,
        // biome-ignore lint/suspicious/noExplicitAny: <explanation>
        handler: (payload: any) => Promise<any>,
    ) {
        this.handlers.set(action, handler);
    }

    private async handleMessage<T extends Topic>(message: ServiceMessage<T>) {
        if (isRequestMessage(message)) {
            await this.handleRequest(message);
        }
    }

    private async handleRequest(message: RequestMessage) {
        try {
            const handler = this.handlers.get(message.action);

            if (!handler) {
                throw new Error(
                    `No handler registered for action: ${message.action}`,
                );
            }

            const result = await handler(message.payload);

            this.sendResponse({
                type: MessageType.RESPONSE,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                source: this.serviceName,
                target: message.source,
                requestId: message.id,
                // biome-ignore lint/suspicious/noExplicitAny: <explanation>
                payload: result as any,
            });
        } catch (error) {
            this.sendError({
                type: MessageType.ERROR,
                id: crypto.randomUUID(),
                timestamp: Date.now(),
                source: this.serviceName,
                target: message.source,
                error: error instanceof Error ? error.message : "Unknown error",
                requestId: message.id,
            });
        }
    }

    protected sendResponse<T extends Topic>(message: ServiceMessage<T>) {
        self.postMessage(message);
    }

    protected sendError<T extends Topic>(message: ServiceMessage<T>) {
        self.postMessage(message);
    }

    protected broadcast(topic: string, payload: unknown) {
        self.postMessage({
            type: MessageType.BROADCAST,
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            source: this.serviceName,
            topic,
            payload,
        });
    }
}
