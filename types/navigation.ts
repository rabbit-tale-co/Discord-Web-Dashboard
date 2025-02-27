import type { LucideIcon } from "lucide-react";

// Base feature interface that all features share
export interface BaseFeature {
	title: string;
	description: string;
	url?: string;
	icon?: React.ElementType;
	minWidth?: number;
	minHeight?: string;
	items?: {
		title: string;
		description: string;
		url: string;
		icon?: React.ElementType;
	}[];
}

// Small feature type
export interface SmallItem extends BaseFeature {
	type: "small";
}

// Large feature type
export interface LargeItem extends BaseFeature {
	type: "large";
	image?: string;
	minHeight?: string;
	minWidth?: number;
}

export type Item = SmallItem | LargeItem;

// Add category type
export interface CategoryItem {
	title: string;
	description: string;
	url: string;
	icon?: React.ElementType;
}

export interface Category {
	type: "category";
	title: string;
	items: CategoryItem[];
}

// Navigation section type
export interface NavSection {
	title: string;
	iconName: string;
	categories: NavCategory[];
	features?: NavItem[];
	url?: string;
}

// Navigation item type for sidebar
export interface NavigationItem {
	title: string;
	url: string;
	icon?: React.ElementType;
	isActive?: boolean;
	// category
	items?: {
		title: string;
		url: string;
		items?: {
			title: string;
			description: string;
			url: string;
			type: "small" | "large";
		}[];
	}[];
}

// Update NavMain props type
export interface NavMainCategory {
	title: string;
	items: CategoryItem[];
}

export interface NavMainItem {
	title: string;
	url: string;
	icon?: React.ElementType;
	isActive?: boolean;
	items: NavMainCategory[];
}

export interface NavItem {
	type: "small" | "large";
	title: string;
	description: string;
	url: string;
	iconName?: string;
	minWidth?: number;
	minHeight?: string;
	premium?: boolean;
	enabled?: boolean;
}

export interface NavCategory {
	title: string;
	iconName?: string;
	url?: string;
	items: NavItem[];
}
