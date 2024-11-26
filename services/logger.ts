import { createServiceUtils } from "../shared/util";
import type { NonEmptyArray } from "../shared/types";
import fs from "node:fs";

let mkdirCalled = false;
const validStrategies = {
    console: console.log,
    file: (msg: string) => {
        if (!mkdirCalled) {
            mkdirCalled = true;
        }
        fs.appendFileSync("logs/app.log", `${msg}\n`);
    },
} as const;
type Strategy = keyof typeof validStrategies;

declare const self: Worker;

const { createServiceConstructor } = createServiceUtils("logger", self);

const LoggerService = createServiceConstructor(
    class {
        logFn: (msg: string) => void;
        constructor(strategies: NonEmptyArray<Strategy>) {
            if (strategies.includes("file")) {
                fs.mkdirSync("logs", { recursive: true });
            }
            this.logFn = (msg) => {
                for (const s of Object.keys(validStrategies)) {
                    if (strategies.includes(s as Strategy)) {
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
