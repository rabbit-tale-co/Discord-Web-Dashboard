export interface FormFieldProps {
	name: string;
	label?: string;
	description?: string;
	multiline?: boolean;
	showEmojiPicker?: boolean;
	singleLine?: boolean;
	placeholder?: string;
	rows?: number;
	maxLength?: number;
}
