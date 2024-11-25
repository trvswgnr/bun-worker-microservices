# Bun Worker Microservices

A type-safe microservices framework built with TypeScript and [Bun Workers](https://bun.sh/docs/api/workers).

## Features

- Type-safe service communication
- Service isolation via Bun Workers
- Runtime validation with Zod
- Centralized message orchestration
- Full TypeScript support

## Prerequisites

- [Bun](https://bun.sh) v1.1.36 or higher

## Installation

```bash
# clone the repository
git clone https://github.com/trvswgnr/bun-worker-microservices.git

# install dependencies
bun install
```

## Project Structure

- `services/` - Individual service implementations
- `orchestrator.ts` - Message coordinator
- `config.ts` - Service configuration
- `util.ts` - Service creation utilities
- `types.ts` - Type definitions
- `schema.ts` - Zod schemas

## Usage

### Running the Project

```bash
bun run index.ts
```

### Creating a New Service

1. Define your service schema in `config.ts`:

```typescript
export const services = createServices({
    myService: {
        myAction: {
            args: z.tuple([z.string()]),
            return: z.void(),
        }
    }
});
```

2. Create a new service file in `services/myService.ts`:

```typescript
import { createServiceConstructor } from "../util";

declare const self: Worker;

const MyService = createServiceConstructor(
    self,
    class {
        name = "myService" as const;
        myAction(arg: string) {
            // Implementation
        }
    }
);

const myService = new MyService();
myService.init();
```

**Note:** The service name must match the key in the `services` object in `config.ts`.

### Service Communication

Services communicate through the orchestrator:

```typescript
orchestrator.call("sourceService", "targetService", "action", ["argument"]);
```

## Development

Built with:
- [Bun](https://bun.sh/) - Package manager, runtime, and workers
- [Zod](https://zod.dev/) - Runtime type validation
- [Biome](https://biomejs.dev/) - Formatting and linting
- [TypeScript](https://www.typescriptlang.org/) - Static typing

## License

[MIT License](LICENSE)
