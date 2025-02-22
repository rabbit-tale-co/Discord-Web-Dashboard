import type { Metadata } from "next";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";

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
		<div className="flex h-screen w-screen">
			<SidebarProvider>
				<DashboardSidebar />
				<div className="w-3/4 bg-white">
					<SidebarTrigger />
					{children}
				</div>
			</SidebarProvider>
		</div>
	);
}
