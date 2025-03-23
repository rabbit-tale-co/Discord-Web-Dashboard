import { create } from "zustand";

interface RangePosition {
	top: number;
	left: number;
	height: number;
}

interface MentionState {
	search: string;
	isActive: boolean;
	position: RangePosition | null;
	setSearch: (search: string) => void;
	setPosition: (position: RangePosition | null) => void;
	setActive: (active: boolean) => void;
	reset: () => void;
}

export const useMentionStore = create<MentionState>((set) => ({
	search: "",
	isActive: false,
	position: null,
	setSearch: (search) => set({ search }),
	setPosition: (position) => set({ position }),
	setActive: (active) => set({ isActive: active }),
	reset: () => set({ search: "", isActive: false, position: null }),
}));
