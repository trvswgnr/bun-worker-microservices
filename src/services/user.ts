import { BaseService } from "./base";
import {
    ServiceName,
    type ServiceMessage,
    MessageType,
    type Topic,
    isBroadcastMessage,
    type BroadcastMessage,
    type Payload,
} from "../util";
import { z } from "zod";

const UserProfile = z.object({
    id: z.string(),
    username: z.string(),
    email: z.string(),
    firstName: z.string(),
    lastName: z.string(),
    createdAt: z.number(),
    lastLogin: z.number().optional(),
    isActive: z.boolean(),
    preferences: z.object({
        theme: z.enum(["light", "dark"]),
        notifications: z.boolean(),
        language: z.string(),
    }),
});

type UserProfile = z.infer<typeof UserProfile>;

const UserRepository = z.record(z.string(), UserProfile);
type UserRepository = z.infer<typeof UserRepository>;

class UserService extends BaseService {
    private users: UserRepository = {
        "user-123": {
            id: "user-123",
            username: "admin",
            email: "admin@example.com",
            firstName: "Admin",
            lastName: "User",
            createdAt: Date.now(),
            isActive: true,
            preferences: {
                theme: "light",
                notifications: true,
                language: "en",
            },
        },
    };

    constructor() {
        super(ServiceName.USER);
    }

    protected registerHandlers() {
        // User profile management
        this.registerHandler("createUser", this.createUser.bind(this));
        this.registerHandler("getUser", this.getUser.bind(this));
        this.registerHandler("updateUser", this.updateUser.bind(this));
        this.registerHandler("deleteUser", this.deleteUser.bind(this));
        this.registerHandler("listUsers", this.listUsers.bind(this));
        this.registerHandler(
            "updatePreferences",
            this.updatePreferences.bind(this),
        );

        // Listen for broadcasts from other services
        self.addEventListener(
            "message",
            <T extends Topic>(event: MessageEvent<ServiceMessage<T>>) => {
                if (isBroadcastMessage(event.data)) {
                    this.handleBroadcast(event.data);
                }
            },
        );
    }

    private async createUser(
        payload: Omit<UserProfile, "id" | "createdAt" | "isActive">,
    ): Promise<UserProfile> {
        const userData = payload;
        const newUser: UserProfile = {
            ...userData,
            id: `user-${crypto.randomUUID()}`,
            createdAt: Date.now(),
            isActive: true,
            preferences: userData.preferences || {
                theme: "light",
                notifications: true,
                language: "en",
            },
        };

        this.users[newUser.id] = newUser;

        // Broadcast user creation event
        this.broadcast("user.created", {
            userId: newUser.id,
            username: newUser.username,
        });

        return newUser;
    }

    private async getUser(payload: { userId: string }): Promise<UserProfile> {
        const { userId } = payload;
        const user = this.users[userId];

        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        return user;
    }

    private async updateUser(payload: {
        userId: string;
        updates: Partial<UserProfile>;
    }): Promise<UserProfile> {
        const { userId, updates } = payload;

        const user = this.users[userId];
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        // Prevent updating certain fields
        const { id, createdAt, ...allowedUpdates } = updates;

        this.users[userId] = {
            ...user,
            ...allowedUpdates,
            id: user.id, // Ensure ID cannot be changed
            createdAt: user.createdAt, // Ensure createdAt cannot be changed
        };

        // Broadcast user update event
        this.broadcast("user.updated", {
            userId,
            updates: allowedUpdates,
        });

        return this.users[userId];
    }

    private async deleteUser(payload: { userId: string }): Promise<{
        success: boolean;
    }> {
        const { userId } = payload;

        if (!this.users[userId]) {
            throw new Error(`User not found: ${userId}`);
        }

        // Soft delete - mark as inactive instead of removing
        this.users[userId].isActive = false;

        // Broadcast user deletion event
        this.broadcast("user.deleted", { userId });

        return { success: true };
    }

    private async listUsers(payload: {
        includeInactive?: boolean;
    }): Promise<UserProfile[]> {
        const { includeInactive = false } = payload;

        return Object.values(this.users).filter((user) =>
            includeInactive ? true : user.isActive,
        );
    }

    private async updatePreferences(payload: {
        userId: string;
        preferences: Partial<UserProfile["preferences"]>;
    }): Promise<UserProfile> {
        const { userId, preferences } = payload;

        const user = this.users[userId];
        if (!user) {
            throw new Error(`User not found: ${userId}`);
        }

        this.users[userId] = {
            ...user,
            preferences: {
                ...user.preferences,
                ...preferences,
            },
        };

        // Broadcast preferences update event
        this.broadcast("user.preferences.updated", {
            userId,
            preferences: this.users[userId].preferences,
        });

        return this.users[userId];
    }

    private handleBroadcast<T extends Topic>(message: BroadcastMessage<T>) {
        switch (message.topic) {
            case "user.loggedIn":
                this.handleUserLogin(message.payload);
                break;
            case "user.loggedOut":
                this.handleUserLogout(message.payload);
                break;
            case "token.validated":
                this.handleTokenValidation(message.payload);
                break;
        }
    }

    private handleUserLogin(payload: Payload<"user.loggedIn">) {
        const user = Object.values(this.users).find(
            (u) => u.username === payload.username,
        );
        if (user) {
            user.lastLogin = Date.now();
            console.log(
                `[User Service] Updated last login for user: ${user.username}`,
            );
        }
    }

    private handleUserLogout(payload: { userId: string }) {
        const user = this.users[payload.userId];
        if (user) {
            console.log(`[User Service] Logged out user: ${user.username}`);
        }
    }

    private handleTokenValidation(payload: { userId: string }) {
        const user = this.users[payload.userId];
        if (user) {
            console.log(
                `[User Service] Token validated for user: ${user.username}`,
            );
        }
    }
}

// Initialize the service
new UserService();
