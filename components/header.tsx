"use client";
import type React from "react";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import * as Icon from "@/components/icons";
import { useAuth } from "@/app/authContext";
import { UserAvatar } from "@/components/user-avatar";
import { MobileNav } from "@/components/mobile-nav";
import type { NavSection } from "@/types/navigation";
import { ExpandedMenu } from "./navigation/expanded-menu";
import { navigationConfig } from "./navigation/config";
import { useNav } from "@/hooks/use-nav";

export const Header = () => {
	const {
		activeNav,
		isInExpandedMenu,
		isKeyboardNavigation,
		isMouseInteraction,
		isMounted,
		setActiveNav,
		setFocusedNavIndex,
		setFocusedMenuIndex,
		setIsInExpandedMenu,
		setIsKeyboardNavigation,
		setIsMouseInteraction,
	} = useNav();

	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const botName = process.env.NEXT_PUBLIC_BOT_NAME || "";
	const { user } = useAuth();

	const handleNavEnter = (item: NavSection) => {
		setIsKeyboardNavigation(false);
		setIsMouseInteraction(true);

		// Force clear any existing close timeouts
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}

		// Immediately show the menu
		setActiveNav(item);
		setIsInExpandedMenu(true);
	};

	const handleNavLeave = () => {
		setIsMouseInteraction(false);
		if (!isKeyboardNavigation) {
			// Add delay to allow time to move to expanded menu or another nav item
			setTimeout(() => {
				const expandedMenu = document.querySelector("[data-menu-container]");
				const navButtons = document.querySelector(":hover[data-nav-button]");

				// Only close if we're not hovering either the menu or any nav button
				if (!expandedMenu?.matches(":hover") && !navButtons) {
					setActiveNav(null);
					setIsInExpandedMenu(false);
				}
			}, 50);
		}
	};

	const handleNavFocus = (item: NavSection, index: number) => {
		if (isMouseInteraction) return;
		setIsKeyboardNavigation(true);
		setIsMouseInteraction(false);
		setFocusedNavIndex(index);
		setActiveNav(item);
		setIsInExpandedMenu(false);
		setFocusedMenuIndex(-1);
		setTimeout(() => {
			const navButton = document.querySelector(
				`[data-nav-button="${index}"]`,
			) as HTMLElement;
			navButton?.focus();
		}, 0);
	};

	const handleNavBlur = (e: React.FocusEvent) => {
		const relatedTarget = e.relatedTarget as HTMLElement;
		const isMovingToAnotherNav = relatedTarget?.closest("[data-nav-button]");

		if (isMovingToAnotherNav) {
			const newIndex = Number.parseInt(
				relatedTarget.getAttribute("data-nav-button") || "-1",
			);
			if (newIndex >= 0) {
				setActiveNav(navigationConfig[newIndex]);
				setFocusedNavIndex(newIndex);
				setIsInExpandedMenu(false);
			}
			return;
		}

		if (!relatedTarget?.closest("[data-menu-container]")) {
			setActiveNav(null);
			setIsInExpandedMenu(false);
		}
	};

	if (!isMounted) return null;

	return (
		<header className="fixed w-full top-0 py-1 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			{/* Progressive Blur Overlay */}
			<div className="absolute hidden inset-0  pointer-events-none transform scale-y-[-1]">
				{/* Layer 1 (backdrop-blur-[1px]) – oryginalne: 0, 12.5, 25, 37.5 */}
				<div
					className="absolute inset-0 z-[1] backdrop-blur-[1px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 6.25%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,0) 18.75%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 6.25%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,0) 18.75%)",
					}}
				/>
				{/* Layer 2 (backdrop-blur-[2px]) – oryginalne: 12.5, 25, 37.5, 50 */}
				<div
					className="absolute inset-0 z-[2] backdrop-blur-[2px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 6.25%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 18.75%, rgba(0,0,0,0) 25%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 6.25%, rgba(0,0,0,1) 12.5%, rgba(0,0,0,1) 18.75%, rgba(0,0,0,0) 25%)",
					}}
				/>
				{/* Layer 3 (backdrop-blur-[4px]) – oryginalne: 25, 37.5, 50, 62.5 */}
				<div
					className="absolute inset-0 z-[3] backdrop-blur-[4px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 12.5%, rgba(0,0,0,1) 18.75%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 31.25%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 12.5%, rgba(0,0,0,1) 18.75%, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 31.25%)",
					}}
				/>
				{/* Layer 4 (backdrop-blur-[8px]) – oryginalne: 37.5, 50, 62.5, 75 */}
				<div
					className="absolute inset-0 z-[4] backdrop-blur-[8px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 18.75%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 31.25%, rgba(0,0,0,0) 37.5%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 18.75%, rgba(0,0,0,1) 25%, rgba(0,0,0,1) 31.25%, rgba(0,0,0,0) 37.5%)",
					}}
				/>
				{/* Layer 5 (backdrop-blur-[16px]) – oryginalne: 50, 62.5, 75, 87.5 */}
				<div
					className="absolute inset-0 z-[5] backdrop-blur-[16px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 31.25%, rgba(0,0,0,1) 37.5%, rgba(0,0,0,0) 43.75%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 25%, rgba(0,0,0,1) 31.25%, rgba(0,0,0,1) 37.5%, rgba(0,0,0,0) 43.75%)",
					}}
				/>
				{/* Layer 6 (backdrop-blur-[32px]) – oryginalne: 62.5, 75, 87.5 */}
				<div
					className="absolute inset-0 z-[6] backdrop-blur-[32px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 31.25%, rgba(0,0,0,1) 37.5%, rgba(0,0,0,1) 43.75%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 31.25%, rgba(0,0,0,1) 37.5%, rgba(0,0,0,1) 43.75%)",
					}}
				/>
				{/* Layer 7 (backdrop-blur-[64px]) – oryginalne: 75, 87.5 */}
				<div
					className="absolute inset-0 z-[7] backdrop-blur-[64px]"
					style={{
						WebkitMaskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 37.5%, rgba(0,0,0,1) 43.75%)",
						maskImage:
							"linear-gradient(to bottom, rgba(0,0,0,0) 37.5%, rgba(0,0,0,1) 43.75%)",
					}}
				/>
			</div>

			<div className="container max-w-7xl mx-auto relative z-40">
				<nav className="flex items-center justify-between h-16">
					<div className="flex items-center">
						<Link
							href="/"
							className={
								"text-xl font-bold flex items-center gap-2 transition-colors duration-300"
							}
						>
							<Icon.SolidLogo size={40} />
							<span>{botName}</span>
						</Link>
					</div>

					<div className="hidden lg:flex items-center">
						{navigationConfig.map((item, index) => (
							<Button
								key={item.title}
								size="lg"
								variant="link"
								className="relative px-4"
								data-nav-button={index}
								tabIndex={0}
								onMouseEnter={() => handleNavEnter(item)}
								onMouseLeave={handleNavLeave}
								onFocus={() => handleNavFocus(item, index)}
								onClick={() => setActiveNav(item)}
								onBlur={handleNavBlur}
							>
								{item.title}
							</Button>
						))}
					</div>

					<div className="flex items-center gap-3">
						<Button asChild size="lg" className="max-md:hidden">
							<Link
								href="/premium"
								className="focus:outline-none hover:bg-neutral-800 focus:bg-neutral-800"
							>
								Get Premium
								<Icon.SolidCrown size={22} />
							</Link>
						</Button>
						{user ? (
							<UserAvatar user={user} />
						) : (
							<Button
								asChild
								variant="discord"
								size="lg"
								className="max-md:hidden"
							>
								<Link
									href={`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback&response_type=code&scope=identify%20email`}
								>
									Login
									<Icon.SolidDiscord size={22} />
								</Link>
							</Button>
						)}
						{/* <Button
							variant={"secondary"}
							size={"iconLg"}
							className="lg:hidden"
							onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
						>
							<Icon.OutlineMenu size={22} />
						</Button> */}
						<MobileNav user={user ?? undefined} />
						{/* <Sheet>
							<SheetTrigger asChild>
								<Button
									variant={"secondary"}
									size={"iconLg"}
									className="lg:hidden"
								>
									<Icon.OutlineMenu size={22} />
								</Button>
							</SheetTrigger>
							<SheetContent side={"left"}>
								<SheetHeader>
									<SheetTitle className="flex items-center gap-2">
										<Icon.SolidLogo size={40} />
										<span className="text-xl font-bold">{botName}</span>
									</SheetTitle>
								</SheetHeader>
								<SidebarProvider>
									<DashboardSidebar />
								</SidebarProvider>
								<div className="flex flex-col gap-4">
									{navigationItems.map((item) => (
										<Button
											key={item.name}
											variant="link"
											size="lg"
											asChild
											className="w-full justify-start"
										>
											<Link href={item.path}>{item.name}</Link>
										</Button>
									))}
								</div>
							</SheetContent>
						</Sheet> */}
					</div>
				</nav>
			</div>

			{/* Expanded Navigation Menu */}
			<ExpandedMenu
				section={activeNav ?? navigationConfig[0]}
				isOpen={isInExpandedMenu}
				onClose={() => {
					setActiveNav(null);
					setIsInExpandedMenu(false);
				}}
			/>
			{/* <div className="fixed inset-x-0 top-0 h-screen z-30 pointer-events-none">
				{activeNav?.features && (
					<div
						className="fixed left-1/2 top-20 -translate-x-1/2 z-40 pointer-events-auto"
						onMouseEnter={handleMenuEnter}
						onMouseLeave={handleMenuLeave}
						data-menu-container
					>
						<div
							className="relative overflow-hidden rounded-xl border border-primary/75 bg-primary p-2 shadow-2xl transition-[width,height] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]"
							style={{
								width: `${Math.max(contentDimensions.width + 16, 0)}px`,
								height: `${Math.max(contentDimensions.height + 16, 0)}px`,
								willChange: "width, height",
							}}
						>
							<div ref={contentRef} className="relative w-max">
								{activeNav.name === "Features" && (
									<header className="fade flex gap-2 animate-fadeSm">
										<ul className="flex w-full max-w-[280px] flex-col gap-2">
											{activeNav.features.slice(3).map((feature, index) => (
												<li key={feature.title}>
													<Link
														href={feature.path || ""}
														className={`group flex w-full shrink-0 items-center gap-6 rounded-lg p-2.5 pr-4 bg-neutral-900 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none transition-colors duration-200 ${
															isInExpandedMenu && focusedMenuIndex === index
																? "ring-2 ring-primary"
																: ""
														}`}
														data-menu-item={index}
														tabIndex={0}
													>
														<div className="relative *:h-10 *:w-9 *:rounded-lg *:transition-transform *:duration-200 *:ease-bigBounce">
															<div className="absolute left-1.5 top-0 rotate-[16deg] bg-neutral-400 group-hover:-translate-x-1 group-hover:-rotate-[8deg] group-focus:-translate-x-1 group-focus:-rotate-[8deg]" />
															<div className="relative flex items-center justify-center bg-neutral-100 text-neutral-700 group-hover:translate-x-1.5 group-hover:rotate-[16deg] group-focus:translate-x-1.5 group-focus:rotate-[16deg]">
																<Icon.SolidLogo size={20} />
															</div>
														</div>
														<div>
															<p className="text-base font-semibold text-neutral-100">
																{feature.title}
															</p>
															<p className="text-sm font-normal text-neutral-400">
																{feature.description}
															</p>
														</div>
													</Link>
												</li>
											))}
										</ul>

										<div className="flex gap-2">
											{activeNav.features.slice(0, 2).map((feature, index) => (
												<Link
													key={feature.title}
													href={feature.path || ""}
													className={
														"group relative flex min-h-[264px] w-[280px] items-center overflow-hidden rounded-lg bg-neutral-900 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-primary"
													}
													data-menu-item={
														index + (activeNav?.features?.slice(4).length || 0)
													}
													tabIndex={0}
													data-feature-index={index}
												>
													<div className="absolute inset-0 opacity-70 transition-transform duration-400 ease-out group-hover:scale-105 group-hover:opacity-100 group-focus:scale-105 group-focus:opacity-100">
														{feature.image ? (
															<Image
																src={feature.image || "/placeholder.svg"}
																alt={feature.title}
																layout="fill"
																objectFit="cover"
															/>
														) : (
															<div className="flex h-full items-center justify-center">
																<Icon.SolidLogo
																	size={280}
																	className="text-secondary-foreground"
																/>
															</div>
														)}
													</div>
													<div
														className="z-10 w-full self-end bg-gradient-to-t from-neutral-900 to-neutral-900/0 p-2.5 pr-11 pt-8"
														tabIndex={-1}
													>
														<p className="text-base font-semibold text-neutral-100">
															{feature.title}
														</p>
														<p className="text-sm font-normal text-white/65">
															{feature.description}
														</p>
													</div>
													<div className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-100 opacity-0 transition-opacity group-hover:opacity-100 group-focus:opacity-100">
														<span className="relative flex size-5 items-center justify-center overflow-hidden *:transition-transform *:duration-[400ms] *:ease-bounce group-focus:*:translate-x-0">
															<Icon.SolidArrowRight
																size={22}
																className="absolute -translate-x-5 group-active:translate-x-0 group-hover:translate-x-0 group-focus:translate-x-0 group-focus-visible:translate-x-0 rotate-0"
															/>
															<Icon.SolidArrowRight
																size={22}
																className="group-active:translate-x-5 group-hover:translate-x-5 group-focus:translate-x-5 group-focus-visible:translate-x-5 rotate-0"
															/>
														</span>
													</div>
												</Link>
											))}
										</div>
									</header>
								)}

								{activeNav.name === "Solutions" && (
									<header className="fade flex gap-2 animate-fadeSm">
										{activeNav.features.map((solution, index) => (
											<Link
												key={solution.title}
												href={solution.path || ""}
												className="group relative flex min-h-[264px] w-[300px] items-center overflow-hidden rounded-lg bg-neutral-900 hover:bg-neutral-800 focus:bg-neutral-800"
												data-menu-item={index}
												tabIndex={0}
											>
												<div className="absolute inset-0 opacity-70 transition-transform duration-400 ease-out group-hover:scale-105 group-hover:opacity-100 group-focus:scale-105 group-focus:opacity-100">
													<Image
														src={solution.image || "/placeholder.svg"}
														alt={solution.title}
														layout="fill"
														objectFit="cover"
													/>
												</div>
												<div className="z-10 w-full self-end bg-gradient-to-t from-neutral-900 to-neutral-900/0 p-2.5 pr-11 pt-8">
													<p className="text-base font-semibold text-neutral-100">
														{solution.title}
													</p>
													<p className="text-sm font-normal text-white/65">
														{solution.description}
													</p>
												</div>
												<div className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus:opacity-100">
													<span className="relative flex size-5 items-center justify-center overflow-hidden *:transition-transform *:duration-[400ms] *:ease-bounce">
														<Icon.SolidArrowRight
															size={22}
															className="absolute -translate-x-5 group-active:translate-x-0 sm:group-hover:translate-x-0 sm:group-focus:translate-x-0 group-focus-visible:translate-x-0 rotate-0"
														/>
														<Icon.SolidArrowRight
															size={22}
															className="group-active:translate-x-5 sm:group-hover:translate-x-5 group-focus-visible:translate-x-5 rotate-0"
														/>
													</span>
												</div>
											</Link>
										))}
									</header>
								)}

								{activeNav.name === "Documentation" && (
									<header className="fade flex gap-2 animate-fadeSm">
										<Link
											href={activeNav.features[0].path || ""}
											className="group relative flex min-h-[264px] w-[400px] items-center overflow-hidden rounded-lg bg-neutral-900 hover:bg-neutral-800"
											data-menu-item={activeNav.features[0].path}
											tabIndex={0}
										>
											<div className="absolute inset-0 opacity-70 transition-transform duration-400 ease-out group-hover:scale-105 group-hover:opacity-100">
												<div className="flex h-full items-center justify-center">
													<Icon.SolidLogo
														size={280}
														className="text-secondary-foreground"
													/>
												</div>
											</div>
											<div className="z-10 w-full self-end bg-gradient-to-t from-neutral-900 to-neutral-900/0 p-2.5 pr-11 pt-8">
												<p className="text-base font-semibold text-neutral-100">
													{activeNav.features[0].title}
												</p>
												<p className="text-sm font-normal text-white/65">
													{activeNav.features[0].description}
												</p>
											</div>
											<div className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
												<span className="relative flex size-5 items-center justify-center overflow-hidden *:transition-transform *:duration-[400ms] *:ease-bounce">
													<Icon.SolidArrowRight
														size={22}
														className="absolute -translate-x-5 group-active:translate-x-0 sm:group-hover:translate-x-0 sm:group-focus:translate-x-0 group-focus-visible:translate-x-0 rotate-0"
													/>
													<Icon.SolidArrowRight
														size={22}
														className="group-active:translate-x-5 sm:group-hover:translate-x-5 group-focus-visible:translate-x-5 rotate-0"
													/>
												</span>
											</div>
										</Link>

										<ul className="flex w-[300px] grow flex-col gap-2">
											<li className="flex grow">
												<Link
													href={activeNav.features[1].path || ""}
													className="group relative flex h-full w-full shrink-0 flex-col justify-end gap-6 overflow-hidden rounded-lg bg-neutral-900 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
													data-menu-item={activeNav.features[1].path}
													tabIndex={0}
												>
													<div className="absolute inset-0 opacity-70 transition-transform duration-400 ease-out group-hover:scale-105 group-hover:opacity-100">
														<div className="flex h-full items-center justify-center">
															<Icon.SolidLogo
																size={280}
																className="text-secondary-foreground"
															/>
														</div>
													</div>
													<div className="z-10 w-full self-end bg-gradient-to-t from-neutral-900 to-neutral-900/0 p-2.5 pr-11 pt-8">
														<p className="text-base font-semibold text-neutral-100">
															{activeNav.features[1].title}
														</p>
														<p className="text-sm font-normal text-neutral-400">
															{activeNav.features[1].description}
														</p>
													</div>
													<div className="absolute bottom-2 right-2 z-10 flex size-8 items-center justify-center rounded-full bg-white/10 text-neutral-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
														<span className="relative flex size-5 items-center justify-center overflow-hidden *:transition-transform *:duration-[400ms] *:ease-bounce">
															<Icon.SolidArrowRight
																size={22}
																className="absolute -translate-x-5 group-active:translate-x-0 sm:group-hover:translate-x-0 sm:group-focus:translate-x-0 group-focus-visible:translate-x-0 rotate-0"
															/>
															<Icon.SolidArrowRight
																size={22}
																className="group-active:translate-x-5 sm:group-hover:translate-x-5 group-focus-visible:translate-x-5 rotate-0"
															/>
														</span>
													</div>
												</Link>
											</li>
											<li>
												<a
													href="https://discord.gg/your-community"
													target="_blank"
													rel="noopener noreferrer"
													className="group flex w-full shrink-0 items-center gap-6 rounded-lg bg-neutral-900 p-2.5 pr-4 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
													data-menu-item={activeNav.features.length}
												>
													<div className="relative *:h-10 *:w-9 *:rounded-lg *:transition-transform *:duration-200 *:ease-bigBounce">
														<div className="absolute left-1.5 top-0 rotate-[16deg] bg-neutral-400 group-hover:-translate-x-1 group-hover:-rotate-[8deg] group-focus:-translate-x-1 group-focus:-rotate-[8deg]" />
														<div className="relative flex items-center justify-center bg-neutral-100 text-neutral-700 group-hover:translate-x-1.5 group-hover:rotate-[16deg] group-focus:translate-x-1.5 group-focus:rotate-[16deg]">
															{activeNav.features[1].icon ? (
																<Icon.SolidLogo size={20} />
															) : (
																<Icon.SolidLogo size={20} />
															)}
														</div>
													</div>
													<div>
														<p className="text-base font-semibold text-neutral-100">
															Join our Community
														</p>
														<p className="text-sm font-normal text-neutral-400">
															Get help from our community
														</p>
													</div>
												</a>
											</li>
										</ul>
									</header>
								)}

								{activeNav.name === "Plugins" && (
									<header className="fade flex gap-2 animate-fadeSm">
										<ul className="flex w-full max-w-[280px] flex-col gap-2">
											{activeNav.features.map((plugin) => (
												<li
													key={plugin.title}
													data-menu-item={plugin.title}
													className="group flex w-full shrink-0 items-center gap-6 rounded-lg bg-neutral-900 p-2.5 pr-4 hover:bg-neutral-800 focus:bg-neutral-800 focus:outline-none"
												>
													<div className="relative *:h-10 *:w-9 *:rounded-lg *:transition-transform *:duration-200 *:ease-bigBounce">
														<div className="absolute left-1.5 top-0 rotate-[16deg] bg-neutral-400 group-hover:-translate-x-1 group-hover:-rotate-[8deg] group:focus .relative *:first-child" />
														<div className="relative flex items-center justify-center bg-neutral-100 text-neutral-700 group-hover:translate-x-1.5 group-focus:translate-x-1.5 group-hover:rotate-[16deg] group-focus:rotate-[16deg]">
															<Icon.SolidLogo size={20} />
														</div>
													</div>
													<div>
														<p className="text-base font-semibold text-neutral-100">
															{plugin.title}
														</p>
														<p className="text-sm font-normal text-neutral-400">
															{plugin.description}
														</p>
													</div>
												</li>
											))}
										</ul>
									</header>
								)}
							</div>
						</div>

						{isKeyboardNavigation && (
							<div
								className="fade absolute top-full mt-4 left-1/2 z-10 w-max -translate-x-1/2 flex gap-4 animate-fadeSm"
								style={{ animationDelay: "200ms" }}
							>
								<div className="flex items-center drop-shadow-lg">
									<span className="mr-2 rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-800">
										↓
									</span>
									<span className="text-white">Enter menu</span>
								</div>
								<div className="flex items-center drop-shadow-lg">
									<span className="mr-2 rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-800">
										tab
									</span>
									<span className="text-white">Navigate menu</span>
								</div>
								<div className="flex items-center drop-shadow-lg text-white">
									<span className="mr-2 rounded bg-neutral-100 px-2 py-0.5 text-xs font-bold text-neutral-800">
										↑
									</span>
									<span className="text-white">Exit menu</span>
								</div>
							</div>
						)}
					</div>
				)}
			</div> */}
		</header>
	);
};
