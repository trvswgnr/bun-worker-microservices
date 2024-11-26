import { createUtils } from "../shared/util";

declare const self: Worker;

const { createMessage, createServiceConstructor } = createUtils("user", self);

const UserService = createServiceConstructor(
    class {
        getUser(id: string) {
            return { id, name: "travvy" };
        }
        logUser(id: string) {
            const user = this.getUser(id);
            return createMessage("logger", "log", [`${user.id} ${user.name}`]);
        }
    },
);

const userService = new UserService();
userService.init();
