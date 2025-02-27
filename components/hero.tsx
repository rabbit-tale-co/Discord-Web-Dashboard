"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SolidArrowRight } from "./icons/assets/arrows/ArrowRight";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Star } from "lucide-react";
import { SolidLogo } from "./icons";
import { SolidDiscord } from "./icons/assets/socials/discord";
import NumberFlow from "@number-flow/react";
import React from "react";

export default function Hero() {
	const addToDiscord = () => {
		const addBotWindow = window.open(
			`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&permissions=8&response_type=code&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/guild&integration_type=0&scope=bot+applications.commands+guilds+identify+guilds.channels.read+voice+payment_sources.country_code+dm_channels.messages.write+dm_channels.messages.read+presences.write+messages.read+email+guilds.members.read`,
			"_blank",
		);

		// Listen for message from new window
		window.addEventListener("message", (event) => {
			if (event.data === "guild-success") {
				addBotWindow?.close();
			}
		});
	};

	return (
		<div className="w-full mx-auto">
			<div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 items-stretch">
				{/* Left side */}
				<div className="space-y-6 w-full flex flex-col">
					<h1 className="text-3xl sm:text-4xl md:text-5xl font-bold leading-tight">
						The best all-in-one
						<br />
						bot for Discord
					</h1>
					<p className="text-base sm:text-lg text-muted-foreground">
						Tiny Rabbit is a new growing Discord bot, easy-to-use, that Discord
						servers worldwide trust to manage, entertain, and grow their
						community.
					</p>
					<div className="flex flex-col sm:flex-row gap-4">
						<Button variant="discord" size="xl" onClick={() => addToDiscord()}>
							Add to Discord
							<SolidDiscord size={22} />
						</Button>
						<Button asChild variant="ghost" size="xl">
							<Link href="/plugins">
								See Plugins
								<SolidArrowRight size={22} />
							</Link>
						</Button>
					</div>
					{/* Counters */}
					<Counter />
				</div>
				{/* Right side */}
				<div className="relative w-full lg:w-[450px] p-1 rounded-3xl bg-primary lg:h-full h-86">
					<OptimizedDiscordDisplay />
				</div>
			</div>
		</div>
	);
}

const Counter = () => {
	const [userTrusted, setUserTrusted] = useState(0);
	const [rating, setRating] = useState(0);
	const [ratingCount, setRatingCount] = useState(0);

	useEffect(() => {
		setTimeout(() => {
			setUserTrusted(345_453);
			setRating(4.9);
			setRatingCount(123_456);
		}, 500);
	}, []);

	return (
		<div className="flex max-sm:flex-col gap-4 pt-4 mt-auto max-sm:justify-center">
			{/* Users Trusted */}
			<div className="flex flex-col items-center sm:flex-row gap-3 max-sm:w-full">
				<div className="flex flex-col items-center">
					<AvatarGroup avatarSrc="https://github.com/shadcn.png" />
				</div>
				<div className="flex flex-col max-sm:items-center">
					<NumberFlow
						value={userTrusted}
						format={{ notation: "compact" }}
						willChange
						className="leading-none font-bold text-lg"
					/>
					<p className="text-muted-foreground leading-none text-sm">
						Users trust our Discord Bot
					</p>
				</div>
			</div>
			{/* Rating */}
			<div className="flex flex-col items-center sm:flex-row gap-3 max-sm:w-full">
				<div className="flex justify-center items-center size-10 bg-muted rounded-full">
					<Star size={22} />
				</div>
				<div className="flex flex-col max-sm:items-center">
					<NumberFlow
						value={rating}
						format={{
							minimumFractionDigits: 1,
							maximumFractionDigits: 1,
						}}
						willChange
						className="leading-none font-bold text-lg"
					/>
					<p className="text-muted-foreground leading-none text-sm">
						Rated by{" "}
						<NumberFlow
							value={ratingCount}
							format={{ notation: "compact" }}
							willChange
							className="inline"
						/>{" "}
						users
					</p>
				</div>
			</div>
		</div>
	);
};

const AvatarGroup = ({ avatarSrc }: { avatarSrc: string }) => (
	<div className="flex -space-x-3 *:ring-1 *:ring-white *:ring-offset-2 *:ring-offset-background items-center *:hover:not-last:-translate-x-2 *:transition-transform *:duration-300">
		{[1, 2, 3].map((i) => (
			<Avatar key={i}>
				<AvatarImage src={avatarSrc} loading="lazy" decoding="async" />
				<AvatarFallback>CN</AvatarFallback>
			</Avatar>
		))}
	</div>
);

const OptimizedDiscordDisplay = () => (
	<div className="flex items-center bg-secondary rounded-[20px] squarcle-mask justify-center overflow-hidden h-full">
		<div className="relative z-10 w-full h-full group">
			<DiscordIcon />
			<LogoIcon />
		</div>
	</div>
);

const DiscordIcon = () => (
	<div className="absolute -top-20 -right-16 rotate-[-4deg] group-hover:rotate-[2deg] group-hover:translate-x-[12px] group-hover:translate-y-[12px] transition-transform duration-300">
		<SolidDiscord size={250} className="text-secondary-foreground" />
	</div>
);

const LogoIcon = () => (
	<div className="absolute -bottom-12 -left-16 rotate-[4deg] group-hover:rotate-[-6deg] group-hover:translate-x-[12px] group-hover:-translate-y-[12px] transition-transform duration-300">
		<SolidLogo size={280} className="text-secondary-foreground" />
	</div>
);
