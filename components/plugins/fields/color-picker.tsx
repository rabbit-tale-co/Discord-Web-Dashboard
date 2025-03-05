import React, { useState, useRef, useEffect, useCallback } from "react";
import { Colors } from "@/lib/constants/colors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Slider } from "@/components/ui/slider";
import { MentionTextarea } from "@/components/ui/mention";
import { getCachedData, setCachedData } from "@/lib/cache";
import {
	CircleIcon,
	EllipsisVerticalIcon,
	SquareIcon,
	MinusIcon,
	StarIcon,
	StarOffIcon,
	Star,
} from "lucide-react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
	Dialog,
	DialogContent,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Drawer,
	DrawerContent,
	DrawerHeader,
	DrawerTitle,
	DrawerTrigger,
} from "@/components/ui/drawer";
import {
	DropdownMenu,
	DropdownMenuItem,
	DropdownMenuContent,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Select,
	SelectItem,
	SelectContent,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";

type ColorMode = "hsl" | "rgb";

interface ColorPickerProps {
	value: number;
	onChange: (value: number) => void;
	className?: string;
}

// Wybrane podstawowe kolory do wyświetlenia - kolory Discord
const BASIC_COLORS = [
	Colors.Red,
	Colors.Orange,
	Colors.Green,
	Colors.Aqua,
	Colors.Blue,
	Colors.Purple,
];

// Add type definition for OKLCH color
type OklchColor = {
	mode: "oklch";
	l: number;
	c: number;
	h: number;
};

type ColorSpaceObject = {
	mode: string;
	[key: string]: number | string;
};

// Cache keys
const COLOR_HISTORY_KEY = "color-picker-history";
const COLOR_FAVORITES_KEY = "color-picker-favorites";

export function ColorPicker({ value, onChange, className }: ColorPickerProps) {
	const [customColor, setCustomColor] = useState<string>(
		value ? `#${value.toString(16).padStart(6, "0")}` : "#5865f2",
	);
	const [hue, setHue] = useState(0);
	const [saturation, setSaturation] = useState(100);
	const [lightness, setLightness] = useState(50);
	const [colorMode, setColorMode] = useState<ColorMode>("hsl");
	const [colorHistory, setColorHistory] = useState<string[]>([]);
	const [favoriteColors, setFavoriteColors] = useState<string[]>([]);
	const [baseColor, setBaseColor] = useState<string>("");
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [open, setOpen] = useState(false);
	const [rgbValues, setRgbValues] = useState({ r: 0, g: 0, b: 0 });
	const isDesktop = useMediaQuery("(min-width: 768px)");

	// Load favorite colors from cache
	useEffect(() => {
		const cachedFavorites = getCachedData<string[]>(COLOR_FAVORITES_KEY);
		if (cachedFavorites?.data) {
			setFavoriteColors(cachedFavorites.data);
		}
	}, []);

	// Load color history from cache
	useEffect(() => {
		const cachedHistory = getCachedData<string[]>(COLOR_HISTORY_KEY);
		if (cachedHistory?.data) {
			setColorHistory(cachedHistory.data);
		}
	}, []);

	// Save favorite colors to cache
	useEffect(() => {
		if (favoriteColors.length > 0) {
			setCachedData(COLOR_FAVORITES_KEY, favoriteColors, "1y");
		}
	}, [favoriteColors]);

	// Save color history to cache
	useEffect(() => {
		if (colorHistory.length > 0) {
			setCachedData(COLOR_HISTORY_KEY, colorHistory, "1y");
		}
	}, [colorHistory]);

	// Toggle favorite color
	const toggleFavoriteColor = useCallback((color: string) => {
		setFavoriteColors((prev) => {
			const exists = prev.includes(color);
			if (exists) {
				return prev.filter((c) => c !== color);
			}
			return [...prev, color];
		});
	}, []);

	// Check if color is favorite
	const isFavoriteColor = useCallback(
		(color: string) => {
			return favoriteColors.includes(color);
		},
		[favoriteColors],
	);

	// Convert hex string to number
	const hexToNumber = useCallback((hex: string) => {
		return Number.parseInt(hex.replace("#", ""), 16);
	}, []);

	// Convert number to hex string
	const numberToHex = useCallback((num: number) => {
		return `#${num.toString(16).padStart(6, "0")}`;
	}, []);

	// Helper function to ensure valid hex color
	const ensureValidHex = useCallback((hex: string) => {
		// Remove any HTML tags and whitespace
		let cleanHex = hex.replace(/<[^>]*>/g, "").trim();

		// Remove # if present
		cleanHex = cleanHex.replace("#", "");

		// Pad with zeros if needed
		while (cleanHex.length < 6) {
			cleanHex = `0${cleanHex}`;
		}

		// Ensure valid hex characters and length
		if (!/^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
			return "#000000";
		}

		return `#${cleanHex}`;
	}, []);

	// Convert HSL to RGB
	const hslToRgb = useCallback((h: number, s: number, l: number) => {
		const hNormalized = h % 360;
		const sNormalized = s / 100;
		const lNormalized = l / 100;

		const c = (1 - Math.abs(2 * lNormalized - 1)) * sNormalized;
		const x = c * (1 - Math.abs(((hNormalized / 60) % 2) - 1));
		const m = lNormalized - c / 2;

		let r = 0;
		let g = 0;
		let b = 0;

		if (0 <= hNormalized && hNormalized < 60) {
			[r, g, b] = [c, x, 0];
		} else if (60 <= hNormalized && hNormalized < 120) {
			[r, g, b] = [x, c, 0];
		} else if (120 <= hNormalized && hNormalized < 180) {
			[r, g, b] = [0, c, x];
		} else if (180 <= hNormalized && hNormalized < 240) {
			[r, g, b] = [0, x, c];
		} else if (240 <= hNormalized && hNormalized < 300) {
			[r, g, b] = [x, 0, c];
		} else if (300 <= hNormalized && hNormalized < 360) {
			[r, g, b] = [c, 0, x];
		}

		return {
			r: Math.round((r + m) * 255),
			g: Math.round((g + m) * 255),
			b: Math.round((b + m) * 255),
		};
	}, []);

	// Convert HSL to Hex
	const hslToHex = useCallback(
		(h: number, s: number, l: number) => {
			const { r, g, b } = hslToRgb(h, s, l);
			return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
		},
		[hslToRgb],
	);

	// Convert hex to HSL
	const hexToHsl = useCallback((hexColor: string) => {
		// Remove the # from the beginning
		const hex = hexColor.replace("#", "");

		// Parse the hex values
		const r = Number.parseInt(hex.substring(0, 2), 16) / 255;
		const g = Number.parseInt(hex.substring(2, 4), 16) / 255;
		const b = Number.parseInt(hex.substring(4, 6), 16) / 255;

		const max = Math.max(r, g, b);
		const min = Math.min(r, g, b);
		const l = (max + min) / 2;
		let h = 0;
		let s = 0;

		if (max !== min) {
			const d = max - min;
			s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

			switch (max) {
				case r:
					h = (g - b) / d + (g < b ? 6 : 0);
					break;
				case g:
					h = (b - r) / d + 2;
					break;
				case b:
					h = (r - g) / d + 4;
					break;
			}

			h = Math.round(h * 60);
			if (h < 0) h += 360;
		}

		s = Math.round(s * 100);
		const lightness = Math.round(l * 100);

		return { h, s, l: lightness };
	}, []);

	// Convert hex to RGB
	const hexToRgb = useCallback((hex: string) => {
		const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
		if (!result) return { r: 0, g: 0, b: 0 };

		return {
			r: Number.parseInt(result[1], 16),
			g: Number.parseInt(result[2], 16),
			b: Number.parseInt(result[3], 16),
		};
	}, []);

	// Update all color values when hex changes
	const updateAllColorValues = useCallback(
		(hex: string) => {
			// Update HSL
			const hslValues = hexToHsl(hex);
			setHue(hslValues.h);
			setSaturation(hslValues.s);
			setLightness(hslValues.l);

			// Update RGB
			const rgbResult = hexToRgb(hex);
			setRgbValues(rgbResult);
		},
		[hexToHsl, hexToRgb],
	);

	// Handle color mode change
	const handleColorModeChange = useCallback(
		(mode: ColorMode) => {
			setColorMode(mode);
			updateAllColorValues(customColor);
		},
		[customColor, updateAllColorValues],
	);

	// Handle custom color change
	const handleCustomColorChange = (value: string) => {
		const hexValue = ensureValidHex(value);
		setCustomColor(hexValue);
	};

	// Initialize base color from localStorage
	useEffect(() => {
		if (value) {
			const hex = numberToHex(value);
			setBaseColor(hex);
			updateAllColorValues(hex);
			// Initialize history with base color
			setColorHistory((prev) => {
				const filteredHistory = prev.filter((color) => color !== hex);
				return [hex, ...filteredHistory].slice(0, 4);
			});
		}
	}, [value, numberToHex, updateAllColorValues]);

	// Update color from canvas with debounced updates
	const updateColorFromCanvas = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
			const y = Math.max(0, Math.min(e.clientY - rect.top, rect.height));

			const newSaturation = Math.round((x / rect.width) * 100);
			const newLightness = Math.round((1 - y / rect.height) * 100);

			setSaturation(newSaturation);
			setLightness(newLightness);

			const newHex = hslToHex(hue, newSaturation, newLightness);
			setCustomColor(newHex);
		},
		[hue, hslToHex],
	);

	// Handle canvas interactions
	const handleCanvasMouseDown = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault(); // Prevent text selection
			setIsDragging(true);
			updateColorFromCanvas(e);
		},
		[updateColorFromCanvas],
	);

	const handleCanvasMouseMove = useCallback(
		(e: React.MouseEvent<HTMLCanvasElement>) => {
			e.preventDefault(); // Prevent text selection
			if (isDragging) {
				updateColorFromCanvas(e);
			}
		},
		[isDragging, updateColorFromCanvas],
	);

	const handleCanvasMouseUp = useCallback(() => {
		setIsDragging(false);
	}, []);

	// Handle hue slider change
	const handleHueChange = (values: number[]) => {
		const newHue = values[0];
		setHue(newHue);

		const newHex = hslToHex(newHue, saturation, lightness);
		setCustomColor(newHex);
	};

	// Apply HSL color with history management
	const applyHslColor = () => {
		const hex = hslToHex(hue, saturation, lightness);
		setCustomColor(hex);
		onChange(hexToNumber(hex));

		// Add color to history, preserving base color
		setColorHistory((prev) => {
			if (hex === baseColor) return prev; // Don't add if it's the base color
			const filteredHistory = prev.filter(
				(color) => color !== hex && color !== baseColor,
			);
			return [baseColor, ...filteredHistory, hex].slice(0, 5); // Keep base + 4 recent colors
		});
	};

	// Draw color picker canvas
	useEffect(() => {
		if (!open) return;

		let animationFrameId: number;
		let lastDrawTime = 0;
		const frameRate = 1000 / 60; // 60 FPS

		const drawCanvas = (timestamp: number) => {
			// Limit frame rate
			if (timestamp - lastDrawTime < frameRate) {
				animationFrameId = requestAnimationFrame(drawCanvas);
				return;
			}

			lastDrawTime = timestamp;
			const canvas = canvasRef.current;
			if (canvas) {
				const displayWidth = canvas.clientWidth;
				const displayHeight = canvas.clientHeight;

				// Only resize if dimensions have changed
				if (canvas.width !== displayWidth || canvas.height !== displayHeight) {
					canvas.width = displayWidth;
					canvas.height = displayHeight;
				}

				const ctx = canvas.getContext("2d", { alpha: false });
				if (ctx) {
					// Optimize rendering with composite operations
					ctx.globalCompositeOperation = "source-over";

					// Create gradient based on color mode
					const gradientH = ctx.createLinearGradient(0, 0, canvas.width, 0);
					gradientH.addColorStop(0, "#FFFFFF");

					switch (colorMode) {
						case "hsl": {
							gradientH.addColorStop(1, `hsl(${hue}, 100%, 50%)`);
							break;
						}
						case "rgb": {
							const { r, g, b } = hslToRgb(hue, 100, 50);
							gradientH.addColorStop(1, `rgb(${r}, ${g}, ${b})`);
							break;
						}
					}

					ctx.fillStyle = gradientH;
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Create vertical gradient based on color mode
					const gradientV = ctx.createLinearGradient(0, 0, 0, canvas.height);

					switch (colorMode) {
						case "hsl": {
							gradientV.addColorStop(0, "rgba(0, 0, 0, 0)");
							gradientV.addColorStop(1, "#000000");
							break;
						}
						case "rgb": {
							gradientV.addColorStop(0, "rgba(255, 255, 255, 0)");
							gradientV.addColorStop(1, "rgba(0, 0, 0, 1)");
							break;
						}
					}

					ctx.fillStyle = gradientV;
					ctx.fillRect(0, 0, canvas.width, canvas.height);

					// Draw picker position with improved performance
					const pickerX = Math.round((saturation / 100) * canvas.width);
					const pickerY = Math.round((1 - lightness / 100) * canvas.height);

					// Draw new picker circle with contrasting color
					ctx.beginPath();
					ctx.arc(pickerX, pickerY, 6, 0, 2 * Math.PI);
					ctx.strokeStyle =
						lightness > 50 ? "rgba(0, 0, 0, 0.8)" : "rgba(255, 255, 255, 0.8)";
					ctx.lineWidth = 2;
					ctx.stroke();

					// Draw outer circle for better visibility
					ctx.beginPath();
					ctx.arc(pickerX, pickerY, 8, 0, 2 * Math.PI);
					ctx.strokeStyle =
						lightness > 50 ? "rgba(255, 255, 255, 0.8)" : "rgba(0, 0, 0, 0.8)";
					ctx.lineWidth = 1;
					ctx.stroke();
				}
			}

			animationFrameId = requestAnimationFrame(drawCanvas);
		};

		// Initial draw
		animationFrameId = requestAnimationFrame(drawCanvas);

		// Cleanup
		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
	}, [hue, saturation, lightness, open, colorMode, hslToRgb]);

	// Modify the applyCustomColor function to update history
	const applyCustomColor = () => {
		try {
			const colorValue = hexToNumber(customColor);
			onChange(colorValue);

			// Update HSL values
			const { h, s, l } = hexToHsl(customColor);
			setHue(h);
			setSaturation(s);
			setLightness(l);

			// Add color to history
			setColorHistory((prev) => {
				const filteredHistory = prev.filter((color) => color !== customColor);
				return [customColor, ...filteredHistory].slice(0, 8);
			});
		} catch (error) {
			console.error("Invalid color format", error);
		}
	};

	const content = (
		<div className={cn("space-y-2", className)}>
			<div className="flex flex-wrap gap-2">
				{isDesktop ? (
					<Dialog
						open={open}
						onOpenChange={(isOpen: boolean) => {
							setOpen(isOpen);
							if (isOpen) {
								updateAllColorValues(customColor);
							}
						}}
					>
						<DialogTrigger asChild>
							<Button
								variant="outline"
								className="size-6 p-0 rounded-sm border"
								style={{
									backgroundColor: customColor,
									borderColor: "transparent",
								}}
							/>
						</DialogTrigger>
						<DialogContent className="sm:max-w-[350px] rounded-2xl p-4">
							<DialogTitle>Color Picker</DialogTitle>
							<div className="space-y-4">
								<div className="relative">
									<canvas
										ref={canvasRef}
										width={200}
										height={200}
										className="w-full h-48 rounded-[10px] cursor-crosshair"
										onMouseDown={handleCanvasMouseDown}
										onMouseMove={handleCanvasMouseMove}
										onMouseUp={handleCanvasMouseUp}
										onMouseLeave={handleCanvasMouseUp}
									/>

									<div className="mt-4 space-y-4">
										<div className="flex items-center gap-3">
											<div
												className="w-full h-1.5 rounded-full relative"
												style={{
													background: `linear-gradient(to right,
													hsl(0, 100%, 50%),
													hsl(60, 100%, 50%),
													hsl(120, 100%, 50%),
													hsl(180, 100%, 50%),
													hsl(240, 100%, 50%),
													hsl(300, 100%, 50%),
													hsl(360, 100%, 50%))`,
												}}
											>
												<Slider
													value={[hue]}
													min={0}
													max={360}
													step={1}
													onValueChange={handleHueChange}
													className="absolute inset-0 opacity-0 cursor-pointer"
													aria-label="Hue slider"
												/>
												<div
													className="absolute size-5 rounded-full border-2 border-primary/50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-sm"
													style={{
														backgroundColor: `hsl(${hue}, 100%, 50%)`,
														left: `${(hue / 360) * 100}%`,
														top: "50%",
													}}
												/>
											</div>
										</div>

										{/* Color values display */}
										<div className="grid grid-cols-4 gap-3 text-center [&>button]:bg-gray-100 [&>button]:rounded-md [&>button]:px-2.5 [&>button]:cursor-default [&>button]:text-default">
											<Select onValueChange={handleColorModeChange}>
												<SelectTrigger className="uppercase">
													<SelectValue placeholder={colorMode} />
												</SelectTrigger>
												<SelectContent>
													<SelectItem value="hsl">HSL</SelectItem>
													<SelectItem value="rgb">RGB</SelectItem>
												</SelectContent>
											</Select>
											{colorMode === "hsl" && (
												<React.Fragment>
													<Button variant="secondary">H: {Math.round(hue)}</Button>
													<Button variant="secondary">S: {Math.round(saturation)}</Button>
													<Button variant="secondary">L: {Math.round(lightness)}</Button>
												</React.Fragment>
											)}
											{colorMode === "rgb" && (
												<React.Fragment>
													<Button variant="secondary">R: {rgbValues.r}</Button>
													<Button variant="secondary">G: {rgbValues.g}</Button>
													<Button variant="secondary">B: {rgbValues.b}</Button>
												</React.Fragment>
											)}
										</div>

										<div className="flex items-center gap-3">
											<MentionTextarea
												value={customColor}
												onChange={handleCustomColorChange}
												className="min-w-0 flex-1 uppercase"
												singleLine
												showSuggestions={false}
												showEmojiPicker={false}
											/>
											<div className="flex items-center gap-3 flex-shrink-0">
												<Button
													variant="outline"
													size="iconLg"
													onClick={() => toggleFavoriteColor(customColor)}
													className="text-primary/50 hover:text-primary"
												>
													{isFavoriteColor(customColor) ? (
														<StarOffIcon className="size-5 fill-current" />
													) : (
														<StarIcon className="size-5 fill-current" />
													)}
												</Button>
												<Button
													size="lg"
													onClick={applyCustomColor}
													className="bg-black text-white hover:bg-gray-800 px-4"
												>
													Apply
												</Button>
											</div>
										</div>

										{/* Recent Colors */}
										<div className="space-y-2">
											<h4 className="text-sm font-medium">Recent</h4>
											<div className="grid grid-cols-8 gap-2">
												{colorHistory.map((color) => (
													<div key={color} className="group relative">
														<div
															className="w-full pb-[100%] rounded-md cursor-pointer"
															style={{ backgroundColor: color }}
															onClick={() => {
																setCustomColor(color);
																const colorValue = hexToNumber(color);
																onChange(colorValue);
																const { h, s, l } = hexToHsl(color);
																setHue(h);
																setSaturation(s);
																setLightness(l);
															}}
															onKeyDown={(e) => {
																if (e.key === "Enter" || e.key === " ") {
																	setCustomColor(color);
																	const colorValue = hexToNumber(color);
																	onChange(colorValue);
																	const { h, s, l } = hexToHsl(color);
																	setHue(h);
																	setSaturation(s);
																	setLightness(l);
																}
															}}
															role="button"
															tabIndex={0}
														/>
													</div>
												))}
											</div>
										</div>

										{favoriteColors.length > 0 && (
											<div className="space-y-2">
												<h4 className="text-sm font-medium">Saved colors</h4>
												<div className="grid grid-cols-8 gap-2">
													{favoriteColors.map((color) => (
														<div key={color} className="group relative">
															<div
																className={cn(
																	"w-full pb-[100%] rounded-md cursor-pointer relative ring-offset-background transition-all",
																	color === customColor &&
																		"ring-2 ring-primary ring-offset-3",
																)}
																style={{ backgroundColor: color }}
																onClick={() => {
																	setCustomColor(color);
																	const colorValue = hexToNumber(color);
																	onChange(colorValue);
																	const { h, s, l } = hexToHsl(color);
																	setHue(h);
																	setSaturation(s);
																	setLightness(l);
																}}
																onKeyDown={(e) => {
																	if (e.key === "Enter" || e.key === " ") {
																		setCustomColor(color);
																		const colorValue = hexToNumber(color);
																		onChange(colorValue);
																		const { h, s, l } = hexToHsl(color);
																		setHue(h);
																		setSaturation(s);
																		setLightness(l);
																	}
																}}
																role="button"
																tabIndex={0}
															>
																<Button
																	variant="ghost"
																	size="icon"
																	onClick={(e) => {
																		e.stopPropagation();
																		toggleFavoriteColor(color);
																	}}
																	className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center hover:bg-transparent pointer-events-none"
																>
																	<StarIcon className="size-4 fill-current text-white/50" />
																</Button>
															</div>
														</div>
													))}
												</div>
											</div>
										)}
									</div>
								</div>
							</div>
						</DialogContent>
					</Dialog>
				) : (
					<Drawer
						open={open}
						onOpenChange={(isOpen: boolean) => {
							setOpen(isOpen);
							if (isOpen) {
								updateAllColorValues(customColor);
							}
						}}
					>
						<DrawerTrigger asChild>
							<Button
								variant="outline"
								className="size-6 p-0 rounded-sm border"
								style={{
									backgroundColor: customColor,
									borderColor: "transparent",
								}}
							/>
						</DrawerTrigger>
						<DrawerContent>
							<DrawerHeader>
								<DrawerTitle>Color Picker</DrawerTitle>
							</DrawerHeader>
							<div className="px-4 pb-4">
								<div className="space-y-4">
									<div className="relative">
										<canvas
											ref={canvasRef}
											width={200}
											height={200}
											className="w-full h-48 rounded-[10px] cursor-crosshair"
											onMouseDown={handleCanvasMouseDown}
											onMouseMove={handleCanvasMouseMove}
											onMouseUp={handleCanvasMouseUp}
											onMouseLeave={handleCanvasMouseUp}
										/>

										<div className="mt-4 space-y-4">
											<div className="flex items-center gap-3">
												<div
													className="w-full h-1.5 rounded-full relative"
													style={{
														background: `linear-gradient(to right,
														hsl(0, 100%, 50%),
														hsl(60, 100%, 50%),
														hsl(120, 100%, 50%),
														hsl(180, 100%, 50%),
														hsl(240, 100%, 50%),
														hsl(300, 100%, 50%),
														hsl(360, 100%, 50%))`,
													}}
												>
													<Slider
														value={[hue]}
														min={0}
														max={360}
														step={1}
														onValueChange={handleHueChange}
														className="absolute inset-0 opacity-0 cursor-pointer"
														aria-label="Hue slider"
													/>
													<div
														className="absolute size-5 rounded-full border-2 border-primary/50 transform -translate-x-1/2 -translate-y-1/2 pointer-events-none shadow-sm"
														style={{
															backgroundColor: `hsl(${hue}, 100%, 50%)`,
															left: `${(hue / 360) * 100}%`,
															top: "50%",
														}}
													/>
												</div>
											</div>

											{/* Color values display */}
											<div className="grid grid-cols-4 gap-3 text-center [&>button]:bg-gray-100 [&>button]:rounded-md [&>button]:px-2.5 [&>button]:cursor-default [&>button]:text-default">
												<Select onValueChange={handleColorModeChange}>
													<SelectTrigger className="uppercase">
														<SelectValue placeholder={colorMode} />
													</SelectTrigger>
													<SelectContent>
														<SelectItem value="hsl">HSL</SelectItem>
														<SelectItem value="rgb">RGB</SelectItem>
													</SelectContent>
												</Select>
												{colorMode === "hsl" && (
													<React.Fragment>
														<Button variant="secondary">H: {Math.round(hue)}</Button>
														<Button variant="secondary">S: {Math.round(saturation)}</Button>
														<Button variant="secondary">L: {Math.round(lightness)}</Button>
													</React.Fragment>
												)}
												{colorMode === "rgb" && (
													<React.Fragment>
														<Button variant="secondary">R: {rgbValues.r}</Button>
														<Button variant="secondary">G: {rgbValues.g}</Button>
														<Button variant="secondary">B: {rgbValues.b}</Button>
													</React.Fragment>
												)}
											</div>

											<div className="flex items-center gap-3">
												<MentionTextarea
													value={customColor}
													onChange={handleCustomColorChange}
													className="min-w-0 flex-1 uppercase"
													singleLine
													showSuggestions={false}
													showEmojiPicker={false}
												/>
												<div className="flex items-center gap-3 flex-shrink-0">
													<Button
														variant="outline"
														size="iconLg"
														onClick={() => toggleFavoriteColor(customColor)}
														className="text-primary/50 hover:text-primary"
													>
														{isFavoriteColor(customColor) ? (
															<StarOffIcon className="size-5 fill-current" />
														) : (
															<StarIcon className="size-5 fill-current" />
														)}
													</Button>
													<Button
														size="lg"
														onClick={applyCustomColor}
														className="bg-black text-white hover:bg-gray-800 px-4"
													>
														Apply
													</Button>
												</div>
											</div>

											{/* Recent Colors */}
											<div className="space-y-2">
												<h4 className="text-sm font-medium">Recent</h4>
												<div className="grid grid-cols-8 gap-2">
													{colorHistory.map((color) => (
														<div key={color} className="group relative">
															<div
																className="w-full pb-[100%] rounded-md cursor-pointer"
																style={{ backgroundColor: color }}
																onClick={() => {
																	setCustomColor(color);
																	const colorValue = hexToNumber(color);
																	onChange(colorValue);
																	const { h, s, l } = hexToHsl(color);
																	setHue(h);
																	setSaturation(s);
																	setLightness(l);
																}}
																onKeyDown={(e) => {
																	if (e.key === "Enter" || e.key === " ") {
																		setCustomColor(color);
																		const colorValue = hexToNumber(color);
																		onChange(colorValue);
																		const { h, s, l } = hexToHsl(color);
																		setHue(h);
																		setSaturation(s);
																		setLightness(l);
																	}
																}}
																role="button"
																tabIndex={0}
															/>
														</div>
													))}
												</div>
											</div>

											{favoriteColors.length > 0 && (
												<div className="space-y-2">
													<h4 className="text-sm font-medium">Saved colors</h4>
													<div className="grid grid-cols-8 gap-2">
														{favoriteColors.map((color) => (
															<div key={color} className="group relative">
																<div
																	className={cn(
																		"w-full pb-[100%] rounded-md cursor-pointer relative ring-offset-background transition-all",
																		color === customColor &&
																			"ring-2 ring-primary ring-offset-3",
																	)}
																	style={{ backgroundColor: color }}
																	onClick={() => {
																		setCustomColor(color);
																		const colorValue = hexToNumber(color);
																		onChange(colorValue);
																		const { h, s, l } = hexToHsl(color);
																		setHue(h);
																		setSaturation(s);
																		setLightness(l);
																	}}
																	onKeyDown={(e) => {
																		if (e.key === "Enter" || e.key === " ") {
																			setCustomColor(color);
																			const colorValue = hexToNumber(color);
																			onChange(colorValue);
																			const { h, s, l } = hexToHsl(color);
																			setHue(h);
																			setSaturation(s);
																			setLightness(l);
																		}
																	}}
																	role="button"
																	tabIndex={0}
																>
																	<Button
																		variant="ghost"
																		size="icon"
																		onClick={(e) => {
																			e.stopPropagation();
																			toggleFavoriteColor(color);
																		}}
																		className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center hover:bg-transparent pointer-events-none"
																	>
																		<StarIcon className="size-4 fill-current text-white/50" />
																	</Button>
																</div>
															</div>
														))}
													</div>
												</div>
											)}
										</div>
									</div>
								</div>
							</div>
						</DrawerContent>
					</Drawer>
				)}

				{/* Basic color circles */}
				{BASIC_COLORS.map((colorValue) => (
					<button
						key={colorValue}
						type="button"
						onClick={() => onChange(colorValue)}
						className={cn(
							"size-6 rounded-full transition-all",
							value === colorValue && "ring-2 ring-offset-1 ring-primary",
						)}
						style={{ backgroundColor: numberToHex(colorValue) }}
						title={Object.keys(Colors).find(
							(key) => Colors[key as keyof typeof Colors] === colorValue,
						)}
					/>
				))}
			</div>
		</div>
	);

	return content;
}
