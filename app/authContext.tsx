"use client";

import {
	createContext,
	useContext,
	useEffect,
	useState,
	type Dispatch,
	type SetStateAction,
} from "react";

interface UserSession {
	id: string;
	username: string;
	display_name: string;
	avatar: string;
	email: string;
	verified: boolean;
}

interface AuthContextType {
	user: UserSession | null;
	setUser: Dispatch<SetStateAction<UserSession | null>>;
	logout: () => void;
}

const AuthContext = createContext<AuthContextType>({
	user: null,
	setUser: () => {},
	logout: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
	const [user, setUser] = useState<UserSession | null>(null);

	useEffect(() => {
		const storedUser = localStorage.getItem("user");
		if (storedUser) {
			setUser(JSON.parse(storedUser));
		} else {
			fetch("/api/session")
				.then((res) => res.json())
				.then((data) => {
					if (data.user) {
						setUser(data.user);
						localStorage.setItem("user", JSON.stringify(data.user));
					}
				})
				.catch((err) => {
					console.error("Error fetching session:", err);
				});
		}
	}, []);

	const logout = async () => {
		await fetch("/api/auth/logout");
		setUser(null);
		localStorage.removeItem("user");
	};

	return (
		<AuthContext.Provider value={{ user, setUser, logout }}>
			{children}
		</AuthContext.Provider>
	);
};

export const useAuth = () => useContext(AuthContext);
