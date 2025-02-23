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
