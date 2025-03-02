import type { Metadata } from "next";
import { SidebarProvider } from "@/components/navigation/sidebar";
import { DashboardSidebar } from "@/components/dashbaord/sidebar";
import { PluginsProvider } from "@/context/plugins-context";
import { CommandItem } from "@/components/ui/command";
import { CommandGroup } from "@/components/ui/command";
import { CommandList } from "@/components/ui/command";
import { CommandEmpty } from "@/components/ui/command";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { CommandInput } from "@/components/ui/command";
import { Command } from "@/components/ui/command";

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
				<PluginsProvider>
					<DashboardSidebar />
					{/* <SidebarTrigger /> */}
					<div className="flex flex-col w-full overflow-hidden">
						{/* <DashboardHeader /> */}
						<div className="flex-1 overflow-y-auto">{children}</div>
						{/* <Footer /> */}
					</div>
				</PluginsProvider>
			</SidebarProvider>
		</div>
	);
}
