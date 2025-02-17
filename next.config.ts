import type { NextConfig } from "next";

const nextConfig: NextConfig = {
	env: {
		NEXT_PUBLIC_BOT_NAME: process.env.NEXT_PUBLIC_BOT_NAME,
	},
};

export default nextConfig;
