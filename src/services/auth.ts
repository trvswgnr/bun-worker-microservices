import { BaseService } from "./base";
import { ServiceName } from "../util";

// Auth-specific types
interface TokenValidationRequest {
    token: string;
}

interface TokenValidationResponse {
    valid: boolean;
    userId?: string;
    error?: string;
}

class AuthService extends BaseService {
    constructor() {
        super(ServiceName.AUTH);
    }

    protected registerHandlers() {
        this.registerHandler("validateToken", this.validateToken.bind(this));
        this.registerHandler("login", this.login.bind(this));
        this.registerHandler("logout", this.logout.bind(this));
    }

    private async validateToken(
        payload: TokenValidationRequest,
    ): Promise<TokenValidationResponse> {
        const request = payload;

        // Simulate token validation
        if (request.token === "valid-token") {
            const response: TokenValidationResponse = {
                valid: true,
                userId: "user-123",
            };

            // Broadcast successful validation
            this.broadcast("token.validated", {
                userId: response.userId,
                timestamp: Date.now(),
            });

            return response;
        }

        return {
            valid: false,
            error: "Invalid token",
        };
    }

    private async login(payload: {
        username: string;
        password: string;
    }): Promise<{ token: string }> {
        // Simulate login logic
        const { username, password } = payload;

        if (username === "admin" && password === "password") {
            const token = "valid-token";

            this.broadcast("user.loggedIn", {
                username,
                timestamp: Date.now(),
            });

            return { token };
        }

        throw new Error("Invalid credentials");
    }

    private async logout(payload: { userId: string }): Promise<{
        success: boolean;
    }> {
        const { userId } = payload;

        // Simulate logout logic
        this.broadcast("user.loggedOut", {
            userId,
            timestamp: Date.now(),
        });

        return { success: true };
    }
}

// Initialize the service
new AuthService();
