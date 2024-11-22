import { BaseService } from "./base";
import {
    ServiceName,
    type ServiceMessage,
    MessageType,
    type Topic,
} from "../util";

interface Notification {
    userId: string;
    message: string;
    type: "info" | "success" | "error";
    timestamp: number;
}

class NotificationService extends BaseService {
    private notifications: Notification[] = [];

    constructor() {
        super(ServiceName.NOTIFICATION);
    }

    protected registerHandlers() {
        this.registerHandler(
            "sendNotification",
            this.sendNotification.bind(this),
        );
        this.registerHandler(
            "getNotifications",
            this.getNotifications.bind(this),
        );

        // Listen for broadcasts from other services
        self.addEventListener(
            "message",
            <T extends Topic>(event: MessageEvent<ServiceMessage<T>>) => {
                if (event.data.type === MessageType.BROADCAST) {
                    this.handleBroadcast(event.data);
                }
            },
        );
    }

    private async sendNotification(
        payload: Notification,
    ): Promise<{ success: boolean }> {
        const notification = payload;
        this.notifications.push(notification);

        console.log(
            `[Notification Service] New notification for user ${notification.userId}: ${notification.message}`,
        );
        return { success: true };
    }

    private async getNotifications(payload: { userId: string }): Promise<
        Notification[]
    > {
        return this.notifications.filter((n) => n.userId === payload.userId);
    }

    private handleBroadcast<T extends Topic>(message: ServiceMessage<T>) {
        if (message.type === MessageType.BROADCAST) {
            switch (message.topic) {
                case "user.loggedIn":
                    this.handleUserLogin(
                        message.payload as { username: string },
                    );
                    break;
                case "user.loggedOut":
                    this.handleUserLogout(
                        message.payload as { userId: string },
                    );
                    break;
            }
        }
    }

    private handleUserLogin(payload: { username: string }) {
        const notification: Notification = {
            userId: payload.username,
            message: `Welcome back, ${payload.username}!`,
            type: "success",
            timestamp: Date.now(),
        };
        this.notifications.push(notification);
        console.log(
            `[Notification Service] Login notification created for ${payload.username}`,
        );
    }

    private handleUserLogout(payload: { userId: string }) {
        const notification: Notification = {
            userId: payload.userId,
            message: "You have been logged out successfully",
            type: "info",
            timestamp: Date.now(),
        };
        this.notifications.push(notification);
        console.log(
            `[Notification Service] Logout notification created for ${payload.userId}`,
        );
    }
}

// Initialize the service
new NotificationService();
