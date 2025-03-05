import { useState, useCallback, useRef } from "react";
import type { MentionType } from "@/components/ui/mention/mention-textarea-base";
import type { MentionAnchor } from "@/components/ui/mention/mention-popover";

interface MentionStartData {
	type: MentionType;
	search: string;
	domRect: DOMRect;
}

/**
 * Custom hook for managing mentions in text editors
 * Provides state and handlers for mention functionality
 */
export function useMention() {
	// State for mention handling
	const [mentionOpen, setMentionOpen] = useState(false);
	const [mentionAnchor, setMentionAnchor] = useState<MentionAnchor | null>(
		null,
	);
	const [mentionType, setMentionType] = useState<MentionType>("variable");
	const [searchValue, setSearchValue] = useState("");

	// Store the current selection range for mention insertion
	const savedRangeRef = useRef<Range | null>(null);

	// Handler for when a mention trigger is detected
	const handleMentionStart = useCallback((data: MentionStartData) => {
		// Save the position for popover
		setMentionAnchor({
			x: data.domRect.left + 6,
			y: data.domRect.bottom + 6,
		});

		setMentionType(data.type);
		setSearchValue(data.search.replace(/^[@#\{]/, ""));
		setMentionOpen(true);

		// Save the current selection
		const selection = window.getSelection();
		if (selection && selection.rangeCount > 0) {
			savedRangeRef.current = selection.getRangeAt(0).cloneRange();
		}
	}, []);

	// Handler for when a mention is cancelled
	const handleMentionEnd = useCallback(() => {
		setMentionOpen(false);
		setMentionAnchor(null);
		savedRangeRef.current = null;
	}, []);

	return {
		mentionOpen,
		setMentionOpen,
		mentionAnchor,
		mentionType,
		searchValue,
		setSearchValue,
		savedRange: savedRangeRef.current,
		handleMentionStart,
		handleMentionEnd,
	};
}
