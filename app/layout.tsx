import type { Metadata } from "next";
import { Toaster } from "@/components/ui/sonner";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/app/authContext";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";

const geistSans = Geist({
	variable: "--font-geist-sans",
	subsets: ["latin"],
});

const geistMono = Geist_Mono({
	variable: "--font-geist-mono",
	subsets: ["latin"],
});

export const metadata: Metadata = {
	title: "Discord Bot Dashboard",
	description: "Discord Bot Dashboard",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<head>
				{/* <script
					crossOrigin="anonymous"
					src="//unpkg.com/react-scan/dist/auto.global.js"
				/> */}
			</head>
			<body
				className={`${geistSans.variable} ${geistMono.variable} antialiased`}
			>
				<Suspense
					fallback={
						<div className="min-h-screen w-full">
							<header className="container max-w-7xl mx-auto py-6">
								<div className="flex items-center justify-between">
									<Skeleton className="h-10 w-32" />
									<nav className="hidden md:flex gap-6">
										<Skeleton className="h-6 w-16" />
										<Skeleton className="h-6 w-16" />
										<Skeleton className="h-6 w-16" />
									</nav>
									<div className="flex gap-4">
										<Skeleton className="h-10 w-24" />
										<Skeleton className="h-10 w-24" />
									</div>
								</div>
							</header>

							<div className="grid grid-rows-[.03fr_1fr] sm:grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen container pb-20 gap-16 max-w-7xl mx-auto">
								<main className="flex flex-col gap-8 row-start-2 w-full">
									<div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
										<div className="space-y-6">
											<Skeleton className="h-20 w-3/4" />
											<Skeleton className="h-16 w-2/3" />
											<div className="flex gap-4">
												<Skeleton className="h-12 w-32" />
												<Skeleton className="h-12 w-32" />
											</div>
											<div className="flex gap-8 pt-8">
												<Skeleton className="h-20 w-48" />
												<Skeleton className="h-20 w-48" />
											</div>
										</div>
										<Skeleton className="w-[450px] h-[400px] rounded-3xl" />
									</div>
								</main>

								<footer className="row-start-3 py-6 flex gap-6 flex-wrap items-center justify-center">
									<Skeleton className="h-6 w-24" />
									<Skeleton className="h-6 w-24" />
									<Skeleton className="h-6 w-32" />
								</footer>
							</div>
						</div>
					}
				>
					<AuthProvider>{children}</AuthProvider>
				</Suspense>
				<Toaster position="top-center" richColors />
			</body>
		</html>
	);
}
