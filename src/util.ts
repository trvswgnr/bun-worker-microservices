/**
 * Service identifiers
 */
export enum ServiceName {
    AUTH = "auth",
    USER = "user",
    NOTIFICATION = "notification",
}

/**
 * Message types for inter-service communication
 */
export enum MessageType {
    REQUEST = "request",
    RESPONSE = "response",
    BROADCAST = "broadcast",
    ERROR = "error",
}

/**
 * Base message interface
 */
export interface BaseMessage {
    type: MessageType;
    id: string; // Unique message identifier
    timestamp: number;
    source: ServiceName;
    target?: ServiceName; // Optional for broadcasts
}

/**
 * Request-specific message
 */
export interface RequestMessage extends BaseMessage {
    type: MessageType.REQUEST;
    action: string;
    payload: unknown;
}

export type BroadcastMessageMap = {
    "user.loggedIn": {
        topic: "user.loggedIn";
        payload: { username: string };
    };
    "user.loggedOut": {
        topic: "user.loggedOut";
        payload: { userId: string };
    };
    "token.validated": {
        topic: "token.validated";
        payload: { userId: string };
    };
};

export type Topic = keyof BroadcastMessageMap;
export type Payload<T extends Topic> = BroadcastMessageMap[T]["payload"];

/**
 * Response-specific message
 */
export interface ResponseMessage<T extends Topic> extends BaseMessage {
    type: MessageType.RESPONSE;
    requestId: string;
    payload: Payload<T>;
}

/**
 * Broadcast message
 */
export type BroadcastMessage<T extends Topic> = BroadcastMessageMap[T] & {
    type: MessageType.BROADCAST;
} & BaseMessage;

/**
 * Error message
 */
export interface ErrorMessage extends BaseMessage {
    type: MessageType.ERROR;
    error: string;
    requestId?: string;
}

/**
 * Union type for all possible messages
 */
export type ServiceMessage<T extends Topic> =
    | RequestMessage
    | ResponseMessage<T>
    | BroadcastMessage<T>
    | ErrorMessage;

export const isRequestMessage = <T extends Topic>(
    msg: ServiceMessage<T>,
): msg is RequestMessage => msg.type === MessageType.REQUEST;

export const isResponseMessage = <T extends Topic>(
    msg: ServiceMessage<T>,
): msg is ResponseMessage<T> => msg.type === MessageType.RESPONSE;

export const isBroadcastMessage = <T extends Topic>(
    msg: ServiceMessage<T>,
): msg is BroadcastMessage<T> => msg.type === MessageType.BROADCAST;

export const isErrorMessage = <T extends Topic>(
    msg: ServiceMessage<T>,
): msg is ErrorMessage => msg.type === MessageType.ERROR;
