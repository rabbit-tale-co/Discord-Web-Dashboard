import React from "react";
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
import { Trash, Plus, MinusCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Role = {
	id: string;
	name: string;
	color: number;
};

interface LevelRolesFieldProps {
	name: string;
	label: string;
	description?: string;
	roles: Role[];
	showLevel?: boolean;
}

export function LevelRolesField({
	name,
	label,
	description,
	roles,
	showLevel = true,
}: LevelRolesFieldProps) {
	const form = useFormContext();
	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name,
	});

	return (
		<FormItem>
			<FormLabel>{label}</FormLabel>
			{description && <FormDescription>{description}</FormDescription>}

			<div className="space-y-2">
				{fields.map((field, index) => (
					<Card key={field.id} className="overflow-hidden">
						<CardContent className="p-3">
							<div className="flex items-end gap-3">
								{showLevel && (
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
															min="0"
															step="1"
															{...field}
															value={field.value ?? ""}
															onChange={(e) => {
																const value = e.target.value;
																if (value === "") {
																	field.onChange(null);
																} else {
																	const numValue = Number.parseInt(value, 10);
																	if (
																		!Number.isNaN(numValue) &&
																		numValue >= 0
																	) {
																		field.onChange(numValue);
																	}
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
											showLevel ? `${name}.${index}.roleId` : `${name}.${index}`
										}
										render={({ field }) => {
											// Debug log
											// console.log(`Role field ${name}.${index}:`, field.value);

											return (
												<FormItem>
													<FormLabel>Role</FormLabel>
													<FormControl>
														<Select
															value={field.value || ""}
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
											);
										}}
									/>
								</div>

								<Button
									size="icon"
									variant="ghost"
									onClick={() => remove(index)}
								>
									<MinusCircle className="size-4" />
								</Button>
							</div>
						</CardContent>
					</Card>
				))}

				<Button
					type="button"
					variant="outline"
					className="mt-2"
					onClick={() => {
						if (showLevel) {
							append({ level: 0, roleId: "" });
						} else {
							append("");
						}
						// Debug log
						// console.log(`Added new ${showLevel ? "level role" : "role"}`);
					}}
				>
					Add {showLevel ? "Level Role" : "Role"}
					<Plus className="size-4" />
				</Button>
			</div>

			<FormMessage />
		</FormItem>
	);
}
