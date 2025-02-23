import * as Icon from "@/components/icons";
import type { NavSection } from "@/types/navigation";

export const navigationConfig: NavSection[] = [
	{
		name: "Features",
		path: "/features",
		layout: {
			gridTemplate: `
        "small small large1 large2"
        "small small large1 large2"
      `,
			defaultLargeMinWidth: 280,
		},
		features: [
			{
				type: "large",
				title: "Server Analytics",
				description:
					"Track member growth, engagement metrics, and activity trends in real-time",
				path: "/features/analytics",
				// image: "/images/analytics.webp",
			},
			{
				type: "large",
				title: "Level System",
				description:
					"Reward active members with XP, ranks, and customizable role rewards",
				path: "/features/levels",
				// image: "/images/levels.webp",
			},
			{
				type: "small",
				title: "Moderation Suite",
				description: "Tools for moderation",
				icon: Icon.SolidLogo,
				path: "/features/moderation",
			},
			{
				type: "small",
				title: "Birthday System",
				description: "Birthday celebrations and announcements",
				icon: Icon.SolidLogo,
				path: "/features/birthdays",
			},
			{
				type: "small",
				title: "Auto Roles",
				description: "Role assignment and management",
				icon: Icon.SolidLogo,
				path: "/features/roles",
			},
			{
				type: "small",
				title: "Ticket System",
				description: "Ticket management with transcripts",
				icon: Icon.SolidLogo,
				path: "/features/tickets",
			},
			{
				type: "small",
				title: "Temporary Channels",
				description: "Dynamic voice channels that auto-delete when inactive",
				icon: Icon.SolidLogo,
				path: "/features/tempvc",
			},
		],
	},
	{
		name: "Solutions",
		path: "/solutions",
		layout: {
			gridTemplate: `"large1 large2 large3"`,
			defaultLargeMinWidth: 1024 / 3,
		},
		features: [
			{
				type: "large",
				title: "For Small Servers",
				description:
					"TinyRabbit is perfect for small servers with limited resources. It offers basic moderation tools and analytics to help you manage your community.",
				path: "/solutions/growth",
				// image: "/images/solutions/growth.webp",
				minWidth: 1024 / 3,
			},
			{
				type: "large",
				title: "For Medium Servers",
				description:
					"TinyRabbit is perfect for medium servers with moderate resources. It offers advanced moderation tools, auto-mod, and audit logging to keep your server safe.",
				path: "/solutions/security",
				// image: "/images/solutions/security.webp",
				minWidth: 1024 / 3,
			},
			{
				type: "large",
				title: "For Large Servers",
				description:
					"TinyRabbit is perfect for large servers with ample resources. It offers a comprehensive set of tools to help you manage your community.",
				path: "/solutions/support",
				// image: "/images/solutions/support.webp",
				minWidth: 1024 / 3,
			},
		],
	},
	{
		name: "Developers",
		path: "/developers",
		layout: {
			gridTemplate: `"small large"`,
			defaultLargeMinWidth: 420,
		},
		features: [
			{
				type: "large",
				title: "Dashboard",
				description: "Control your server from one place",
				path: "/developers/dashboard",
				// image: "/images/developers/dashboard.webp",
				minWidth: 420,
			},
			{
				type: "small",
				title: "Documentation",
				description: "Integration guides and API reference",
				icon: Icon.SolidLogo,
				path: "/developers/docs",
			},
			{
				type: "small",
				title: "Commands",
				description: "List of all available bot commands",
				icon: Icon.SolidLogo,
				path: "/developers/commands",
			},
			{
				type: "small",
				title: "Plugins",
				description: "Extend your bot's functionality",
				icon: Icon.SolidLogo,
				path: "/developers/plugins",
			},
			{
				type: "small",
				title: "Support",
				description: "Get help from our community",
				icon: Icon.SolidDiscord,
				path: "/developers/support",
			},
			{
				type: "small",
				title: "GitHub",
				description: "View our open source code",
				icon: Icon.SolidLogo,
				path: "https://github.com/TinyRabbit",
			},
		],
	},
	{
		name: "Company",
		path: "/company",
		layout: {
			gridTemplate: `"large small"`,
			defaultLargeMinWidth: 420,
		},
		features: [
			{
				type: "large",
				title: "Latest Updates",
				description: "Check out our newest features and improvements",
				path: "/blog",
				// image: "/images/company/blog.webp",
				minWidth: 420,
			},
			{
				type: "large",
				title: "Join Our Community",
				description: "Follow us for the latest news and updates",
				path: "https://discord.gg/RfBydgJpmU",
				// image: "/images/company/discord.webp",
				minHeight: "132px",
			},
			{
				type: "small",
				title: "About TinyRabbit",
				description: "Learn about our mission to empower Discord communities",
				icon: Icon.SolidLogo,
				path: "/about",
			},
		],
	},
];
