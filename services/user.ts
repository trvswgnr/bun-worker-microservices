import { createServiceConstructor, createMessage } from "../util";

declare const self: Worker;

const UserService = createServiceConstructor(
    self,
    class {
        name = "user" as const;
        getUser(id: string) {
            return { id, name: "John Doe" };
        }
        logUser(id: string) {
            const user = this.getUser(id);
            return createMessage(this.name, "logger", "log", [
                `${user.id} ${user.name}`,
            ]);
        }
    },
);

const userService = new UserService();
userService.init();