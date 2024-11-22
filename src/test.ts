import { ServiceName } from "./util";
import { ServiceOrchestrator } from "./main";

async function sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function runTests() {
    console.log("Starting microservices test...");
    console.log("=================================");

    const orchestrator = new ServiceOrchestrator();

    // Wait for services to initialize
    await sleep(100);

    try {
        // Test 1: Create a new user
        console.log("\n👤 Test 1: Create User");
        console.log("-------------------------");
        const newUser = await orchestrator.sendRequest(
            ServiceName.USER,
            "createUser",
            {
                username: "testuser",
                email: "test@example.com",
                firstName: "Test",
                lastName: "User",
                preferences: {
                    theme: "dark",
                    notifications: true,
                    language: "en",
                },
            },
        );
        console.log("Created user:", newUser);

        // Test 2: Login with new user
        console.log("\n🔑 Test 2: User Login");
        console.log("-------------------------");
        const loginResponse = await orchestrator.sendRequest(
            ServiceName.AUTH,
            "login",
            { username: "testuser", password: "password" },
        );
        console.log("Login response:", loginResponse);

        // Test 3: Get user profile
        console.log("\n📋 Test 3: Get User Profile");
        console.log("-------------------------");
        // @ts-expect-error
        const userId = newUser.payload.id;
        const userProfile = await orchestrator.sendRequest(
            ServiceName.USER,
            "getUser",
            { userId },
        );
        console.log("User profile:", userProfile);

        // Test 4: Update user preferences
        console.log("\n⚙️ Test 4: Update User Preferences");
        console.log("-------------------------");
        const updatedPreferences = await orchestrator.sendRequest(
            ServiceName.USER,
            "updatePreferences",
            {
                userId,
                preferences: {
                    theme: "light",
                    notifications: false,
                },
            },
        );
        console.log("Updated preferences:", updatedPreferences);

        // Test 5: Check Notifications
        console.log("\n📬 Test 5: Check Notifications");
        console.log("-------------------------");
        const notifications = await orchestrator.sendRequest(
            ServiceName.NOTIFICATION,
            "getNotifications",
            { userId },
        );
        console.log("User notifications:", notifications);

        // Test 6: List all users
        console.log("\n📊 Test 6: List All Users");
        console.log("-------------------------");
        const userList = await orchestrator.sendRequest(
            ServiceName.USER,
            "listUsers",
            { includeInactive: false },
        );
        console.log("Active users:", userList);

        // Test 7: Update user profile
        console.log("\n✏️ Test 7: Update User Profile");
        console.log("-------------------------");
        const updatedUser = await orchestrator.sendRequest(
            ServiceName.USER,
            "updateUser",
            {
                userId,
                updates: {
                    firstName: "Updated",
                    lastName: "Name",
                },
            },
        );
        console.log("Updated user:", updatedUser);

        // Test 8: Validate token
        console.log("\n🔒 Test 8: Token Validation");
        console.log("-------------------------");
        const tokenValidation = await orchestrator.sendRequest(
            ServiceName.AUTH,
            "validateToken",
            { token: "valid-token" },
        );
        console.log("Token validation:", tokenValidation);

        // Test 9: Delete user
        console.log("\n❌ Test 9: Delete User");
        console.log("-------------------------");
        const deleteResponse = await orchestrator.sendRequest(
            ServiceName.USER,
            "deleteUser",
            { userId },
        );
        console.log("Delete response:", deleteResponse);

        // Test 10: Verify user list after deletion
        console.log("\n🔍 Test 10: Verify User List After Deletion");
        console.log("-------------------------");
        const finalUserList = await orchestrator.sendRequest(
            ServiceName.USER,
            "listUsers",
            { includeInactive: true },
        );
        console.log("All users (including inactive):", finalUserList);
    } catch (error) {
        console.error("Test failed:", error);
    } finally {
        // Clean up
        console.log("\n🧹 Cleaning up...");
        orchestrator.shutdown();
        console.log("Tests completed!");
    }
}

// Run the tests
console.log("Press Ctrl+C to exit after tests complete");
runTests();
