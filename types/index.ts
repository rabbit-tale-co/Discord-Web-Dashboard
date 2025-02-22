export interface SessionData {
	user: {
		id: string;
		username: string;
		avatar: string;
		email: string;
		verified: boolean;
	};
	token: {
		access_token: string;
		refresh_token: string;
		expires_in: number;
		expires_at: number;
		scope: string;
		token_type: string;
	};
}

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
