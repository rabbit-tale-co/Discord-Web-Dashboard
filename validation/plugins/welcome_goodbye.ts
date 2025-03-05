import { z } from "zod";
import type { z as zType } from "zod";
import { commonSchemas, createPluginSchema } from "../index";

// Schema for embed configuration
const embedSchema = createPluginSchema({
	title: commonSchemas.stringField,
	description: commonSchemas.stringField,
	color: commonSchemas.embedColor,
	thumbnail_url: commonSchemas.stringField,
	image_url: commonSchemas.stringField,
	footer_text: commonSchemas.stringField,
	footer_icon_url: commonSchemas.stringField,
	fields: commonSchemas.embedFields,
});

// Schema for welcome/goodbye configuration
export const welcomeGoodbyeSchema = createPluginSchema({
	// Common fields
	type: z.enum(["text", "embed"]).default("text"),
	channel_id: commonSchemas.channelId,

	// Text message fields
	welcome_message: commonSchemas.stringField.default(""),
	goodbye_message: commonSchemas.stringField.default(""),

	// Embed fields
	embed: embedSchema,
});

// Type for the welcome/goodbye plugin configuration
export type WelcomeGoodbyeConfig = zType.infer<typeof welcomeGoodbyeSchema>;
