import type { Metadata } from "next";
import { SidebarProvider } from "@/components/navigation/sidebar";
import { DashboardSidebar } from "@/components/dashbaord/sidebar";
import { DashboardHeader } from "@/components/dashbaord/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
	title: `Discord Bot | ${process.env.NEXT_PUBLIC_BOT_NAME}`,
	description: "The best Discord bot for your server",
};

export default function DashboardLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<div className="flex h-screen w-screen overflow-hidden">
			<SidebarProvider>
				<DashboardSidebar />

				{/* <SidebarTrigger /> */}
				<div className="flex flex-col w-full">
					{/* <DashboardHeader /> */}
					{children}
				</div>
				{/* <Footer /> */}
			</SidebarProvider>
		</div>
	);
}
