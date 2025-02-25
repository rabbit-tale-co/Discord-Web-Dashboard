import { useEffect, useState } from "react";

export interface UserData {
	id: string;
	username: string;
	displayName?: string;
	avatar: string;
	email: string;
}

export function useGetUser(userId: string) {
	const [userData, setUserData] = useState<UserData | null>(null);
	const [status, setStatus] = useState<"loading" | "error" | "success">(
		"loading",
	);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		if (userId) {
			setStatus("loading");
			fetch(`/api/users/${userId}`)
				.then(async (res) => {
					if (!res.ok) {
						const errorData = await res.json();
						throw new Error(errorData.error || "Failed to fetch user");
					}
					return res.json();
				})
				.then((data) => {
					setUserData(data);
					setStatus("success");
				})
				.catch((err) => {
					console.error("Error fetching user:", err);
					setError(err.message);
					setStatus("error");
				});
		}
	}, [userId]);

	return { userData, status, error };
}
