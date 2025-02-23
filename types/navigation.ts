export interface NavItem {
	name: string;
	path: string;
	icon?: React.ElementType;
	features?: {
		title: string;
		description: string;
		path?: string;
		image?: string;
		icon?: React.ElementType;
	}[];
}

export type BaseFeature = {
	title: string;
	description: string;
	path?: string;
	icon?: React.ElementType;
	minWidth?: number;
};

export type SmallFeature = BaseFeature & {
	type: "small";
};

export type LargeFeature = BaseFeature & {
	type: "large";
	image?: string;
	minHeight?: string;
};

export type Feature = SmallFeature | LargeFeature;

export type NavSection = {
	name: string;
	path: string;
	layout: {
		/** Grid template areas string for precise layout control */
		gridTemplate?: string;
		/** Default minimum width for large cards in this section */
		defaultLargeMinWidth?: number;
	};
	features: Feature[];
};
