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

type Role = {
	id: string;
	name: string;
	color: number;
};

interface RolesFieldProps {
	name: string;
	label: string;
	description?: string;
	guildId: string;
}

export function RolesField({
	name,
	label,
	description,
	guildId,
}: RolesFieldProps) {
	const form = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name,
	});

	const [roles, setRoles] = useState<Role[]>([]);
	const [status, setStatus] = useState<"loading" | "success" | "error">(
		"loading",
	);

	useEffect(() => {
		const guild = getCachedData<GuildData>(`guild-${guildId}`);
		if (guild?.data?.roles) {
			setRoles(guild.data.roles);
			setStatus("success");
		} else {
			setRoles([]);
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
										name={`${name}.${index}.role_id`}
										render={({ field }) => (
											<FormItem>
												<FormLabel>Role</FormLabel>
												<FormControl>
													<Select
														value={field.value}
														onValueChange={field.onChange}
													>
														<SelectTrigger>
															<SelectValue placeholder="Select a role" />
														</SelectTrigger>
														<SelectContent>
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
					onClick={() => append({ role_id: "" })}
				>
					<Plus className="mr-2 h-4 w-4" />
					Add Role
				</Button>
			</div>

			<FormMessage />
		</FormItem>
	);
}
