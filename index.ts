import { Orchestrator } from "./shared/Orchestrator";
import { services } from "./shared/config";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const orchestrator = new Orchestrator(services);
orchestrator.init();

orchestrator.call("user", "logUser", ["123"]);
await sleep(1000);
orchestrator.call("user", "logUser", ["234"]);
await sleep(1000);
orchestrator.call("user", "logUser", ["345"]);
await sleep(1000);
orchestrator.call("user", "logUser", ["456"]);
await sleep(200);
