export class WorkerPool {
    private workers: Worker[] = [];
    private workerPath: string;
    private currentWorkerIndex: number;

    public onmessage: (<T>(this: Worker, ev: MessageEvent) => T) | null;
    public onmessageerror: (<T>(this: Worker, ev: MessageEvent) => T) | null;
    public onerror: (<T>(this: AbstractWorker, ev: ErrorEvent) => T) | null;

    constructor(
        workerPath: string,
        numWorkers: number,
        options?: WorkerOptions,
    ) {
        this.workerPath = workerPath;
        this.currentWorkerIndex = 0;
        this.onmessage = null;
        this.onmessageerror = null;
        this.onerror = null;

        // init workers
        for (let i = 0; i < numWorkers; i++) {
            this.workers.push(new Worker(this.workerPath, options));
        }
    }

    postMessage<T>(message: T, transfer: Transferable[]): void;
    postMessage<T>(message: T, options?: StructuredSerializeOptions): void;
    postMessage<T>(
        message: T,
        options?: Transferable[] | StructuredSerializeOptions,
    ): void {
        if (this.workers.length === 0) {
            throw new Error("No workers available");
        }
        const currentWorker = this.workers[this.currentWorkerIndex];
        this.currentWorkerIndex =
            (this.currentWorkerIndex + 1) % this.workers.length;
        currentWorker.postMessage(message, options as never);
    }

    terminate(): void {
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.currentWorkerIndex = 0;
    }

    addEventListener<K extends keyof WorkerEventMap>(
        type: K,
        listener: (this: Worker, ev: WorkerEventMap[K]) => void,
        options?: boolean | AddEventListenerOptions,
    ): void {
        for (const worker of this.workers) {
            worker.addEventListener(type, listener, options);
        }
    }

    removeEventListener<K extends keyof WorkerEventMap>(
        type: K,
        listener: (this: Worker, ev: WorkerEventMap[K]) => void,
        options?: boolean | EventListenerOptions,
    ): void {
        for (const worker of this.workers) {
            worker.removeEventListener(type, listener, options);
        }
    }

    dispatchEvent<Ev extends Event>(event: Ev): boolean {
        return this.workers.every((worker) => worker.dispatchEvent(event));
    }
}
