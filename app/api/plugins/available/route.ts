import { NextResponse } from "next/server";

export async function GET() {
	try {
		if (!process.env.NEXT_PUBLIC_BACKEND_URL) {
			throw new Error("Backend URL not configured");
		}

		const url = `${process.env.NEXT_PUBLIC_BACKEND_URL}/v1/plugins/available`;
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			cache: "no-cache",
		});

		if (!response.ok) {
			throw new Error("Failed to fetch available plugins");
		}

		const data = await response.json();
		return NextResponse.json(data);
	} catch (error) {
		console.error("Error fetching available plugins:", error);
		return NextResponse.json(
			{ error: "Failed to fetch available plugins" },
			{ status: 500 },
		);
	}
}
