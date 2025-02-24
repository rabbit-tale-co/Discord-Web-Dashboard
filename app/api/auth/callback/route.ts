import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: Request) {
	const { searchParams } = new URL(request.url);
	const code = searchParams.get("code");

	if (!code) {
		return NextResponse.redirect(new URL("/?error=missing_code", request.url));
	}

	const params = new URLSearchParams({
		client_id: process.env.NEXT_PUBLIC_BOT_ID || "",
		client_secret: process.env.BOT_CLIENT_SECRET || "",
		code,
		grant_type: "authorization_code",
		redirect_uri: `${process.env.NEXT_PUBLIC_DASHBOARD_URL}/api/auth/callback`,
		scope: "identify email guilds",
	});

	if (!process.env.NEXT_PUBLIC_BOT_ID || !process.env.BOT_CLIENT_SECRET) {
		return NextResponse.redirect(
			new URL("/?error=invalid_client_config", request.url),
		);
	}

	try {
		const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: params.toString(),
		});

		if (!tokenResponse.ok) {
			const errorText = await tokenResponse.text();
			console.error("Token exchange failed:", errorText);
			throw new Error('Token exchange failed');
		}

		const data = await tokenResponse.json();

		// Get user data from Discord
		const userResponse = await fetch("https://discord.com/api/users/@me", {
			headers: {
				Authorization: `Bearer ${data.access_token}`,
			},
		});

		if (!userResponse.ok) {
			const errorText = await userResponse.text();
			console.error("User data fetch failed:", errorText);
			throw new Error('Failed to fetch user data');
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
		};

		// Create response with redirect
		const response = NextResponse.redirect(
			new URL("/", process.env.NEXT_PUBLIC_DASHBOARD_URL || request.url)
		);

		// Set cookies using the cookies() API
		const cookiesStore = cookies();

		// Set access token cookie
		cookiesStore.set("access_token", data.access_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			maxAge: data.expires_in,
			path: "/",
		});

		// Set refresh token cookie
		cookiesStore.set("refresh_token", data.refresh_token, {
			httpOnly: true,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
		});

		// Set user data cookie
		cookiesStore.set("user", JSON.stringify(sessionData.user), {
			httpOnly: false,
			secure: process.env.NODE_ENV === "production",
			sameSite: "lax",
			path: "/",
		});

		return response;
	} catch (error) {
		console.error('Auth error:', error);
		return NextResponse.redirect(
			new URL("/?error=auth_failed", process.env.NEXT_PUBLIC_DASHBOARD_URL || request.url)
		);
	}
}
