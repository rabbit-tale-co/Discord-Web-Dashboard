type size = 16 | 32 | 64 | 128 | 256 | 512 | 1024 | 2048 | 4096;

const isGif = (url: string | null) => {
	if (!url) return false;
	return url.startsWith("a_");
};

const getType = (isUserAvatar: boolean) => {
	return isUserAvatar ? "avatars" : "icons";
};

const avatarUrl = (
	id: string,
	avatar: string | null,
	size: size = 128,
	isUserAvatar = true,
) => {
	if (!avatar) {
		const defaultNum = Number.parseInt(id) % 5;
		return `https://cdn.discordapp.com/embed/avatars/${defaultNum}.png`;
	}

	const extension = isGif(avatar) ? "gif" : "webp";
	return `https://cdn.discordapp.com/${getType(isUserAvatar)}/${id}/${avatar}.${extension}?size=${size}`;
};

export default avatarUrl;
