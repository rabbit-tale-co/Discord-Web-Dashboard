import { NextResponse } from 'next/server'

export async function GET(request: Request) {
	const response = NextResponse.json({ redirectUrl: '/' })

	response.cookies.delete('access_token')
	response.cookies.delete('refresh_token')
	response.cookies.delete('user')

	return response
}
