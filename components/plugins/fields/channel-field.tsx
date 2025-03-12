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
						<Select value={field.value || ""} onValueChange={field.onChange}>
							<SelectTrigger>
								<SelectValue placeholder="Select channel" />
							</SelectTrigger>
							<SelectContent>
								{channels.map((channel) => (
									<SelectItem key={channel.id} value={channel.id}>
										# {channel.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</FormControl>
					<FormMessage />
				</FormItem>
			)}
		/>
	);
}
