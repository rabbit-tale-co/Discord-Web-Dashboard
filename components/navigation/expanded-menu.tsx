// ExpandedMenu.tsx
import React from "react";
import { useEffect, useState, useRef } from "react";
import type {
	NavSection,
	Item,
	SmallItem,
	LargeItem,
	NavItem,
} from "@/types/navigation";
import { FeatureCard } from "./feature-card";
import { useNav } from "@/hooks/use-nav";

interface ExpandedMenuProps {
	section: NavSection;
	isOpen: boolean;
	onClose: () => void;
}

export const ExpandedMenu: React.FC<ExpandedMenuProps> = ({
	section,
	isOpen,
	onClose,
}) => {
	const {
		isKeyboardNavigation,
		setIsMouseInteraction,
		focusedMenuIndex,
		isInExpandedMenu,
	} = useNav();
	const [contentDimensions, setContentDimensions] = useState({
		width: 0,
		height: 0,
	});

	const contentRef = useRef<HTMLDivElement>(null);
	const closeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

	useEffect(() => {
		const current = contentRef.current;
		if (!current) return;

		const rect = current.getBoundingClientRect();
		setContentDimensions({
			width: Math.round(rect.width),
			height: Math.round(rect.height),
		});

		const observer = new ResizeObserver((entries) => {
			const entry = entries[0];
			if (!entry) return;

			setContentDimensions({
				width: Math.round(entry.contentRect.width),
				height: Math.round(entry.contentRect.height),
			});
		});

		observer.observe(current);
		return () => observer.disconnect();
	}, []);

	const handleMenuEnter = () => {
		if (closeTimeoutRef.current) {
			clearTimeout(closeTimeoutRef.current);
			closeTimeoutRef.current = null;
		}
		setIsMouseInteraction(true);
	};

	const handleMenuLeave = () => {
		if (!isKeyboardNavigation) {
			closeTimeoutRef.current = setTimeout(() => {
				onClose();
			}, 100);
		}
	};

	const sectionMap: Record<
		string,
		React.FC<{
			section: NavSection;
			isInExpandedMenu: boolean;
			focusedMenuIndex: number;
		}>
	> = {
		Plugins: FeaturesSection,
		Solutions: SolutionsSection,
		Developers: DevelopersSection,
		Company: CompanySection,
	};

	return (
		<div
			className={`fixed left-1/2 top-16 -translate-x-1/2 z-40 pointer-events-auto transition-opacity duration-300 ${
				isOpen ? "opacity-100 visible" : "opacity-0 invisible"
			}`}
			data-menu-container
			onMouseEnter={handleMenuEnter}
			onMouseLeave={handleMenuLeave}
		>
			<div
				className="relative overflow-hidden rounded-xl border border-primary/75 bg-primary p-2 shadow-2xl"
				style={{
					width: `${contentDimensions.width + 16}px`,
					height: `${contentDimensions.height + 16}px`,
					transition:
						"width 500ms cubic-bezier(0.33,1,0.68,1), height 500ms cubic-bezier(0.33,1,0.68,1)",
					willChange: "width, height",
				}}
			>
				<div ref={contentRef} className="relative w-max">
					<header className="fade flex gap-2 animate-fadeSm">
						{(() => {
							const SectionComponent = sectionMap[section.title];
							return SectionComponent ? (
								<SectionComponent
									section={section}
									isInExpandedMenu={isInExpandedMenu}
									focusedMenuIndex={focusedMenuIndex}
								/>
							) : null;
						})()}
					</header>
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
	);
};

const FeaturesSection = ({
	section,
	isInExpandedMenu,
	focusedMenuIndex,
}: {
	section: NavSection;
	isInExpandedMenu: boolean;
	focusedMenuIndex: number;
}) => {
	// Add null check and provide default empty array
	const items =
		section.categories?.reduce<NavItem[]>((acc, category) => {
			acc.push(...(category.items || []));
			return acc;
		}, []) || [];

	return (
		<React.Fragment>
			<ul className="flex w-full max-w-[420px] flex-col gap-2">
				{items
					.filter((f): f is NavItem => f.type === "small")
					.map((item, index) => (
						<FeatureCard
							key={item.title}
							feature={item}
							isFocused={isInExpandedMenu && focusedMenuIndex === index}
							data-menu-item={index}
						/>
					))}
			</ul>
			<div className="flex gap-2">
				{items
					.filter((f): f is NavItem => f.type === "large")
					.slice(0, 2)
					.map((item, index) => (
						<FeatureCard
							key={item.title}
							feature={item}
							isFocused={false}
							data-menu-item={index + items.length}
						/>
					))}
			</div>
		</React.Fragment>
	);
};

const SolutionsSection = ({
	section,
	isInExpandedMenu,
	focusedMenuIndex,
}: {
	section: NavSection;
	isInExpandedMenu: boolean;
	focusedMenuIndex: number;
}) => {
	const items =
		section.categories?.reduce<NavItem[]>((acc, category) => {
			acc.push(...(category.items || []));
			return acc;
		}, []) || [];

	return (
		<React.Fragment>
			<div className="flex gap-2">
				{items
					.filter((f) => f.type === "large")
					.slice(0, 3)
					.map((item, index) => (
						<FeatureCard
							key={item.title}
							feature={item}
							isFocused={false}
							data-menu-item={index}
						/>
					))}
			</div>
		</React.Fragment>
	);
};

const DevelopersSection = ({
	section,
	isInExpandedMenu,
	focusedMenuIndex,
}: {
	section: NavSection;
	isInExpandedMenu: boolean;
	focusedMenuIndex: number;
}) => {
	const items =
		section.categories?.reduce<NavItem[]>((acc, category) => {
			acc.push(...(category.items || []));
			return acc;
		}, []) || [];
	return (
		<React.Fragment>
			<ul className="flex w-full max-w-[420px] flex-col gap-2">
				{items
					.filter((f) => f.type === "small")
					.map((item, index) => (
						<FeatureCard
							key={item.title}
							feature={item}
							isFocused={isInExpandedMenu && focusedMenuIndex === index}
							data-menu-item={index}
						/>
					))}
			</ul>
			<div className="flex gap-2">
				{items
					.filter((f) => f.type === "large")
					.slice(0, 1)
					.map((item, index) => (
						<FeatureCard
							key={item.title}
							feature={item}
							isFocused={false}
							data-menu-item={
								index + items.filter((f) => f.type === "small").length
							}
						/>
					))}
			</div>
		</React.Fragment>
	);
};

const CompanySection = ({
	section,
	isInExpandedMenu,
	focusedMenuIndex,
}: {
	section: NavSection;
	isInExpandedMenu: boolean;
	focusedMenuIndex: number;
}) => {
	const items =
		section.categories?.reduce<NavItem[]>((acc, category) => {
			acc.push(...(category.items || []));
			return acc;
		}, []) || [];
	return (
		<React.Fragment>
			<div className="flex gap-2">
				<div className="flex flex-col gap-2 flex-1">
					{items
						.filter((f) => f.type === "large")
						.slice(0, 1)
						.map((item, index) => (
							<FeatureCard
								key={item.title}
								feature={item}
								isFocused={false}
								data-menu-item={index}
							/>
						))}
				</div>
				<div className="flex flex-col gap-2">
					<div className="flex-1">
						{items
							.filter((f) => f.type === "large")
							.slice(1, 2)
							.map((item, index) => (
								<FeatureCard
									key={item.title}
									feature={{
										...item,
										minHeight: "100%",
									}}
									isFocused={false}
									data-menu-item={index + 1}
								/>
							))}
					</div>
					{items
						.filter((f) => f.type === "small")
						.map((item, index) => (
							<FeatureCard
								key={item.title}
								feature={item}
								isFocused={isInExpandedMenu && focusedMenuIndex === index}
								data-menu-item={index + 2}
							/>
						))}
				</div>
			</div>
		</React.Fragment>
	);
};
