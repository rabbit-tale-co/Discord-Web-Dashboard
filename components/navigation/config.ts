import * as Icon from "@/components/icons";
import type { NavSection } from "@/types/navigation";

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
