import type { BaseEditor } from "slate";
import type { ReactEditor } from "slate-react";
import type {
	CustomElement,
	CustomText,
	CustomEditor,
} from "../components/ui/mention/types";

declare module "slate" {
	interface CustomTypes {
		Editor: CustomEditor;
		Element: CustomElement;
		Text: CustomText;
	}
}
