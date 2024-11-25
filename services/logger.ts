import { createServiceConstructor } from "../util";

declare const self: Worker;

const LoggerService = createServiceConstructor(
    self,
    class {
        name = "logger" as const;
        log(msg: string) {
            console.log(msg);
        }
    },
);

const logger = new LoggerService();
logger.init();
