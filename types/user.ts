export interface UserData {
	id: string;
	username?: string;
	avatar: string | null;
	displayName?: string;
	discriminator?: string;
	users?: Array<{ id: string; username: string }>;
}
