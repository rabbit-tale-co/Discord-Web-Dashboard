"use client";

import Image from "next/image";
import Link from "next/link";
import React from "react";
import * as Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";

interface Server {
	id: string;
	name: string;
	avatar: string;
	hasBot: boolean;
	memberCount: number;
	hasPremium: boolean;
}

const servers: Server[] = [
	{
		id: "1",
		name: "Gaming Community",
		avatar: "https://picsum.photos/800/600?random=1",
		hasBot: true,
		memberCount: 1234,
		hasPremium: true,
	},
	{
		id: "2",
		name: "Development Hub",
		avatar: "https://picsum.photos/800/600?random=2",
		hasBot: false,
		memberCount: 567,
		hasPremium: false,
	},
	{
		id: "3",
		name: "Art Gallery",
		avatar: "https://picsum.photos/800/600?random=3",
		hasBot: true,
		memberCount: 890,
		hasPremium: false,
	},
	{
		id: "4",
		name: "Music Lounge",
		avatar: "https://picsum.photos/800/600?random=4",
		hasBot: false,
		memberCount: 432,
		hasPremium: false,
	},
	{
		id: "5",
		name: "Gaming Community",
		avatar: "https://picsum.photos/800/600?random=1",
		hasBot: true,
		memberCount: 1234,
		hasPremium: false,
	},
	{
		id: "6",
		name: "Development Hub",
		avatar: "https://picsum.photos/800/600?random=2",
		hasBot: false,
		memberCount: 567,
		hasPremium: false,
	},
	{
		id: "7",
		name: "Art Gallery",
		avatar: "https://picsum.photos/800/600?random=3",
		hasBot: true,
		memberCount: 890,
		hasPremium: false,
	},
	{
		id: "8",
		name: "Music Lounge",
		avatar: "https://picsum.photos/800/600?random=4",
		hasBot: false,
		memberCount: 432,
		hasPremium: false,
	},
];

export default function Servers() {
	return (
		<React.Fragment>
			<Header />
			<div className="grid grid-rows-[.05fr_1fr] sm:grid-rows-[.2fr_1fr] min-h-screen container pb-20 gap-16 max-w-7xl mx-auto">
				<main className="flex flex-col gap-8 row-start-2 items-center sm:items-start w-full">
					<div className="space-y-12 max-w-7xl mx-auto">
						{/* 🔹 Header Section */}
						<div className="text-center">
							<h1 className="text-4xl font-bold mb-3">Your Servers</h1>
							<p className="text-gray-400 text-lg">
								Select a server to get started
							</p>
						</div>

						{/* 🔹 Outer Grid */}
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
							{servers.map((server) => (
								// 🔹 Server Card with Nested Grid
								<div
									key={server.id}
									className="group relative overflow-hidden rounded-3xl bg-primary transition-all duration-300 p-1"
								>
									{/* Inner Grid Layout */}
									<div className="flex flex-col gap-2">
										{/* 🔹 Image Container */}
										<div className="relative w-full aspect-video overflow-hidden rounded-[20px]">
											<Image
												src={server.avatar || "/default-server-avatar.png"}
												alt={server.name}
												width={900}
												height={600}
												className="h-full w-full object-cover object-center transition-transform duration-300 sm:group-hover:scale-105"
											/>
											<div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />
											{server.hasPremium && (
												<Button
													variant={"outline"}
													size={"icon"}
													className="absolute top-2 right-2"
												>
													<Icon.OutlineCrown size={20} />
												</Button>
											)}
										</div>

										{/* 🔹 Server Information */}

										<div className="flex gap-2 justify-between items-end pr-2 pb-2">
											<div className="flex flex-col items-start max-w-[50%] pl-3">
												<h3 className="text-lg truncate font-semibold text-white w-full">
													{server.name}
												</h3>
												<p className="text-sm text-white/75 font-medium">
													{server.memberCount.toLocaleString()} members
												</p>
											</div>

											{/* 🔹 Button Section */}
											<Button
												variant={server.hasBot ? "secondary" : "discord"}
												size={"lg"}
												asChild
											>
												<Link
													href={server.hasBot ? `/dashboard/${server.id}` : "#"}
												>
													{server.hasBot ? "Configure" : "Add to Server"}
													{server.hasBot ? (
														<Icon.SolidArrowRight />
													) : (
														<Icon.SolidDiscord />
													)}
												</Link>
											</Button>
										</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</main>
			</div>
			<Footer />
		</React.Fragment>
	);
}
