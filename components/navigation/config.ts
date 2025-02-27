import * as Icon from "@/components/icons";
import type { NavItem, NavSection } from "@/types/navigation";
import { useEffect, useState } from "react";
import type { Plugin } from "@/hooks/use-plugins";
import type { GuildData } from "@/types/guild";
import usePlugins from "@/hooks/use-plugins";

// Add type for available plugin structure
interface AvailablePlugin extends Plugin {
	category: string;
	title: string;
	description: string;
	iconSolid: string;
	premium: boolean;
}

export const navigationConfig: NavSection[] = [
	{
		title: "Plugins",
		iconName: "SolidLogo",
		categories: [
			{
				title: "Analytics",
				iconName: "SolidLogo",
				items: [
					{
						type: "large",
						title: "Server Analytics",
						description:
							"Track member growth, engagement metrics, and activity trends in real-time",
						url: "analytics",
						iconName: "SolidLogo",
					},
					{
						type: "large",
						title: "Level System",
						description:
							"Reward active members with XP, ranks, and customizable role rewards",
						url: "levels",
						iconName: "SolidLogo",
					},
				],
			},
			{
				title: "Moderation",
				iconName: "SolidLogo",
				items: [
					{
						type: "small",
						title: "Moderation Suite",
						description: "Tools for moderation",
						url: "moderation",
						iconName: "SolidLogo",
					},
					{
						type: "small",
						title: "Auto Roles",
						description: "Role assignment and management",
						url: "roles",
						iconName: "SolidLogo",
					},
				],
			},
			{
				title: "Community",
				iconName: "SolidLogo",
				items: [
					{
						type: "small",
						title: "Birthday System",
						description: "Birthday celebrations and announcements",
						url: "birthdays",
						iconName: "SolidLogo",
					},
					{
						type: "small",
						title: "Ticket System",
						description: "Ticket management with transcripts",
						url: "tickets",
						iconName: "SolidLogo",
					},
					{
						type: "small",
						title: "Temporary Channels",
						description:
							"Dynamic voice channels that auto-delete when inactive",
						url: "tempvc",
						iconName: "SolidLogo",
					},
				],
			},
		],
	},
	{
		title: "Solutions",
		iconName: "SolidLogo",
		categories: [
			{
				title: "Solutions",
				items: [
					{
						type: "large",
						title: "For Small Servers",
						description:
							"TinyRabbit is perfect for small servers with limited resources. It offers basic moderation tools and analytics to help you manage your community.",
						url: "/solutions/growth",
						minWidth: 1024 / 3,
					},
					{
						type: "large",
						title: "For Medium Servers",
						description:
							"TinyRabbit is perfect for medium servers with moderate resources. It offers advanced moderation tools, auto-mod, and audit logging to keep your server safe.",
						url: "/solutions/security",
						minWidth: 1024 / 3,
					},
					{
						type: "large",
						title: "For Large Servers",
						description:
							"TinyRabbit is perfect for large servers with ample resources. It offers a comprehensive set of tools to help you manage your community.",
						url: "/solutions/support",
						minWidth: 1024 / 3,
					},
				],
			},
		],
	},
	{
		title: "Developers",
		iconName: "SolidLogo",
		categories: [
			{
				title: "Developers",
				items: [
					{
						type: "large",
						title: "Dashboard",
						description: "Control your server from one place",
						url: "/developers/dashboard",
						minWidth: 420,
					},
					{
						type: "small",
						title: "Documentation",
						description: "Integration guides and API reference",
						iconName: "SolidLogo",
						url: "/developers/docs",
					},
					{
						type: "small",
						title: "Commands",
						description: "List of all available bot commands",
						iconName: "SolidLogo",
						url: "/developers/commands",
					},
					{
						type: "small",
						title: "Plugins",
						description: "Extend your bot's functionality",
						iconName: "SolidLogo",
						url: "/developers/plugins",
					},
					{
						type: "small",
						title: "Support",
						description: "Get help from our community",
						iconName: "SolidDiscord",
						url: "/developers/support",
					},
					{
						type: "small",
						title: "GitHub",
						description: "View our open source code",
						iconName: "SolidLogo",
						url: "https://github.com/TinyRabbit",
					},
				],
			},
		],
	},
	{
		title: "Company",
		iconName: "SolidLogo",
		categories: [
			{
				title: "Company",
				items: [
					{
						type: "large",
						title: "Latest Updates",
						description: "Check out our newest features and improvements",
						url: "/blog",
						minWidth: 420,
					},
					{
						type: "large",
						title: "Join Our Community",
						description: "Follow us for the latest news and updates",
						url: "https://discord.gg/RfBydgJpmU",
						minHeight: "132px",
					},
					{
						type: "small",
						title: "About TinyRabbit",
						description:
							"Learn about our mission to empower Discord communities",
						iconName: "SolidLogo",
						url: "/about",
					},
				],
			},
		],
	},
];

export function useNavigationConfig(plugins?: Plugin[]) {
	const [config, setConfig] = useState<NavSection[]>([]);
	const [availablePlugins, setAvailablePlugins] = useState<AvailablePlugin[]>(
		[],
	);

	// Fetch available plugins only once
	useEffect(() => {
		async function fetchAvailablePlugins() {
			try {
				const response = await fetch("/api/plugins/available")
					.then((res) => res.json())
					.catch((err) => {
						console.error("Error fetching available plugins:", err);
					});

				// console.log("Available plugins fetched:", data);
				if (response) {
					setAvailablePlugins(response);
				}
			} catch (error) {
				console.error("Error loading available plugins:", error);
			}
		}

		fetchAvailablePlugins();
	}, []); // Only fetch once

	// Update config when either plugins or availablePlugins change
	useEffect(() => {
		if (!availablePlugins.length) return;

		// console.log("Updating navigation config with plugins:", plugins);

		// Group by category and sort categories
		const pluginsByCategory = availablePlugins.reduce(
			(acc: Record<string, NavItem[]>, plugin: AvailablePlugin) => {
				if (!acc[plugin.category]) {
					acc[plugin.category] = [];
				}
				const isEnabled = plugins?.find((p) => p.id === plugin.id)?.enabled;
				// console.log(`Plugin ${plugin.id} enabled status:`, isEnabled);

				acc[plugin.category].push({
					type: "small",
					title: plugin.title,
					description: plugin.description,
					url: plugin.id,
					iconName: plugin.iconSolid,
					premium: plugin.premium,
					enabled: isEnabled,
				});
				return acc;
			},
			{},
		);

		// Sort plugins within each category
		for (const items of Object.values(pluginsByCategory)) {
			(items as NavItem[]).sort((a, b) => a.title.localeCompare(b.title));
		}

		const pluginsSection: NavSection = {
			title: "Plugins",
			iconName: "SolidLogo",
			categories: Object.entries(pluginsByCategory)
				.sort(([a], [b]) => a.localeCompare(b))
				.map(([category, items]) => ({
					title: category,
					iconName: "SolidLogo",
					items: items as NavItem[],
				})),
		};

		// console.log("New navigation config:", [pluginsSection]);
		setConfig([pluginsSection]);
	}, [plugins, availablePlugins]); // Update when either changes

	return config;
}
