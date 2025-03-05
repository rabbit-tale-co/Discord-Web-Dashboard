import type { z } from "zod";
import { commonSchemas, createPluginSchema } from "../index";

export const levelsSchema = createPluginSchema({
	channel_id: commonSchemas.channelId,
	reward_message: commonSchemas.stringField.default(""),
	reward_roles: commonSchemas.levelRoleArray,
	boost_3x_roles: commonSchemas.roleArray,
});

// Type for the levels plugin configuration
export type LevelsConfig = z.infer<typeof levelsSchema>;
