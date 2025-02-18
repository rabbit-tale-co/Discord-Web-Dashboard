// ExpandedMenu.tsx
import type React from "react";
import { useRef, useEffect, useState } from "react";
import { type Feature, FeatureCard } from "./feature-card";

interface ExpandedMenuProps {
	activeNavName: string;
	features: Feature[];
	isInExpandedMenu: boolean;
	focusedMenuIndex: number;
	onMenuEnter: () => void;
	onMenuLeave: () => void;
	contentRef: React.RefObject<HTMLDivElement>;
}

export const ExpandedMenu: React.FC<ExpandedMenuProps> = ({
	activeNavName,
	features,
	isInExpandedMenu,
	focusedMenuIndex,
	onMenuEnter,
	onMenuLeave,
	contentRef,
}) => {
	const [contentDimensions, setContentDimensions] = useState({
		width: 0,
		height: 0,
	});

	useEffect(() => {
		if (contentRef.current) {
			const rect = contentRef.current.getBoundingClientRect();
			setContentDimensions({
				width: Math.round(rect.width),
				height: Math.round(rect.height),
			});
		}
	}, [features, contentRef]);

	return (
		<div
			className={`fixed left-1/2 top-20 -translate-x-1/2 z-40 pointer-events-auto transition-opacity duration-300 ${
				isInExpandedMenu ? "opacity-100 visible" : "opacity-0 invisible"
			}`}
			data-menu-container
			onMouseEnter={onMenuEnter}
			onMouseLeave={onMenuLeave}
		>
			<div
				className="relative overflow-hidden rounded-xl border border-primary/75 bg-primary p-2 shadow-2xl transition-[width,height] duration-500 ease-[cubic-bezier(0.33,1,0.68,1)]"
				style={{
					width: `${contentDimensions.width + 32}px`,
					height: `${contentDimensions.height + 32}px`,
					willChange: "width, height",
				}}
			>
				<div
					ref={contentRef}
					className="grid gap-4 p-4"
					style={{
						gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
					}}
				>
					{features.map((feature, index) => (
						<FeatureCard
							key={feature.title}
							feature={feature}
							isFocused={focusedMenuIndex === index && isInExpandedMenu}
							data-menu-item={index}
						/>
					))}
				</div>
			</div>
		</div>
	);
};
