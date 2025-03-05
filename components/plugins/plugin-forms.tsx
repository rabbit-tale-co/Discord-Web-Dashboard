import { LevelsForm } from "./levels/levels-form";
import { WelcomeForm } from "./welcome/welcome-form";
import type { PluginTypes } from "@/hooks/use-plugins";

// Map of plugin IDs to their form components
export const PLUGIN_FORMS: Record<
	string,
	React.ComponentType<{ plugin: PluginTypes }>
> = {
	levels: LevelsForm as unknown as React.ComponentType<{ plugin: PluginTypes }>,
	welcome_goodbye: WelcomeForm as unknown as React.ComponentType<{
		plugin: PluginTypes;
	}>,
	// Add more plugin forms here as they are created
	// Example:
	// welcome: WelcomeForm,
	// moderation: ModerationForm,
};

// Type guard to check if a plugin has a form
export function hasPluginForm(pluginId: string): boolean {
	return pluginId in PLUGIN_FORMS;
}

// Get the form component for a plugin
export function getPluginForm(pluginId: string) {
	return PLUGIN_FORMS[pluginId];
}
