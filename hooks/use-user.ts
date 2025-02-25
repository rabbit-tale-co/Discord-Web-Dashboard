"use client";

import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useMemo } from "react";

import type * as Discord from "discord.js";
import { clearCache, getCachedData } from "@/lib/cache";
import { setCachedData } from "@/lib/cache";

export function login() {
	window.location.href = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback&response_type=code&scope=identify+guilds+email+applications.commands.permissions.update`;
}

export async function logout() {
	await fetch("/api/auth/logout");
	clearCache("me");
}

export async function getMe(): Promise<Discord.User | null> {
	try {
		const cached = getCachedData("me");
		const cacheTimestamp = getCachedData("me-timestamp") as number;
		const now = Date.now();
		const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

		// Use cache if valid
		if (cached && cacheTimestamp && now - cacheTimestamp <= CACHE_TIME) {
			return cached as Discord.User;
		}

		const res = await fetch("/api/auth/me", {
			method: "GET",
			credentials: "include",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			cache: "no-store",
		});

		if (!res.ok) {
			if (res.status === 401) {
				localStorage.removeItem("user");
				return null;
			}
			console.error("API Error:", res.status, res.statusText);
			return null;
		}

		const data = await res.json();

		if (data?.username) {
			setCachedData("me", data);
			setCachedData("me-timestamp", now);
			return data;
		}
		return null;
	} catch (error) {
		console.error("GetMe error:", error);
		return null;
	}
}

// Get user by ID
export async function getUser(userId: string): Promise<Discord.User | null> {
	try {
		const cached = getCachedData(`user-${userId}`);
		const cacheTimestamp = getCachedData(`user-${userId}-timestamp`) as number;
		const now = Date.now();
		const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

		// Use cache if valid
		if (cached && cacheTimestamp && now - cacheTimestamp <= CACHE_TIME) {
			return cached as Discord.User;
		}

		const res = await fetch(`/api/users/${userId}`);
		const data = await res.json();

		if (data) {
			setCachedData(`user-${userId}`, data);
			setCachedData(`user-${userId}-timestamp`, now);
		}

		return data;
	} catch (error) {
		console.error("Error fetching user:", error);
		return null;
	}
}

export function useMe() {
	const [userData, setUserData] = useState<Discord.User | null>(() => {
		// Initialize with cached data
		return getCachedData("me") || null;
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() => {
		return getCachedData("me") ? "success" : "loading";
	});
	const [error, setError] = useState<string | null>(null);

	const protectedPaths = ["/dashboard", "/servers"];
	const router = useRouter();
	const pathname = usePathname();
	const isProtectedPath = protectedPaths.some((path) =>
		pathname.startsWith(path),
	);

	const isLoggedIn = useMemo(() => {
		if (typeof window === "undefined") return null;
		try {
			const localUser = getCachedData("me");
			// console.log("LocalStorage user:", localUser); // Debug localStorage
			if (!localUser) return null;
			return localUser;
		} catch (err) {
			console.error("LocalStorage error:", err);
			clearCache("me");
			return null;
		}
	}, []);

	const login = async () => {
		window.location.href = `https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback&response_type=code&scope=identify+guilds+email+applications.commands.permissions.update`;
	};

	const logout = async () => {
		await fetch("/api/auth/logout");
		localStorage.removeItem("user");
		setUserData(null);
	};

	useEffect(() => {
		if (isLoggedIn) {
			setUserData(isLoggedIn as Discord.User);
			setStatus("success");
			return;
		}

		console.log("isLoggedIn", isLoggedIn);

		getMe()
			.then((data) => {
				if (data) {
					setCachedData("me", data);
					setUserData(data);
				}
				setStatus("success");
			})
			.catch((err) => {
				setError(err.message);
				setStatus("error");
			});
	}, [isLoggedIn]);

	useEffect(() => {
		if (!isProtectedPath) return;
		if (!isLoggedIn) {
			router.push("/");
		}
	}, [isProtectedPath, router, isLoggedIn]);

	return { userData, status, error, isLoggedIn, logout, login };
}

export function useUser(userId: string) {
	const [userData, setUserData] = useState<Discord.User | null>(() => {
		// Initialize with cached data
		return getCachedData(`user-${userId}`) || null;
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() => {
		return getCachedData(`user-${userId}`) ? "success" : "loading";
	});
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (!userId) {
			setStatus("success");
			return;
		}

		const cached = getCachedData(`user-${userId}`);
		const cacheTimestamp = getCachedData(`user-${userId}-timestamp`) as number;
		const now = Date.now();
		const CACHE_TIME = 1000 * 60 * 5; // 5 minutes

		// Only fetch if no cache or cache is expired
		if (!cached || !cacheTimestamp || now - cacheTimestamp > CACHE_TIME) {
			getUser(userId)
				.then((data) => {
					setUserData(data);
					setStatus("success");
				})
				.catch((err) => {
					setError(err.message);
					setStatus("error");
				});
		}
	}, [userId]);

	return { userData, status, error };
}
