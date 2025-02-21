import { NextResponse } from "next/server";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");

	if (!code) {
		return NextResponse.redirect(new URL("/?error=missing_code", request.url));
	}

	const params = new URLSearchParams();
	params.append("client_id", process.env.NEXT_PUBLIC_BOT_ID || "");
	params.append("client_secret", process.env.BOT_CLIENT_SECRET || "");
	params.append("code", code);
	params.append("grant_type", "authorization_code");
	params.append(
		"redirect_uri",
		`${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback`,
	);

	if (!process.env.NEXT_PUBLIC_BOT_ID || !process.env.BOT_CLIENT_SECRET) {
		return NextResponse.redirect(
			new URL("/?error=invalid_client_config", request.url),
		);
	}

	try {
		const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: params.toString(),
		})
			.then((res) => res.json())
			.catch((err) => {
				console.error(err);
				return NextResponse.redirect(
					new URL("/?error=token_exchange_failed", request.url),
				);
			});

		const data = await tokenResponse;

		// Get user data from Discord
		const userResponse = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `${data.token_type} ${data.access_token}`,
			},
		});

		if (!userResponse.ok) {
			console.error("Failed to fetch user data");
			return NextResponse.redirect(
				new URL("/?error=fetch_user_failed", request.url),
			);
		}

		const userData = await userResponse.json();

		// Build session object
		const sessionData = {
			user: {
				id: userData.id,
				username: userData.username,
				global_name: userData.global_name,
				avatar: userData.avatar,
				email: userData.email,
				verified: userData.verified,
			},
			token: {
				access_token: data.access_token,
				refresh_token: data.refresh_token,
				expires_in: data.expires_in,
				expires_at: Date.now() + data.expires_in * 1000,
				token_type: data.token_type,
				scope: data.scope,
			},
		};

		// Prepare redirect URL
		const redirectUrl = new URL("/", request.url);
		const response = NextResponse.redirect(redirectUrl);

		// Set HTTP-only cookie for tokens
		response.cookies.set("access_token", data.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: data.expires_in,
			path: "/",
		});

		response.cookies.set("refresh_token", data.refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
		});

		// Ustaw cookie dla danych użytkownika, dzięki któremu provider będzie mógł odczytać sesję
		response.cookies.set("user", JSON.stringify(sessionData.user), {
			httpOnly: false, // dostępne dla klienta
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
		});

		console.log("Session cookies set successfully");
		return response;
	} catch (error) {
		console.error(error);
		return NextResponse.redirect(
			new URL("/?error=token_exchange_failed", request.url),
		);
	}
}
