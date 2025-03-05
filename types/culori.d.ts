declare module "culori" {
	export type RGBColor = { mode: "rgb"; r: number; g: number; b: number };
	export function rgb(color: string): RGBColor;
	export function oklch(color: RGBColor): {
		mode: "oklch";
		l: number;
		c: number;
		h: number;
	};
}
