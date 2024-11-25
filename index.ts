import { Orchestrator } from "./orchestrator";
import { services } from "./config";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const orchestrator = new Orchestrator(services);
orchestrator.init();

orchestrator.call("logger", "user", "logUser", ["123"]);
await sleep(1000);
orchestrator.call("logger", "user", "logUser", ["234"]);
await sleep(1000);
orchestrator.call("logger", "user", "logUser", ["345"]);
await sleep(1000);
orchestrator.call("logger", "user", "logUser", ["456"]);
