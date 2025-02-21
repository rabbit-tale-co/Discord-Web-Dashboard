"use client";

import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import Link from "next/link";

const HTTP_STATUS_MESSAGES: Record<number, string> = {
	400: "Bad Request",
	401: "Unauthorized",
	403: "Forbidden",
	404: "Not Found",
	500: "Internal Server Error",
};

function ErrorContent() {
	const searchParams = useSearchParams();
	const statusCode = Number(searchParams.get("status")) || 500;
	const errorCode = searchParams.get("code") || "unknown_error";
	const errorMessage =
		searchParams.get("message") ||
		HTTP_STATUS_MESSAGES[statusCode] ||
		"An error occurred";

	if (statusCode === 404) {
		return (
			<div className="flex h-screen flex-col items-center justify-center gap-4">
				<h1 className="text-4xl font-bold text-red-500">404 - Not Found</h1>
				<p className="text-lg text-neutral-300">
					The requested resource could not be found
				</p>
				<Button asChild variant="destructive">
					<Link href="/">Return to Home</Link>
				</Button>
			</div>
		);
	}

	return (
		<div className="flex h-screen flex-col items-center justify-center gap-4">
			<h1 className="text-4xl font-bold text-red-500">
				{statusCode} - {HTTP_STATUS_MESSAGES[statusCode] || "Error"}
			</h1>
			<p className="text-lg text-neutral-300">{errorMessage}</p>
			{errorCode && (
				<p className="text-sm text-neutral-400">
					Error Code: <code>{errorCode}</code>
				</p>
			)}
			<Button asChild variant="destructive">
				<Link href="/">Return to Home</Link>
			</Button>
		</div>
	);
}

export default function ErrorPage() {
	return <ErrorContent />;
}
