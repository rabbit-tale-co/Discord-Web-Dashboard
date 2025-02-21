import { cookies } from "next/headers";

const API_URL = "https://api.rabbittale.co/v1/status";
const COOKIE_NAME = "status";
const COOKIE_EXPIRY = 15 * 1000; // 15 seconds

export async function GET() {
	const cookieStore = await cookies();
	const cachedData = cookieStore.get(COOKIE_NAME);

	if (cachedData) {
		const { data, timestamp } = JSON.parse(cachedData.value);
		if (Date.now() - timestamp < COOKIE_EXPIRY) {
			return Response.json(data);
		}
	}

	const res = await fetch(API_URL);
	const newData = await res.json();

	cookieStore.set(
		COOKIE_NAME,
		JSON.stringify({ data: newData, timestamp: Date.now() }),
	);

	return Response.json(newData);
}
