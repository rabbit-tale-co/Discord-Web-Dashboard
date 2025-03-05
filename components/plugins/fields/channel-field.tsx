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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
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

type Channel = {
	id: string;
	name: string;
	type: number;
};

type GuildData = {
	channels: Channel[];
};

type ChannelFieldProps = {
	name: string;
	label: string;
	description?: string;
	guildId: string;
};

export function ChannelField({
	name,
	label,
	description,
	guildId,
}: ChannelFieldProps) {
	const form = useFormContext();
	const [channels, setChannels] = useState<Channel[]>([]);
	const [status, setStatus] = useState<"loading" | "error" | "success">(
		"loading",
	);
	const [open, setOpen] = useState(false);
	const [inputValue, setInputValue] = useState("");
	const [guildData, setGuildData] = useState<GuildData | null>(null);

	useEffect(() => {
		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		setGuildData(guild?.data || null);

		if (guild?.data?.channels) {
			const textChannels = guild.data.channels.filter(
				(channel: Channel) => channel.type === 0,
			);
			setChannels(textChannels);
			setStatus("success");
		} else {
			setChannels([]);
			setStatus("error");
		}
	}, [guildId]);

	if (!guildData) {
		return null;
	}

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
										"w-full justify-between rounded-md text-primary",
										!field.value && "text-muted-foreground",
									)}
								>
									{field.value
										? channels.find((channel) => channel.id === field.value)
												?.name || "Unknown channel"
										: "Select channel"}
									<ChevronsUpDown className="ml-auto size-4 shrink-0 opacity-50" />
								</Button>
							</PopoverTrigger>
							<PopoverContent align="start" className="p-0">
								<Command>
									<CommandInput
										placeholder="Search channel..."
										value={inputValue}
										onValueChange={setInputValue}
									/>
									<CommandList>
										<CommandEmpty>No channels found.</CommandEmpty>
										<CommandGroup>
											{channels
												.filter((channel) =>
													channel.name
														.toLowerCase()
														.includes(inputValue.toLowerCase()),
												)
												.map((channel) => (
													<CommandItem
														key={channel.id}
														value={channel.name}
														onSelect={() => {
															form.setValue(name, channel.id);
															form.trigger(name);
															setInputValue("");
															setOpen(false);
														}}
													>
														# {channel.name}
													</CommandItem>
												))}
										</CommandGroup>
									</CommandList>
								</Command>
							</PopoverContent>
						</Popover>
					</FormControl>
					{/* <Select onValueChange={field.onChange} defaultValue={field.value}>
						<FormControl>
							<SelectTrigger>
								<SelectValue placeholder="Select channel" />
							</SelectTrigger>
						</FormControl>
						<SelectContent>
							{channels.map((channel) => (
								<SelectItem key={channel.id} value={channel.id}>
									# {channel.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select> */}
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
