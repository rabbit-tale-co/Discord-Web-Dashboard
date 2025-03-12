"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";

import { cn } from "@/lib/utils";

function Tabs({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Root>) {
	return (
		<TabsPrimitive.Root
			data-slot="tabs"
			className={cn("flex flex-col gap-2", className)}
			{...props}
		/>
	);
}

function TabsList({
	className,
	orientation = "horizontal",
	...props
}: React.ComponentProps<typeof TabsPrimitive.List> & {
	orientation?: "horizontal" | "vertical";
}) {
	return (
		<TabsPrimitive.List
			data-slot="tabs-list"
			className={cn(
				"rounded-lg p-1 flex flex-wrap",
				orientation === "vertical"
					? "flex-col w-full gap-1"
					: "items-center justify-center gap-1",
				"bg-muted text-muted-foreground",
				className,
			)}
			{...props}
		/>
	);
}

function TabsTrigger({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
	return (
		<TabsPrimitive.Trigger
			data-slot="tabs-trigger"
			className={cn(
				"data-[state=active]:bg-background data-[state=active]:text-foreground",
				"focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring",
				"inline-flex items-center justify-center gap-2 rounded-md px-3 py-1.5",
				"text-sm font-medium whitespace-nowrap transition-all",
				"focus-visible:ring-[3px] focus-visible:outline-1",
				"disabled:pointer-events-none disabled:opacity-50",
				"data-[state=active]:shadow-sm",
				"w-full",
				"[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
				className,
			)}
			{...props}
		/>
	);
}

function TabsContent({
	className,
	...props
}: React.ComponentProps<typeof TabsPrimitive.Content>) {
	return (
		<TabsPrimitive.Content
			data-slot="tabs-content"
			className={cn("flex-1 outline-none", className)}
			{...props}
		/>
	);
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
