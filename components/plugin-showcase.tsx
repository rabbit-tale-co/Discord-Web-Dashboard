"use client";

import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import * as Icon from "@/components/icons";

type Plugin = {
	name: string;
	description: string;
	image: string;
	icon: keyof typeof Icon;
};

const plugins: Plugin[] = [
	{
		name: "Leveling System",
		description: "Engage members with XP and levels.",
		image: "/images/plugins/levels.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Tickets",
		description: "Manage support tickets seamlessly.",
		image: "/images/plugins/tickets.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Welcome Messages",
		description: "Customize how you greet new members.",
		image: "/images/plugins/welcome.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Starboard",
		description: "Highlight the best messages in your server.",
		image: "/images/plugins/starboard.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Birthdays",
		description: "Celebrate birthdays with special messages.",
		image: "/images/plugins/birthday.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Temp Voice Channels",
		description: "Create temporary voice channels dynamically.",
		image: "/images/plugins/tempvc.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Slowmode",
		description: "Limit spam with slowmode for channels.",
		image: "/images/plugins/slowmode.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Social Connections",
		description: "Link Discord with other social platforms.",
		image: "/images/plugins/connectSocial.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Moderation",
		description: "Advanced moderation tools to keep your server safe.",
		image: "/images/plugins/moderation.jpg",
		icon: "SolidLogo",
	},
	{
		name: "Music Player",
		description: "High-quality music streaming for your server.",
		image: "/images/plugins/music.jpg",
		icon: "SolidLogo",
	},
];

export const PluginsShowcase = () => {
	const [hoveredPlugin, setHoveredPlugin] = useState<string | null>(null);

	return (
		<section id="plugins" className="py-16 bg-background">
			<div className="container max-w-7xl mx-auto px-6 text-center">
				<h2 className="text-4xl font-bold text-primary">Bot Plugins</h2>
				<p className="text-muted-foreground mt-2">
					Enhance your server with powerful plugins.
				</p>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mt-10">
					{plugins.map((plugin) => {
						const IconComponent = Icon[plugin.icon];

						return (
							<div
								key={plugin.name}
								className="group relative rounded-xl overflow-hidden shadow-lg border border-border bg-card transition-all duration-300 hover:shadow-xl hover:border-primary"
								onMouseEnter={() => setHoveredPlugin(plugin.name)}
								onMouseLeave={() => setHoveredPlugin(null)}
							>
								<div className="relative w-full h-40">
									<Image
										src={plugin.image}
										alt={plugin.name}
										layout="fill"
										objectFit="cover"
										className="group-hover:scale-105 transition-transform duration-300"
									/>
									<div className="absolute inset-0 bg-black/50 flex items-center justify-center">
										<IconComponent
											size={48}
											className="text-primary-foreground opacity-80 transition-opacity duration-300 group-hover:opacity-100"
										/>
									</div>
								</div>

								<div className="p-5">
									<h3 className="text-xl font-semibold text-primary">
										{plugin.name}
									</h3>
									<p className="text-muted-foreground mt-1">
										{plugin.description}
									</p>
								</div>

								<div className="absolute bottom-4 right-4 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
									<Button variant="outline" size="sm">
										Learn More
									</Button>
								</div>
							</div>
						);
					})}
				</div>
			</div>
		</section>
	);
};
