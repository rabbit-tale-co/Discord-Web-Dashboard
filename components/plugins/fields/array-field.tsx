"use client";

import React, { useState, useEffect } from "react";
import { useFormContext, useFieldArray } from "react-hook-form";
import {
	FormField,
	FormItem,
	FormLabel,
	FormDescription,
	FormMessage,
	FormControl,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Trash, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getCachedData } from "@/lib/cache";
import type { GuildData as BaseGuildData } from "@/hooks/use-guilds";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover";
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

// Extend the type locally
interface GuildData extends BaseGuildData {
	channels: Channel[];
}

type Role = {
	id: string;
	name: string;
	color: number;
};

type Channel = {
	id: string;
	name: string;
	type: number;
	position: number;
	parent_id?: string;
};

type ArrayFieldProps = {
	name: string;
	label: string;
	description?: string;
	guildId: string;
	arrayType: "levelRoles" | "roles" | "channels";
};

export function ArrayField({
	name,
	label,
	description,
	guildId,
	arrayType,
}: ArrayFieldProps) {
	const form = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name,
	});

	const [roles, setRoles] = useState<Role[]>([]);
	const [channels, setChannels] = useState<Channel[]>([]);
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);
	const [guildData, setGuildData] = useState<GuildData | null>(null);
	const [openStates, setOpenStates] = useState<Record<number, boolean>>({});
	const [inputValues, setInputValues] = useState<Record<number, string>>({});

	useEffect(() => {
		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		setGuildData(guild?.data || null);

		if (guild?.data) {
			if (
				(arrayType === "levelRoles" || arrayType === "roles") &&
				guild.data.roles
			) {
				setRoles(guild.data.roles);
			}

			if (arrayType === "channels" && guild.data.channels) {
				// Only text channels
				setChannels(
					guild.data.channels.filter((channel: Channel) => channel.type === 0),
				);
			}

			setStatus("success");
		} else {
			setRoles([]);
			setChannels([]);
			setStatus("error");
		}
	}, [guildId, arrayType]);

	const addNewField = () => {
		switch (arrayType) {
			case "levelRoles":
				append({ level: 0, role_id: "" });
				break;
			case "roles":
				append({ role_id: "" });
				break;
			case "channels":
				append({ channel_id: "" });
				break;
		}
	};

	// Toggle popover state for specific index
	const toggleOpen = (index: number, isOpen: boolean) => {
		setOpenStates((prev) => ({ ...prev, [index]: isOpen }));
	};

	// Set input value for specific index
	const setInputValue = (index: number, value: string) => {
		setInputValues((prev) => ({ ...prev, [index]: value }));
	};

	if (!guildData && status !== "loading") {
		return null;
	}

	return (
		<FormItem>
			<FormLabel>{label}</FormLabel>
			{description && <FormDescription>{description}</FormDescription>}

			<div className="space-y-2">
				{fields.map((field, index) => (
					<Card key={field.id} className="overflow-hidden">
						<CardContent className="p-3">
							<div className="flex items-end gap-3">
								{arrayType === "levelRoles" && (
									<div className="flex-1">
										<FormField
											control={form.control}
											name={`${name}.${index}.level`}
											render={({ field }) => (
												<FormItem>
													<FormLabel>Level</FormLabel>
													<FormControl>
														<Input
															type="number"
															{...field}
															value={
																field.value === "" ? "" : Number(field.value)
															}
															onChange={(e) => {
																const value =
																	e.target.value === ""
																		? ""
																		: Number(e.target.value);
																if (!isNaN(value)) {
																	field.onChange(value);
																}
															}}
															onKeyPress={(e) => {
																if (!/[\d\b.]/.test(e.key)) {
																	e.preventDefault();
																}
															}}
														/>
													</FormControl>
													<FormMessage />
												</FormItem>
											)}
										/>
									</div>
								)}

								<div className="flex-1">
									<FormField
										control={form.control}
										name={
											arrayType === "channels"
												? `${name}.${index}.channel_id`
												: `${name}.${index}.role_id`
										}
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{arrayType === "channels" ? "Channel" : "Role"}
												</FormLabel>
												<FormControl>
													<Popover
														open={openStates[index]}
														onOpenChange={(open) => toggleOpen(index, open)}
													>
														<PopoverTrigger asChild>
															<Button
																variant="outline"
																role="combobox"
																className={cn(
																	"w-full justify-between",
																	!field.value && "text-muted-foreground",
																)}
																disabled={status === "loading"}
															>
																{field.value
																	? arrayType === "channels"
																		? channels.find(
																				(channel) => channel.id === field.value,
																			)?.name || "Unknown channel"
																		: roles.find(
																				(role) => role.id === field.value,
																			)?.name || "Unknown role"
																	: arrayType === "channels"
																		? "Select channel"
																		: "Select role"}
																<ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
															</Button>
														</PopoverTrigger>
														<PopoverContent align="start" className="p-0">
															<Command>
																<CommandInput
																	placeholder={`Search ${arrayType === "channels" ? "channel" : "role"}...`}
																	value={inputValues[index] || ""}
																	onValueChange={(value) =>
																		setInputValue(index, value)
																	}
																/>
																<CommandList>
																	<CommandEmpty>
																		No{" "}
																		{arrayType === "channels"
																			? "channels"
																			: "roles"}{" "}
																		found.
																	</CommandEmpty>
																	<CommandGroup>
																		{arrayType === "channels"
																			? channels
																					.filter((channel) =>
																						channel.name
																							.toLowerCase()
																							.includes(
																								(
																									inputValues[index] || ""
																								).toLowerCase(),
																							),
																					)
																					.map((channel) => (
																						<CommandItem
																							key={channel.id}
																							value={channel.name}
																							onSelect={() => {
																								form.setValue(
																									`${name}.${index}.channel_id`,
																									channel.id,
																								);
																								form.trigger(
																									`${name}.${index}.channel_id`,
																								);
																								setInputValue(index, "");
																								toggleOpen(index, false);
																							}}
																						>
																							# {channel.name}
																						</CommandItem>
																					))
																			: roles
																					.filter((role) =>
																						role.name
																							.toLowerCase()
																							.includes(
																								(
																									inputValues[index] || ""
																								).toLowerCase(),
																							),
																					)
																					.map((role) => (
																						<CommandItem
																							key={role.id}
																							value={role.name}
																							onSelect={() => {
																								form.setValue(
																									`${name}.${index}.role_id`,
																									role.id,
																								);
																								form.trigger(
																									`${name}.${index}.role_id`,
																								);
																								setInputValue(index, "");
																								toggleOpen(index, false);
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
								</div>

								<Button
									variant="destructive"
									size="icon"
									onClick={() => remove(index)}
									className="mb-1.5"
								>
									<Trash className="size-5" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}

				<Button
					type="button"
					variant="outline"
					size="sm"
					className="mt-2"
					onClick={addNewField}
				>
					<Plus className="mr-2 h-4 w-4" />
					Add{" "}
					{arrayType === "levelRoles"
						? "level"
						: arrayType === "roles"
							? "role"
							: "channel"}
				</Button>
			</div>

			<FormMessage />
		</FormItem>
	);
}
