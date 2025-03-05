import type {
	Variable,
	Category,
} from "@/components/ui/mention/mention-popover";

export const globalVariables: Variable[] = [
	{
		id: "user",
		name: "user",
		description: "@User mention",
		category: "User",
	},
	{
		id: "user_id",
		name: "user id",
		description: "User ID",
		category: "User",
	},
	{
		id: "username",
		name: "username",
		description: "Username of the user who triggered the event",
		category: "User",
	},
	{
		id: "display_name",
		name: "display name",
		description: "Display name of the user",
		category: "User",
	},
	{
		id: "avatar",
		name: "avatar url",
		description: "Avatar URL of the user",
		category: "User",
	},
	{
		id: "server_name",
		name: "server name",
		description: "Server name",
		category: "Server",
	},
	{
		id: "server_image",
		name: "server image",
		description: "Server image URL",
		category: "Server",
	},
	{
		id: "server_id",
		name: "server id",
		description: "Server ID",
		category: "Server",
	},
];

export const globalCategories: Category[] = [
	{ id: "user", name: "User", icon: "👤" },
	{ id: "server", name: "Server", icon: "🌐" },
];

/**
 * Combines global variables with plugin-specific variables
 * @param pluginVariables Plugin-specific variables
 * @returns Combined array of variables
 */
export function combineVariables(pluginVariables: Variable[]): Variable[] {
	return [...globalVariables, ...pluginVariables];
}

/**
 * Combines global categories with plugin-specific categories
 * @param pluginCategories Plugin-specific categories
 * @returns Combined array of categories
 */
export function combineCategories(pluginCategories: Category[]): Category[] {
	return [...globalCategories, ...pluginCategories];
}
