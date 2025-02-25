"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import type * as Discord from "discord.js";
import { clearCache, getCachedData, setCachedData } from "@/lib/cache";

const CACHE_TIME = "1d";

export function login() {
	const loginWindow = window.open(
		`https://discord.com/oauth2/authorize?client_id=${process.env.NEXT_PUBLIC_BOT_ID}&redirect_uri=${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback&response_type=code&scope=identify+guilds+email+applications.commands.permissions.update`,
		"_blank",
	);

	// Listen for message from new window
	window.addEventListener("message", (event) => {
		if (event.data === "login-success") {
			loginWindow?.close();
			window.location.reload();
		}
	});
}

export async function logout() {
	await fetch("/api/auth/logout");
	clearCache("user");
}

async function getMeFromAPI(): Promise<Discord.User | null> {
	try {
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
			setCachedData("user", data, CACHE_TIME);
			return data;
		}
		return null;
	} catch (error) {
		console.error("GetMe error:", error);
		return null;
	}
}

export async function getMe(): Promise<Discord.User | null> {
	const cached = getCachedData<Discord.User>("user");
	if (cached?.data?.id) {
		if (Date.now() < cached.expiresAt) {
			return cached.data;
		}

		getMeFromAPI();
		return cached.data;
	}
	return await getMeFromAPI();
}

async function getUserFromAPI(userId: string): Promise<Discord.User | null> {
	try {
		const res = await fetch(`/api/users/${userId}`);
		if (!res.ok) {
			console.error("Error fetching user:", res.statusText);
			return null;
		}
		const data = await res.json();
		if (data) {
			setCachedData(`user-${userId}`, data, CACHE_TIME);
		}
		return data;
	} catch (error) {
		console.error("Error fetching user:", error);
		return null;
	}
}

export async function getUser(userId: string): Promise<Discord.User | null> {
	const cached = getCachedData<Discord.User>(`user-${userId}`);
	if (cached?.data?.id) {
		if (Date.now() < cached.expiresAt) {
			return cached.data;
		}

		getUserFromAPI(userId);
		return cached.data;
	}
	return await getUserFromAPI(userId);
}

export function useMe() {
	const [userData, setUserData] = useState<Discord.User | null>(() => {
		const cached = getCachedData<Discord.User>("user");
		return cached?.data || null;
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(
		"loading",
	);
	const [error, setError] = useState<string | null>(null);

	const protectedPaths = ["/dashboard", "/servers"];
	const router = useRouter();
	const pathname = usePathname();
	const isProtectedPath = protectedPaths.some((path) =>
		pathname.startsWith(path),
	);

	const isLoggedIn = useMemo(() => {
		const cached = getCachedData<Discord.User>("user");
		if (cached?.data?.id) {
			return cached.data;
		}
		return null;
	}, []);

	useEffect(() => {
		getMe().then((data) => {
			if (data) {
				setUserData(data);
				setStatus("success");
			} else {
				setStatus("error");
			}
		});
	}, []);

	useEffect(() => {
		if (isProtectedPath && !userData && !isLoggedIn) {
			router.push("/");
		}
	}, [isProtectedPath, router, userData, isLoggedIn]);

	useEffect(() => {
		if (isLoggedIn) {
			setUserData(isLoggedIn);
			setStatus("success");
		}
	}, [isLoggedIn]);

	const loginFn = () => {
		login();
	};

	const logoutFn = async () => {
		const res = await fetch("/api/auth/logout");
		const data = await res.json();

		clearCache("user");
		setUserData(null);
		setStatus("success");

		if (data.redirectUrl) {
			router.push(data.redirectUrl);
		} else if (isProtectedPath) {
			router.push("/");
		}

		return Promise.resolve();
	};

	return {
		userData,
		status,
		error,
		isLoggedIn,
		logout: logoutFn,
		login: loginFn,
	};
}

export function useUser(userId: string) {
	const [userData, setUserData] = useState<Discord.User | null>(() => {
		const cached = getCachedData<Discord.User>(`user-${userId}`);
		return cached?.data || null;
	});
	const [status, setStatus] = useState<"loading" | "error" | "success">(() =>
		getCachedData(`user-${userId}`) ? "success" : "loading",
	);
	const [error, setError] = useState<string | null>(null);

	const router = useRouter();
	const pathname = usePathname();
	const protectedPaths = ["/dashboard", "/servers"];
	const isProtectedPath = protectedPaths.some((path) =>
		pathname.startsWith(path),
	);

	useEffect(() => {
		if (!userId) {
			setStatus("success");
			return;
		}

		const cached = getCachedData<Discord.User>(`user-${userId}`);
		if (!cached?.data?.id || Date.now() > cached.expiresAt) {
			getUser(userId)
				.then((data) => {
					setUserData(data);
					setStatus("success");
				})
				.catch((err: Error) => {
					setError(err.message);
					setStatus("error");
				});
		}
	}, [userId]);

	return { userData, status, error };
}
