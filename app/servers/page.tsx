"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../../context/authContext";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import * as Icon from "@/components/icons";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import avatarUrl from "@/lib/is-gif";
import { useGuilds } from "@/hooks/use-guilds";

export default function Servers() {
	const { guilds, status } = useGuilds();

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
							{status === "loading"
								? [...new Array(9)].map((_) => (
										<div
											key={`server-skeleton-${crypto.randomUUID()}`}
											className="group relative overflow-hidden rounded-3xl bg-primary/5 transition-all duration-300 p-1"
										>
											<div className="flex flex-col gap-2">
												{/* Image Container */}
												<div className="relative w-full aspect-video overflow-hidden rounded-[20px] bg-primary/5">
													<div className="absolute inset-0">
														<Skeleton className="h-full w-full" />
													</div>
												</div>

												{/* Server Information */}
												<div className="flex gap-2 justify-between items-end pr-2 pb-2">
													<div className="flex flex-col gap-1 items-start max-w-[50%] pl-3">
														<Skeleton className="h-6 w-32" />
														<Skeleton className="h-4 w-24" />
													</div>

													{/* Button Section */}
													<Skeleton className="h-10 w-32 rounded-lg" />
												</div>
											</div>
										</div>
									))
								: guilds?.map((guild) => (
										// 🔹 Server Card with Nested Grid
										<div
											key={guild.id}
											className="group relative overflow-hidden rounded-3xl bg-primary transition-all duration-300 p-1"
										>
											{/* Inner Grid Layout */}
											<div className="flex flex-col gap-2">
												{/* 🔹 Image Container */}
												<div className="relative w-full aspect-video overflow-hidden rounded-[20px]">
													<Image
														src={avatarUrl(
															guild.id,
															guild.icon || "",
															1024,
															false,
														)}
														alt={guild.name}
														width={900}
														height={600}
														className="h-full w-full object-cover object-center transition-transform duration-300 sm:group-hover:scale-105"
													/>
													<div className="absolute inset-0 bg-gradient-to-b from-black/80 via-transparent to-transparent" />
													{guild.premium_tier > 0 && (
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
															{guild.name}
														</h3>
														<p className="text-sm text-white/75 font-medium">
															{(
																guild.approximate_member_count || 0
															).toLocaleString()}{" "}
															members
														</p>
													</div>

													{/* 🔹 Button Section */}
													<Button
														variant={!guild.has_bot ? "discord" : "secondary"}
														size={"lg"}
														asChild
													>
														<Link
															href={
																!guild.has_bot
																	? `https://discord.com/api/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&permissions=8&scope=bot%20applications.commands&guild_id=${guild.id}`
																	: `/dashboard/${guild.id}`
															}
															target={!guild.has_bot ? "_blank" : undefined}
														>
															{!guild.has_bot ? "Add to Server" : "Configure"}
															{!guild.has_bot ? (
																<Icon.SolidDiscord />
															) : (
																<Icon.SolidArrowRight />
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
