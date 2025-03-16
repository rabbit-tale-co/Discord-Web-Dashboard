"use client";

import * as React from "react";

import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { withCn, withProps } from "@udecode/cn";

import { Button } from "@/components/ui/button";

export const TooltipProvider = withProps(TooltipPrimitive.Provider, {
	delayDuration: 0,
	disableHoverableContent: true,
	skipDelayDuration: 0,
});

export const Tooltip = TooltipPrimitive.Root;

export const TooltipTrigger = TooltipPrimitive.Trigger;

export const TooltipPortal = TooltipPrimitive.Portal;

export const TooltipContent = withCn(
	withProps(TooltipPrimitive.Content, {
		sideOffset: 4,
	}),
	"bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance",
);

type TooltipProps<T extends React.ElementType> = {
	delayDuration?: number;
	disableHoverableContent?: boolean;
	skipDelayDuration?: number;
	tooltip?: React.ReactNode;
	tooltipContentProps?: Omit<
		React.ComponentPropsWithoutRef<typeof TooltipContent>,
		"children"
	>;
	tooltipProps?: Omit<
		React.ComponentPropsWithoutRef<typeof Tooltip>,
		"children"
	>;
	tooltipTriggerProps?: React.ComponentPropsWithoutRef<typeof TooltipTrigger>;
} & React.ComponentProps<T>;

export function withTooltip<T extends React.ElementType>(Component: T) {
	return function ExtendComponent({
		delayDuration = 0,
		disableHoverableContent = true,
		skipDelayDuration = 0,
		tooltip,
		tooltipContentProps,
		tooltipProps,
		tooltipTriggerProps,
		...props
	}: TooltipProps<T>) {
		const [mounted, setMounted] = React.useState(false);

		React.useEffect(() => {
			setMounted(true);
		}, []);

		const component = <Component {...(props as React.ComponentProps<T>)} />;

		if (tooltip && mounted) {
			return (
				<TooltipProvider
					delayDuration={delayDuration}
					disableHoverableContent={disableHoverableContent}
					skipDelayDuration={skipDelayDuration}
				>
					<Tooltip {...tooltipProps}>
						<TooltipTrigger asChild {...tooltipTriggerProps}>
							{component}
						</TooltipTrigger>

						<TooltipPortal>
							<TooltipContent {...tooltipContentProps}>
								{tooltip}
							</TooltipContent>
						</TooltipPortal>
					</Tooltip>
				</TooltipProvider>
			);
		}

		return component;
	};
}

export const TooltipButton = withTooltip(Button);

// function TooltipProvider({
// 	delayDuration = 0,
// 	...props
// }: React.ComponentProps<typeof TooltipPrimitive.Provider>) {
// 	return (
// 		<TooltipPrimitive.Provider
// 			data-slot="tooltip-provider"
// 			delayDuration={delayDuration}
// 			{...props}
// 		/>
// 	);
// }

// function Tooltip({
// 	...props
// }: React.ComponentProps<typeof TooltipPrimitive.Root>) {
// 	return (
// 		<TooltipProvider>
// 			<TooltipPrimitive.Root data-slot="tooltip" {...props} />
// 		</TooltipProvider>
// 	);
// }

// function TooltipTrigger({
// 	...props
// }: React.ComponentProps<typeof TooltipPrimitive.Trigger>) {
// 	return <TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...props} />;
// }

// function TooltipContent({
// 	className,
// 	sideOffset = 0,
// 	children,
// 	...props
// }: React.ComponentProps<typeof TooltipPrimitive.Content>) {
// 	return (
// 		<TooltipPrimitive.Portal>
// 			<TooltipPrimitive.Content
// 				data-slot="tooltip-content"
// 				sideOffset={sideOffset}
// 				className={cn(
// 					"bg-primary text-primary-foreground animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-50 w-fit rounded-md px-3 py-1.5 text-xs text-balance",
// 					className,
// 				)}
// 				{...props}
// 			>
// 				{children}
// 				<TooltipPrimitive.Arrow className="bg-primary fill-primary z-50 size-2.5 translate-y-[calc(-50%_-_2px)] rotate-45 rounded-[2px]" />
// 			</TooltipPrimitive.Content>
// 		</TooltipPrimitive.Portal>
// 	);
// }

// export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
