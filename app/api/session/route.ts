import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET() {
	// get access token from cookie
	const cookieStore = await cookies();
	const access_token = cookieStore.get(
		process.env.ACCESS_TOKEN_COOKIE_NAME || "",
	)?.value;
	if (!access_token) {
		return NextResponse.json({ user: null });
	}

	const user = cookieStore.get("user")?.value;
	return NextResponse.json({ user: user ? JSON.parse(user) : null });
}
