import type * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
	"inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium transition-[background,color,box-shadow] [&_svg]:pointer-events-none [&_svg]:shrink-0 ring-ring/10 dark:ring-ring/20 dark:outline-ring/40 outline-ring/50 focus-visible:ring-4 focus-visible:outline-1 aria-invalid:focus-visible:ring-0 rounded-full duration-200", //[&_svg:not([class*='size-'])]:size-4
	{
		variants: {
			variant: {
				default: "bg-primary text-primary-foreground hover:bg-primary/90",
				discord: "bg-discord-bg text-discord-foreground hover:bg-discord-bg/90",
				destructive:
					"bg-destructive text-destructive-foreground hover:bg-destructive/90",
				outline: "border border-input bg-transparent text-primary",
				secondary:
					"bg-secondary text-secondary-foreground hover:bg-secondary/80",
				ghost: "hover:bg-accent hover:text-accent-foreground",
				link: "text-primary underline-offset-4 hover:underline",
			},
			size: {
				default: "h-9 px-4 py-2 has-[>svg]:px-3",
				sm: "h-8 px-3 has-[>svg]:px-2.5",
				lg: "h-10 px-6 has-[>svg]:px-4",
				xl: "h-12 px-8 has-[>svg]:px-6",
				icon: "size-9 p-2",
				iconSm: "size-8 p-2",
				iconLg: "size-10 p-2",
				iconXl: "size-12 p-2",
			},
		},
		defaultVariants: {
			variant: "default",
			size: "default",
		},
	},
);

function Button({
	className,
	variant,
	size,
	asChild = false,
	disabled,
	...props
}: React.ComponentProps<"button"> &
	VariantProps<typeof buttonVariants> & {
		asChild?: boolean;
		disabled?: boolean;
	}) {
	const Comp = asChild ? Slot : "button";

	return (
		<Comp
			data-slot="button"
			disabled={disabled}
			className={cn(
				buttonVariants({ variant, size, className }),
				disabled && "cursor-not-allowed opacity-50",
			)}
			{...props}
		/>
	);
}

export { Button, buttonVariants };
