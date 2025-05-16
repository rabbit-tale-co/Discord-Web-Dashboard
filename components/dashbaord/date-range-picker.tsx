"use client";

import * as React from "react";

import { addDays, format } from "date-fns";
import type { DateRange } from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { CalendarIcon } from "lucide-react";

export function CalendarDateRangePicker({
	className,
	iconOnly = false,
}: React.HTMLAttributes<HTMLDivElement> & {
	iconOnly?: boolean;
}) {
	const [date, setDate] = React.useState<DateRange | undefined>({
		from: new Date(),
		to: addDays(new Date(), 20),
	});

	return (
		<div className={cn("grid gap-2", className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={"secondary"}
						size={iconOnly ? "iconLg" : "lg"}
						className={cn(
							"justify-start text-left font-normal text-primary",
							!date && "text-muted-foreground",
						)}
					>
						{iconOnly ? (
							<CalendarIcon className="mr-2" size={22} />
						) : (
							<React.Fragment>
								{date?.from ? (
									date.to ? (
										<React.Fragment>
											{format(date.from, "LLL dd, y")} -{" "}
											{format(date.to, "LLL dd, y")}
										</React.Fragment>
									) : (
										format(date.from, "LLL dd, y")
									)
								) : (
									<span>Pick a date</span>
								)}
							</React.Fragment>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0" align="end">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={date?.from}
						selected={date}
						onSelect={setDate}
						numberOfMonths={2}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
