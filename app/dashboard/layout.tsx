import type { Metadata } from "next";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashbaord/sidebar";
import { DashboardHeader } from "@/components/dashbaord/header";
import { Footer } from "@/components/footer";

export const metadata: Metadata = {
	title: "Discord Bot Dashboard",
	description: "Discord Bot Dashboard",
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
					<DashboardHeader />
					{children}
				</div>
				{/* <Footer /> */}
			</SidebarProvider>
		</div>
	);
}
