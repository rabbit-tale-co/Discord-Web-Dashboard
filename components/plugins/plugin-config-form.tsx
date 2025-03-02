"use client";

import type React from "react";
import { useState, useEffect, useRef, useCallback } from "react";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import type { Plugin } from "@/hooks/use-plugins";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";

// Import naszych komponentów pól formularza
import { ChannelField } from "./fields/channel-field";
import { RoleField } from "./fields/role-field";
import { TextField } from "./fields/text-field";
import { ToggleField } from "./fields/toggle-field";
import { ArrayField } from "./fields/array-field";
import { ColorField } from "./fields/color-field";
import { MessageField } from "./fields/message-field";
import { EmojiField } from "./fields/emoji-field";
import { toast } from "sonner";
import { deepEqual } from "@/lib/deep-equal";

type PluginConfigFormProps = {
	plugin: Plugin;
	guildId: string;
	onSave: (config: Partial<Plugin>) => Promise<void>;
	isSaving: boolean;
	type: "basic" | "advanced";
};

const UNSAVED_KEY = (pluginId: string) => `unsaved-plugin-${pluginId}`;

export function PluginConfigForm({
	plugin,
	guildId,
	onSave,
	isSaving,
	type,
}: PluginConfigFormProps) {
	// Typ dla danych formularza
	type FormValues = Record<string, unknown>;

	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isShaking, setIsShaking] = useState(false);
	const router = useRouter();

	// Refs do toastów i kontroli pierwszego renderu
	const toastIdRef = useRef<string | number | undefined>(undefined);
	const initialRenderRef = useRef(true);
	const hasShownToastRef = useRef(false);
	const prevPluginIdRef = useRef(plugin.id);
	// Ref przechowujący początkowe (zapisane) wartości formularza – jako podstawa do porównania
	const initialSavedValuesRef = useRef<Record<string, unknown>>({});

	// Inicjalizacja stanu formularza
	const [formState, setFormState] = useState<{
		schema: z.ZodObject<z.ZodRawShape> | undefined;
		defaultValues: Record<string, unknown>;
		fields: React.ReactNode[];
	}>(() => {
		const schemaFields: Record<string, z.ZodTypeAny> = {};
		const values: Record<string, unknown> = {};
		const formFields: React.ReactNode[] = [];

		// Pobieramy wartości z pluginu
		for (const key of Object.keys(plugin)) {
			if (key !== "id" && key !== "name" && key !== "description") {
				values[key] = plugin[key as keyof Plugin] ?? "";
			}
		}

		// Łączymy ewentualne niezapisane zmiany z localStorage
		try {
			const unsaved = localStorage.getItem(UNSAVED_KEY(plugin.id));
			if (unsaved) {
				const parsed = JSON.parse(unsaved);
				Object.assign(values, parsed);
			}
		} catch (error) {
			console.error("Error parsing unsaved changes:", error);
		}

		// Pola specyficzne dla plugin.id
		switch (plugin.id) {
			case "levels":
				schemaFields.channel_id = z.string().optional();
				values.channel_id = plugin.channel_id ?? "";
				formFields.push(
					<ChannelField
						key="channel_id"
						name="channel_id"
						label="Levels channel"
						description="Channel to send level up notifications"
						guildId={guildId}
					/>,
				);
				schemaFields.reward_message = z.string().optional().default("");
				values.reward_message = plugin.reward_message ?? "";
				formFields.push(
					<MessageField
						key="reward_message"
						guildId={guildId}
						name="reward_message"
						label="Reward message"
						description="Message sent when a user reaches a new level. You can use {level} as a placeholder."
					/>,
				);
				schemaFields.reward_roles = z
					.array(
						z.object({
							level: z.coerce.number().default(0),
							role_id: z.string(),
						}),
					)
					.default([]);
				values.reward_roles = plugin.reward_roles ?? [];
				formFields.push(
					<ArrayField
						key="reward_roles"
						name="reward_roles"
						label="Roles for levels"
						description="Roles awarded for reaching specific levels"
						guildId={guildId}
						arrayType="levelRoles"
					/>,
				);
				// Inny przykład pola tablicowego
				schemaFields.boost_3x_roles = z.array(
					z.object({
						role_id: z.string(),
					}),
				);
				values.boost_3x_roles = plugin.boost_3x_roles ?? [];
				formFields.push(
					<ArrayField
						key="boost_3x_roles"
						name="boost_3x_roles"
						label="Roles with XP multiplier"
						description="Roles that receive triple XP"
						guildId={guildId}
						arrayType="roles"
					/>,
				);
				break;
			case "welcome":
				schemaFields.welcome_message = z.string().optional().default("");
				values.welcome_message = plugin.welcome_message ?? "";
				formFields.push(
					<MessageField
						key="welcome_message"
						guildId={guildId}
						name="welcome_message"
						label="Welcome message"
						description="Message sent when a user joins the server"
					/>,
				);
				schemaFields.welcome_roles = z.array(z.string()).optional();
				values.welcome_roles = plugin.welcome_roles ?? [];
				formFields.push(
					<ArrayField
						key="welcome_roles"
						name="welcome_roles"
						label="Welcome roles"
						description="Roles assigned to new members"
						guildId={guildId}
						arrayType="roles"
					/>,
				);
				break;
		}

		return {
			schema:
				Object.keys(schemaFields).length > 0
					? z.object(schemaFields)
					: undefined,
			defaultValues: values,
			fields: formFields,
		};
	});

	// Inicjujemy formularz
	const form = useForm<FormValues>({
		resolver: formState.schema ? zodResolver(formState.schema) : undefined,
		defaultValues: formState.defaultValues,
		shouldUnregister: false,
	});

	// Ustawienie początkowych wartości zapamiętanych w refie
	useEffect(() => {
		initialSavedValuesRef.current = formState.defaultValues;
	}, [formState.defaultValues]);

	// Zapis zmian do localStorage
	useEffect(() => {
		const subscription = form.watch((value) => {
			localStorage.setItem(UNSAVED_KEY(plugin.id), JSON.stringify(value));
		});
		return () => subscription.unsubscribe();
	}, [form, plugin.id]);

	// Split the form watch and toast logic into separate effects
	useEffect(() => {
		const subscription = form.watch(() => {
			if (initialRenderRef.current) {
				initialRenderRef.current = false;
				return;
			}

			const currentValues = form.getValues();
			const isEqual = deepEqual(initialSavedValuesRef.current, currentValues);
			setHasUnsavedChanges(!isEqual);
		});

		return () => subscription.unsubscribe();
	}, [form]);

	// Separate effect to handle toast visibility
	useEffect(() => {
		// Always dismiss toast when there are no unsaved changes
		if (!hasUnsavedChanges) {
			if (toastIdRef.current) {
				toast.dismiss(toastIdRef.current);
				toastIdRef.current = undefined;
			}
			hasShownToastRef.current = false;
			return;
		}

		// Show toast only if we have unsaved changes and haven't shown it yet
		if (!hasShownToastRef.current) {
			hasShownToastRef.current = true;
			toastIdRef.current = toast("You have unsaved changes", {
				description:
					"Your changes will be used until you save or reset the form.",
				duration: Number.POSITIVE_INFINITY,
				action: (
					<Button
						onClick={() => form.handleSubmit(onSubmit)()}
						variant="default"
						disabled={isSaving}
						className="bg-green-600 hover:bg-green-700"
					>
						{isSaving ? "Saving..." : "Save changes"}
					</Button>
				),
			});
		}

		return () => {
			if (toastIdRef.current) {
				toast.dismiss(toastIdRef.current);
				toastIdRef.current = undefined;
			}
		};
	}, [hasUnsavedChanges, isSaving, form.handleSubmit]);

	// Reset formularza przy zmianie pluginu
	useEffect(() => {
		if (plugin.id !== prevPluginIdRef.current) {
			initialRenderRef.current = true;
			hasShownToastRef.current = false;
			setHasUnsavedChanges(false);
			prevPluginIdRef.current = plugin.id;
			initialSavedValuesRef.current = formState.defaultValues;
			const unsaved = localStorage.getItem(UNSAVED_KEY(plugin.id));
			if (unsaved) {
				form.reset(JSON.parse(unsaved));
			} else {
				form.reset(formState.defaultValues);
			}
		}
	}, [plugin.id, form, formState.defaultValues]);

	const onSubmit = async (data: FormValues) => {
		let configToSave: Record<string, unknown> = data;

		if (type === "advanced" && data.config && plugin.id === "default") {
			try {
				configToSave = JSON.parse(data.config as string);
			} catch (e) {
				console.error("Niepoprawny JSON", e);
				return;
			}
		}

		await onSave(configToSave as Partial<Plugin>);
		setHasUnsavedChanges(false);
		hasShownToastRef.current = false;
		localStorage.removeItem(UNSAVED_KEY(plugin.id));
		if (toastIdRef.current) {
			toast.dismiss(toastIdRef.current);
			toastIdRef.current = undefined;
		}
	};

	if (!formState.schema || formState.fields.length === 0) {
		return (
			<div className="text-center py-4">
				<p className="text-muted-foreground">
					Brak ustawień do konfiguracji w tej sekcji.
				</p>
			</div>
		);
	}

	return (
		<motion.div
			animate={isShaking ? { x: [0, -10, 10, -10, 10, 0] } : {}}
			transition={{ duration: 0.5 }}
		>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					{formState.fields.map((field) => {
						const fieldName = (field as React.ReactElement<{ name: string }>)
							.props.name;
						const isBasicField = [
							"channel_id",
							"reward_message",
							"welcome_message",
						].includes(fieldName);

						return (
							<div
								key={fieldName}
								className={type === "basic" && !isBasicField ? "hidden" : ""}
							>
								{type === "advanced" && isBasicField ? null : field}
							</div>
						);
					})}
				</form>
			</Form>
		</motion.div>
	);
}
