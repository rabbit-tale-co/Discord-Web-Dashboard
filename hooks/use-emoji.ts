import { useState, useCallback } from "react";
import { ReactEditor } from "slate-react";
import { Transforms } from "slate";
import { getEditorInstance } from "@/components/ui/mention/mention-textarea";

/**
 * Default emoji categories to be used if none are provided
 */
export const DEFAULT_EMOJI_CATEGORIES = {
	"Smileys & Emotion": [
		"😀",
		"😃",
		"😄",
		"😁",
		"😆",
		"😅",
		"🤣",
		"😂",
		"🙂",
		"🙃",
		"😉",
		"😊",
		"😇",
	],
	"People & Body": [
		"👍",
		"👎",
		"👌",
		"🤝",
		"🤞",
		"✌️",
		"🤟",
		"🤘",
		"👏",
		"🙌",
		"👐",
		"🤲",
		"🤦‍♂️",
		"🤦‍♀️",
	],
	"Animals & Nature": [
		"🐶",
		"🐱",
		"🐭",
		"🐹",
		"🐰",
		"🦊",
		"🐻",
		"🐼",
		"🐨",
		"🐯",
		"🦁",
		"🐮",
		"🐷",
	],
	"Food & Drink": [
		"🍎",
		"🍐",
		"🍊",
		"🍋",
		"🍌",
		"🍉",
		"🍇",
		"🍓",
		"🍈",
		"🍒",
		"🍑",
		"🥭",
		"🍍",
	],
	"Travel & Places": [
		"🚗",
		"🚕",
		"🚙",
		"🚌",
		"🚎",
		"🏎️",
		"🚓",
		"🚑",
		"🚒",
		"🚐",
		"🛻",
		"🚚",
		"🚛",
	],
	Activities: [
		"⚽",
		"🏀",
		"🏈",
		"⚾",
		"🥎",
		"🎾",
		"🏐",
		"🏉",
		"🥏",
		"🎱",
		"🪀",
		"🏓",
		"🏸",
	],
	Objects: [
		"⌚",
		"📱",
		"💻",
		"⌨️",
		"🖥️",
		"🖨️",
		"🖱️",
		"🖲️",
		"🕹️",
		"🗜️",
		"💽",
		"💾",
		"💿",
	],
	Symbols: [
		"❤️",
		"🧡",
		"💛",
		"💚",
		"💙",
		"💜",
		"🖤",
		"🤍",
		"🤎",
		"💔",
		"❣️",
		"💕",
		"💞",
	],
	Flags: [
		"🏁",
		"🚩",
		"🎌",
		"🏴",
		"🏳️",
		"🏳️‍🌈",
		"🏳️‍⚧️",
		"🏴‍☠️",
		"🇦🇨",
		"🇦🇩",
		"🇦🇪",
		"🇦🇫",
		"🇦🇬",
	],
};

/**
 * Popular emojis to display at the top of the picker
 */
export const DEFAULT_POPULAR_EMOJIS = [
	"👍",
	"❤️",
	"🔥",
	"🎉",
	"🙏",
	"😊",
	"✅",
	"👏",
	"🚀",
	"🤔",
];

/**
 * Custom hook for managing emoji picker functionality
 */
export function useEmoji(editorId = "mention-textarea") {
	// Track emoji picker state
	const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

	// Handle emoji selection and insertion into the editor
	const handleEmojiSelect = useCallback(
		(emoji: string) => {
			const editor = getEditorInstance(editorId);
			if (editor) {
				try {
					// Insert the emoji as text
					Transforms.insertText(editor, emoji);

					// Close the emoji picker
					setEmojiPickerOpen(false);

					// Focus back on editor
					setTimeout(() => {
						try {
							ReactEditor.focus(editor);
						} catch (e) {
							console.error("Error focusing editor after emoji insertion:", e);
							const editorElement = document.querySelector('[role="textbox"]');
							if (editorElement instanceof HTMLElement) {
								editorElement.focus();
							}
						}
					}, 10);
				} catch (error) {
					console.error("Error inserting emoji:", error);
				}
			}
		},
		[editorId],
	);

	return {
		emojiPickerOpen,
		setEmojiPickerOpen,
		handleEmojiSelect,
		DEFAULT_EMOJI_CATEGORIES,
		DEFAULT_POPULAR_EMOJIS,
	};
}
