import { z } from "zod";

// Common schema types that can be reused across plugins
export const commonSchemas = {
	// Basic types
	stringField: z.string().optional(),
	numberField: z.number().optional(),
	booleanField: z.boolean().optional(),

	// Discord specific types
	channelId: z.string().optional(),
	roleId: z.string().optional(),

	// Complex types
	embedColor: z.string().optional(),

	// Arrays
	roleArray: z
		.array(
			z.object({
				role_id: z.string(),
			}),
		)
		.default([]),

	levelRoleArray: z
		.array(
			z.object({
				level: z.coerce.number().default(0),
				role_id: z.string(),
			}),
		)
		.default([]),

	embedFields: z
		.array(
			z.object({
				name: z.string(),
				value: z.string(),
				inline: z.boolean().default(false),
				_id: z.string().optional(),
			}),
		)
		.default([]),
};

// Helper function to create a plugin schema
export function createPluginSchema<T extends z.ZodRawShape>(schema: T) {
	return z.object(schema);
}

// Export all plugin schemas
export * from "./plugins/levels";
export * from "./plugins/welcome_goodbye";
// Add more exports as you create them
