"use client";

import React, { useState, useEffect } from "react";
import { useFormContext } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormControl,
	FormDescription,
	FormMessage,
} from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ChevronsUpDown } from "lucide-react";
import {
	Command,
	CommandEmpty,
	CommandGroup,
	CommandInput,
	CommandItem,
	CommandList,
} from "@/components/ui/command";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/hooks/use-guilds";

type Role = {
	id: string;
	name: string;
	color: number;
};

type RoleFieldProps = {
	name: string;
	label: string;
	description?: string;
	guildId: string;
};

export function RoleField({
	name,
	label,
	description,
	guildId,
}: RoleFieldProps) {
	const form = useFormContext();
	const [roles, setRoles] = useState<Role[]>([]);
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [guildData, setGuildData] = useState<GuildData | null>(null);

	useEffect(() => {
		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		setGuildData(guild?.data || null);

		if (guild?.data?.roles) {
			setRoles(guild.data.roles);
			setStatus("success");
		} else {
			setRoles([]);
			setStatus("error");
		}
	}, [guildId]);

	if (!guildData) {
		return null;
	}

	// if (status === "loading") {
	// 	return (
	// 		<div className="space-y-2">
	// 			<Skeleton className="h-4 w-[100px]" />
	// 			<Skeleton className="h-10 w-full" />
	// 		</div>
	// 	);
	// }

	return (
		<FormField
			control={form.control}
			name={name}
			render={({ field }) => (
				<FormItem>
					<FormLabel>{label}</FormLabel>
					{description && <FormDescription>{description}</FormDescription>}
					<FormControl>
						<Popover open={open} onOpenChange={setOpen}>
							<PopoverTrigger asChild>
								<Button
									variant="outline"
									role="combobox"
									className={cn(
										"w-full justify-between",
										!field.value && "text-muted-foreground",
									)}
								>
									{field.value
										? roles.find((role) => role.id === field.value)?.name ||
											"Unknown role"
										: "Select role"}
									<ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="p-0">
								<Command>
									<CommandInput
										placeholder="Search role..."
										value={inputValue}
										onValueChange={setInputValue}
									/>
									<CommandList>
										<CommandEmpty>No roles found.</CommandEmpty>
										<CommandGroup>
											<CommandItem
												key="none"
												value="none"
												onSelect={() => {
													form.setValue(name, "none");
													form.trigger(name);
													setInputValue("");
													setOpen(false);
												}}
											>
												None - disabled
											</CommandItem>
											{roles
												.filter((role) =>
													role.name
														.toLowerCase()
														.includes(inputValue.toLowerCase()),
												)
												.map((role) => (
													<CommandItem
														key={role.id}
														value={role.name}
														onSelect={() => {
															form.setValue(name, role.id);
															form.trigger(name);
															setInputValue("");
															setOpen(false);
														}}
													>
														<div className="flex items-center">
															<div
																className="mr-2 h-3 w-3 rounded-full"
																style={{
																	backgroundColor: `#${role.color.toString(16).padStart(6, "0")}`,
																}}
															/>
															{role.name}
														</div>
													</CommandItem>
												))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
