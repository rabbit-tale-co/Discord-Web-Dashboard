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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/hooks/use-guilds";

type Channel = {
	id: string;
	name: string;
	type: number;
	position: number;
	parent_id?: string;
};

interface ChannelsFieldProps {
	name: string;
	label: string;
	description?: string;
	guildId: string;
}

export function ChannelsField({
	name,
	label,
	description,
	guildId,
}: ChannelsFieldProps) {
	const form = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name,
	});

	const [channels, setChannels] = useState<Channel[]>([]);
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);

	useEffect(() => {
		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		if (guild?.data?.channels) {
			// Only text channels (type 0)
			setChannels(guild.data.channels.filter((channel) => channel.type === 0));
			setStatus("success");
		} else {
			setChannels([]);
			setStatus("error");
		}
	}, [guildId]);

	if (status === "error") {
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
								<div className="flex-1">
									<FormField
										control={form.control}
										name={`${name}.${index}.channel_id`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Channel</FormLabel>
												<FormControl>
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select a channel" />
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
					onClick={() => append({ channel_id: "" })}
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Channel
				</Button>
			</div>

			<FormMessage />
		</FormItem>
	);
}
