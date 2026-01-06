import { useState, useEffect } from "react";
import { Basket } from "../types";
import { fetchProjectById, saveProject } from "../services/database/projectService";
import { STORAGE_KEYS } from "../utils/constants";

/**
 * Custom hook for managing basket/project state
 */
export function useBasket(session: any) {
    const [currentBasket, setCurrentBasket] = useState<Basket | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (currentBasket) {
            localStorage.setItem(STORAGE_KEYS.ACTIVE_BASKET_ID, currentBasket.id);
        }
    }, [currentBasket]);

    const loadBasket = async (basketId: string) => {
        setIsLoading(true);
        const basket = await fetchProjectById(basketId);
        if (basket) {
            setCurrentBasket(basket);
        }
        setIsLoading(false);
        return basket;
    };

    const saveBasket = async (basket: Basket) => {
        if (!session?.user?.id) return;
        await saveProject(basket, session.user.id);
        setCurrentBasket(basket);
    };

    const createNewBasket = (): Basket => {
        return {
            id: crypto.randomUUID(),
            name: "New Strategy Design",
            description: "Synthetic Alpha Component",
            category: "Growth Strategy",
            items: [],
            allocationMode: "weight",
            rebalanceInterval: "none",
            initialInvestment: 100000,
            createdAt: Date.now()
        };
    };

    const clearBasket = () => {
        setCurrentBasket(null);
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_BASKET_ID);
    };

    return {
        currentBasket,
        setCurrentBasket,
        isLoading,
        loadBasket,
        saveBasket,
        createNewBasket,
        clearBasket
    };
}

