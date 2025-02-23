import { useEffect, useState, useCallback } from "react";
import { navigationConfig } from "@/components/navigation/config";
import type { NavSection } from "@/types/navigation";

export const useNav = () => {
	const [isExpanded, setIsExpanded] = useState(false);
	const [isInExpandedMenu, setIsInExpandedMenu] = useState(false);
	const [activeNav, setActiveNav] = useState<NavSection | null>(null);
	const [focusedNavIndex, setFocusedNavIndex] = useState(-1);
	const [focusedMenuIndex, setFocusedMenuIndex] = useState(-1);
	const [isKeyboardNavigation, setIsKeyboardNavigation] = useState(false);
	const [isMouseInteraction, setIsMouseInteraction] = useState(false);
	const [isMounted, setIsMounted] = useState(false);

	const scrollToMenuItem = useCallback((index: number) => {
		const menuItem = document.querySelector(
			`[data-menu-item="${index}"]`,
		) as HTMLElement;
		if (menuItem) {
			menuItem.scrollIntoView({ behavior: "smooth" });
		}
	}, []);

	useEffect(() => {
		setIsMounted(true);
		return () => setIsMounted(false);
	}, []);

	//FIXME: Tab navigation is not working
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (["ArrowDown", "ArrowUp", "Escape"].includes(e.key)) {
				e.preventDefault();
			}

			if (isMouseInteraction) {
				setIsKeyboardNavigation(false);
				setActiveNav(null);
				setIsMouseInteraction(false);
				return;
			}

			if (e.key === "ArrowDown") {
				setIsKeyboardNavigation(true);

				if (!activeNav && focusedNavIndex !== -1) {
					setActiveNav(navigationConfig[focusedNavIndex]);
					setIsInExpandedMenu(true);
					setFocusedMenuIndex(0);
					scrollToMenuItem(0);
					return;
				}

				if (!isInExpandedMenu && activeNav) {
					setIsInExpandedMenu(true);
					setFocusedMenuIndex(0);
					scrollToMenuItem(0);
				} else if (isInExpandedMenu && activeNav?.features) {
					const newIndex = Math.min(
						focusedMenuIndex + 1,
						activeNav.features.length - 1,
					);
					setFocusedMenuIndex(newIndex);
					scrollToMenuItem(newIndex);
				}
			} else if (e.key === "ArrowUp") {
				setIsKeyboardNavigation(true);

				if (isInExpandedMenu) {
					if (focusedMenuIndex <= 0) {
						setIsInExpandedMenu(false);
						setFocusedMenuIndex(-1);
						const navButton = document.querySelector(
							`[data-nav-button="${focusedNavIndex}"]`,
						) as HTMLElement;
						navButton?.focus();
					} else {
						const newIndex = focusedMenuIndex - 1;
						setFocusedMenuIndex(newIndex);
						scrollToMenuItem(newIndex);
					}
				}
			} else if (e.key === "Escape") {
				setActiveNav(null);
				setFocusedNavIndex(-1);
				setIsInExpandedMenu(false);
				setFocusedMenuIndex(-1);
				setIsKeyboardNavigation(false);
			}

			if (e.key === "Tab" && isInExpandedMenu) {
				e.preventDefault();
				const itemsCount = activeNav?.features?.length || 0;
				if (itemsCount === 0) return;

				if (e.shiftKey) {
					setFocusedMenuIndex((prev) => (prev - 1 + itemsCount) % itemsCount);
				} else {
					setFocusedMenuIndex((prev) => (prev + 1) % itemsCount);
				}
				scrollToMenuItem(focusedMenuIndex);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [
		activeNav,
		focusedNavIndex,
		focusedMenuIndex,
		isInExpandedMenu,
		isMouseInteraction,
		scrollToMenuItem,
	]);

	return {
		isExpanded,
		isInExpandedMenu,
		activeNav,
		focusedNavIndex,
		focusedMenuIndex,
		isKeyboardNavigation,
		isMouseInteraction,
		isMounted,
		setActiveNav,
		setFocusedNavIndex,
		setFocusedMenuIndex,
		setIsInExpandedMenu,
		setIsKeyboardNavigation,
		setIsMouseInteraction,
	};
};
