// NavItemButton.tsx
import { Button } from "@/components/ui/button";
import type React from "react";

interface NavItemButtonProps {
	item: {
		name: string;
		path: string;
		features?: {
			title: string;
			description: string;
			path?: string;
			image?: string;
			icon?: string;
		}[];
	};
	index: number;
	onMouseEnter: () => void;
	onMouseLeave: () => void;
	onFocus: () => void;
	onBlur: (e: React.FocusEvent<HTMLButtonElement>) => void;
	onClick: () => void;
}

export const NavItemButton: React.FC<NavItemButtonProps> = ({
	item,
	index,
	onMouseEnter,
	onMouseLeave,
	onFocus,
	onBlur,
	onClick,
}) => {
	return (
		<Button
			size="lg"
			variant="link"
			className="relative rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
			data-nav-item={index}
			tabIndex={0}
			onMouseEnter={onMouseEnter}
			onMouseLeave={onMouseLeave}
			onFocus={onFocus}
			onClick={onClick}
			onBlur={onBlur}
		>
			{item.name}
		</Button>
	);
};
