"use client";
import type React from "react";
import { useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import * as Icon from "@/components/icons";
import { useAuth } from "@/app/authContext";
import { UserInfo } from "@/components/user-info";
import type { NavSection } from "@/types/navigation";
import { ExpandedMenu } from "./navigation/expanded-menu";
import { navigationConfig } from "./navigation/config";
import { useNav } from "@/hooks/use-nav";
import { useSidebar } from "./navigation/sidebar";
import { DropDownUser } from "./drop-down-user";

export const Header = () => {
	const {
		activeNav,
		isInExpandedMenu,
		isKeyboardNavigation,
		isMounted,
		setActiveNav,
		setIsInExpandedMenu,
		setIsKeyboardNavigation,
		setIsMouseInteraction,
	} = useNav();

	const { toggleSidebar } = useSidebar();

	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const botName = process.env.NEXT_PUBLIC_BOT_NAME || "";
	const { user, login } = useAuth();

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

	if (!isMounted) return null;

	return (
		<header className="fixed w-full top-0 left-0 py-1 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
			{/* Progressive Blur Overlay */}
			<div className="absolute hidden inset-0 pointer-events-none transform scale-y-[-1]">
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
								variant="ghost"
								className="relative px-4"
								data-nav-button={index}
								onMouseEnter={() => handleNavEnter(item)}
								onMouseLeave={handleNavLeave}
								onClick={() => setActiveNav(item)}
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
							<DropDownUser
								username={user.username}
								email={user.email}
								avatar={user.avatar || ""}
								id={user.id}
							/>
						) : (
							<Button
								asChild
								variant="discord"
								size="lg"
								className="max-md:hidden"
							>
								<Button
									variant="discord"
									size="lg"
									className="max-md:hidden"
									onClick={() => login()}
								>
									Login
									<Icon.SolidDiscord size={22} />
								</Button>
							</Button>
						)}

						<Button
							variant={"secondary"}
							size={"iconLg"}
							onClick={toggleSidebar}
							className="max-md:block hidden"
						>
							<Icon.OutlineMenu size={22} />
						</Button>
					</div>
				</nav>

				{activeNav && (
					<ExpandedMenu
						section={activeNav}
						isOpen={isInExpandedMenu}
						onClose={() => {
							setActiveNav(null);
							setIsInExpandedMenu(false);
						}}
					/>
				)}
			</div>
		</header>
	);
};
