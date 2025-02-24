"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";
import { useRouter, usePathname } from "next/navigation";

export interface UserSession {
	id: string;
	username: string;
	global_name: string;
	avatar: string;
	email: string;
	verified: boolean;
}

interface AuthContextType {
	user: UserSession | null;
	setUser: Dispatch<SetStateAction<UserSession | null>>;
	logout: () => void;
	isProtectedPath: boolean;
	isLoading: boolean;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	setUser: () => {},
	logout: () => {},
	isProtectedPath: false,
	isLoading: true,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<UserSession | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	const protectedPaths = ["/dashboard", "/servers"];
	const router = useRouter();
	const pathname = usePathname();
	const isProtectedPath = protectedPaths.some((path) =>
		pathname.startsWith(path),
	);

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			setUser(JSON.parse(storedUser));
			setIsLoading(false);
		} else {
			fetch("/api/session")
				.then((res) => res.json())
				.then((data) => {
					if (data.user) {
						setUser(data.user);
						localStorage.setItem("user", JSON.stringify(data.user));
					}
					setIsLoading(false);
				})
				.catch((err) => {
					console.error("Error fetching session:", err);
					setIsLoading(false);
				});
		}
	}, []);

	useEffect(() => {
		if (!isLoading && !user && isProtectedPath) {
			router.push("/");
		}
	}, [user, isProtectedPath, router, isLoading]);

	const logout = async () => {
		await fetch("/api/auth/logout");
		setUser(null);
		localStorage.removeItem("user");
	};

	return (
		<AuthContext.Provider
			value={{ user, setUser, logout, isProtectedPath, isLoading }}
		>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
