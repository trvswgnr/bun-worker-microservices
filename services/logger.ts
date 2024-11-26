import { createUtils } from "../shared/util";
import fs from "node:fs";

let mkdirCalled = false;
const validStrategies = {
    console: console.log,
    file: (msg: string) => {
        if (!mkdirCalled) {
            fs.mkdirSync("logs", { recursive: true });
            mkdirCalled = true;
        }
        fs.appendFileSync("logs/app.log", `${msg}\n`);
    },
} as const;
type Strategy = keyof typeof validStrategies;

declare const self: Worker;

const utils = createUtils("logger", self);

const LoggerService = utils.createServiceConstructor(
    class {
        logFn: (msg: string) => void;
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

const logger = new LoggerService(["console", "file"]);
logger.init();
