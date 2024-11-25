import { z } from "zod";

export type UUID = `${string}-${string}-${string}-${string}-${string}`;

export const uuidSchema = z.string().uuid() as z.ZodType<
    UUID,
    z.ZodStringDef,
    UUID
>;

export const baseMessageSchema = z.object({
    id: uuidSchema,
    createdAt: z.date(),
    source: z.string(),
});

export const userSchema = z.object({
    id: z.string(),
    name: z.string(),
});
