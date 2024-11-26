import { createServiceConstructor } from "../shared/util";
import fs from "node:fs";

const validStrategies = {
    console: console.log,
    file: (msg: string) => fs.appendFileSync("log.txt", `${msg}\n`),
} as const;
type Strategy = keyof typeof validStrategies;

declare const self: Worker;

const LoggerService = createServiceConstructor(
    self,
    class {
        logFn: (msg: string) => void;
        name = "logger" as const;
        constructor(strategy: Strategy[]) {
            this.logFn = (msg) => {
                for (const s of Object.keys(validStrategies)) {
                    if (strategy.includes(s as Strategy)) {
                        validStrategies[s as Strategy](msg);
                    }
                }
            };
        }
        log(msg: string) {
            this.logFn(msg);
        }
    },
);

const logger = new LoggerService(["file"]);
logger.init();
