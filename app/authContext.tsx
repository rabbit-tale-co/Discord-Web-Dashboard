"use client";

import type * as Discord from "discord.js";
import { useMe } from "@/hooks/use-user";
import { createContext, useContext, useEffect, useState } from "react";

interface User extends Discord.User {
	email: string;
}

interface AuthContextType {
	user: User | null;
	error: string | null;
	login: () => Promise<void>;
	logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	error: null,
	login: () => Promise.resolve(),
	logout: () => Promise.resolve(),
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [mounted, setMounted] = useState(false);
	const { userData, error, logout, login } = useMe();

	useEffect(() => {
		setMounted(true);
	}, []);

	if (!mounted) {
		return null;
	}

	return (
		<AuthContext.Provider
			value={{
				user: userData as User,
				logout,
				login,
				error,
			}}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
