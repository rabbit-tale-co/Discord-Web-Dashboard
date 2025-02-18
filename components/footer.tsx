"use client";

import Link from "next/link";
import { SolidArrowRight, SolidLogo } from "./icons";
import { useEffect, useState } from "react";
import { Separator } from "./ui/separator";

export function Footer() {
	const botName = process.env.NEXT_PUBLIC_BOT_NAME || "";
	const brandName = "Rabbit Tale Studio";
	const currentYear = new Date().getFullYear();

	const [botStatus, setBotStatus] = useState<
		"working" | "not_working" | "disabled" | "booting_up"
	>("booting_up");

	useEffect(() => {
		// Replace this with your actual status fetching logic
		const fetchStatus = () => {
			// Example: Fetch status from an API
			fetch("/api/bot/status")
				.then((res) => res.json())
				.then((data) => setBotStatus(data.status))
				.catch(() => setBotStatus("not_working"));
		};

		fetchStatus();
		const interval = setInterval(fetchStatus, 60_000); // Refresh every minute

		return () => clearInterval(interval);
	}, []);

	const companyLinks = [
		{
			label: "About Us",
			href: "/about",
		},
		{
			label: "Contact",
			href: "/contact",
		},
		{
			label: "Privacy Policy",
			href: "/privacy",
		},
	];

	const resourcesLinks = [
		{
			label: "Documentation",
			href: "/docs",
		},
		{
			label: "Support",
			href: "/support",
		},
		{
			label: "Blog",
			href: "/blog",
		},
	];

	const communityLinks = [
		{
			label: "Discord Server",
			href: "/discord",
		},
		{
			label: "Twitter",
			href: "/twitter",
		},
		{
			label: "GitHub",
			href: "/github",
		},
	];

	const footerLinks = [
		{ category: "Company", links: companyLinks },
		{ category: "Resources", links: resourcesLinks },
		{ category: "Community", links: communityLinks },
	];

	return (
		<footer className="bg-primary text-primary-foreground py-10">
			<div className="container max-w-screen-xl mx-auto flex flex-col md:flex-row justify-between gap-8">
				{/* Logo and copyright section */}
				<div className="mb-8 md:mb-0 flex flex-col items-center md:items-start justify-between text-center md:text-left">
					<Link
						href="/"
						className="text-xl font-bold w-fit flex items-center gap-2 hover:opacity-80 transition-opacity"
					>
						<SolidLogo size={40} />
						{botName}
					</Link>
					<section className="flex flex-col max-md:items-center max-md:mt-6">
						<div className="flex items-center gap-2 h-4.5">
							<span
								aria-label={`bot status: ${botStatus}`}
								className={`relative size-3 rounded-full ${
									{
										working: "bg-green-500",
										not_working: "bg-red-500",
										disabled: "bg-gray-500",
										booting_up: "bg-yellow-500",
									}[botStatus]
								}`}
							>
								<span
									className={`absolute top-0 left-0 size-3 rounded-full border-2 ${
										{
											working: "border-green-500",
											not_working: "border-red-500",
											disabled: "border-gray-500",
											booting_up: "border-yellow-500",
										}[botStatus]
									} animate-ping`}
								/>
							</span>
							<span className="text-sm leading-tight text-primary-foreground/30 capitalize">
								{botStatus.replace("_", " ")}
							</span>
							<Separator
								orientation="vertical"
								className="bg-primary-foreground/30"
							/>
							<Link
								href="/status"
								className="group text-sm leading-tight text-primary-foreground/50 hover:text-primary-foreground transition-colors duration-300 flex items-center gap-2"
							>
								Check Status
								<SolidArrowRight
									className="invisible md:visible -right-6 sm:group-hover:rotate-0 -rotate-45 transition-transform duration-300"
									size={16}
								/>
							</Link>
						</div>
						<p className="text-sm mt-2 text-primary-foreground/30">
							© {currentYear} {brandName}. All rights reserved.
						</p>
					</section>
				</div>

				{/* Links grid */}
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-8 w-full md:w-auto">
					{footerLinks.map(({ category, links }) => (
						<section
							key={category}
							className="text-center md:text-left min-w-[150px]"
						>
							<h4 className="font-semibold mb-4 text-lg md:text-base">
								{category}
							</h4>
							<ul className="flex flex-col gap-3 items-center md:items-start">
								{links.map((link) => (
									<li key={link.href} className="w-fit">
										<Link
											href={link.href}
											className="group relative text-sm text-primary-foreground/50 hover:text-primary-foreground transition-colors duration-300 flex items-center gap-2"
										>
											{link.label}
											<SolidArrowRight
												className="absolute invisible sm:group-hover:visible -right-6 sm:group-hover:rotate-0 -rotate-45 transition-transform duration-300"
												size={16}
											/>
										</Link>
									</li>
								))}
							</ul>
						</section>
					))}
				</div>
			</div>
		</footer>
	);
}
