import { cookies } from "next/headers";

const BOT_ID = process.env.NEXT_PUBLIC_BOT_ID || "";
const API_URL = `https://api.rabbittale.co/v1/stats?bot_id=${BOT_ID}`;
const COOKIE_NAME = "bot_stats";
const COOKIE_EXPIRY = 5 * 60 * 1000; // 5 minut

export async function GET() {
	const cookieStore = await cookies();
	const cachedData = cookieStore.get(COOKIE_NAME);

	if (cachedData) {
		const { data, timestamp } = JSON.parse(cachedData.value);
		if (Date.now() - timestamp < COOKIE_EXPIRY) {
			//console.log("🟢 Returning cached data from cookies");
			return Response.json(data);
		}
	}

	// Fetch new data
	//console.log("🔄 Fetching new data...");
	const res = await fetch(API_URL)
		.then((res) => res.json())
		.catch((error) => {
			console.error("🔴 Error fetching data:", error);
			return {
				guilds: 0,
				users: 0,
				channels: 0,
			};
		});

	const newData = res;

	// Save new data in cookies
	cookieStore.set(
		COOKIE_NAME,
		JSON.stringify({ data: newData, timestamp: Date.now() }),
		{
			httpOnly: false,
			path: "/",
			maxAge: COOKIE_EXPIRY / 1000,
		},
	);

	return Response.json(newData);
}
