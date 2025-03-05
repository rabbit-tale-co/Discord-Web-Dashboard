import { useEffect, useState } from "react";

export function useMediaQuery(query: string) {
	const [value, setValue] = useState(false);

	useEffect(() => {
		function onChange(event: MediaQueryListEvent) {
			setValue(event.matches);
		}

		const result = window.matchMedia(query);
		setValue(result.matches);

		// Newer browsers
		result.addEventListener("change", onChange);
		// Cleanup
		return () => result.removeEventListener("change", onChange);
	}, [query]);

	return value;
}
