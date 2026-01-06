import { useState, useEffect } from "react";
import { STORAGE_KEYS } from "../utils/constants";

export type ViewType = "auth" | "dashboard" | "editor";

/**
 * Custom hook for managing view state
 */
export function useView() {
    const [view, setView] = useState<ViewType>("auth");

    useEffect(() => {
        if (view !== "auth") {
            localStorage.setItem(STORAGE_KEYS.VIEW_MODE, view);
        }
    }, [view]);

    return { view, setView };
}

