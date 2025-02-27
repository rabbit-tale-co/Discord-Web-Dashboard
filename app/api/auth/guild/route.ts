import { NextResponse } from "next/server";

/*
 * This route is used to handle the guild oauth callback
 * Is used to open a new window to add the bot to the guild and close window after success
 */

export async function GET() {
	const html = `
		<!DOCTYPE html>
		<html>
		  <head><title>Bot Added Successfully</title></head>
		  <body>
			<script>
			  window.opener.postMessage('guild-success', '*');
			  window.close();
			</script>
		  </body>
		</html>
		`;

	return new NextResponse(html, {
		status: 200,
		headers: {
			"Content-Type": "text/html",
		},
	});
}
