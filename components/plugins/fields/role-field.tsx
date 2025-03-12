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
import { getCachedData } from "@/lib/cache";
import type { GuildData } from "@/hooks/use-guilds";
import {
	Select,
	SelectValue,
	SelectTrigger,
	SelectItem,
	SelectContent,
} from "@/components/ui/select";

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

		if (
			(form && form.getValues(name) === null) ||
			form.getValues(name) === undefined
		) {
			form.setValue(name, "none");
		}
	}, [guildId, form, name]);

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
								<SelectValue placeholder="Select a role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="none">None - disabled</SelectItem>
								{roles.map((role) => (
									<SelectItem key={role.id} value={role.id}>
										<div className="flex items-center">
											<div
												className="mr-2 h-3 w-3 rounded-full"
												style={{
													backgroundColor: `#${role.color.toString(16).padStart(6, "0")}`,
												}}
											/>
											{role.name}
										</div>
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
