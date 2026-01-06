import { Basket } from "../../types";
import { supabase } from "./supabase";

/**
 * Uploads a basket icon to Supabase storage.
 */
export const uploadBasketIcon = async (basketId: string, file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split(".").pop();
        const fileName = `${basketId}-${Math.random()}.${fileExt}`;
        const filePath = `icons/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from("basket-assets")
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from("basket-assets")
            .getPublicUrl(filePath);

        return data.publicUrl;
    } catch (error: any) {
        console.error("Error uploading basket icon:", error?.message || error);
        return null;
    }
};

/**
 * Saves or updates a portfolio basket in the Supabase 'baskets' table.
 */
export const saveProject = async (basket: Basket, userId: string) => {
    try {
        const payload = {
            id: basket.id,
            user_id: userId,
            name: basket.name,
            description: basket.description || "",
            category: basket.category || "General",
            icon_url: basket.iconUrl || null,
            items: basket.items || [],
            allocation_mode: basket.allocationMode,
            rebalance_interval: basket.rebalanceInterval,
            initial_investment: basket.initialInvestment,
            cagr: basket.cagr || 0,
            cagr1y: basket.cagr1y || 0,
            cagr3y: basket.cagr3y || 0,
            cagr5y: basket.cagr5y || 0,
            volatility: basket.volatility || 0,
            max_drawdown: basket.maxDrawdown || 0,
            sharpe_ratio: basket.sharpeRatio || 0,
            growth_score: basket.growthScore || 0,
            irr: basket.irr || 0,
            inception_value: basket.inceptionValue || null,
            today_return: basket.todayReturn || 0,
            inception_return: basket.inceptionReturn || 0,
            updated_at: basket.updatedAt ? new Date(basket.updatedAt).toISOString() : new Date().toISOString(),
            created_at: basket.createdAt ? new Date(basket.createdAt).toISOString() : new Date().toISOString()
        };

        const { error } = await supabase
            .from("baskets")
            .upsert(payload, { onConflict: "id" });

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error("Database Sync Error:", error?.message || "Unknown error", error?.details || "");
        throw new Error(error?.message || "Failed to save project");
    }
};

/**
 * Fetches all portfolios for the current user from Supabase.
 */
export const fetchProjects = async (userId: string): Promise<Basket[]> => {
    try {
        const { data, error } = await supabase
            .from("baskets")
            .select("*")
            .order("updated_at", { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            iconUrl: row.icon_url,
            items: row.items,
            allocationMode: row.allocation_mode as Basket["allocationMode"] || "weight",
            rebalanceInterval: row.rebalance_interval as Basket["rebalanceInterval"],
            initialInvestment: Number(row.initial_investment),
            createdAt: new Date(row.created_at).getTime(),
            updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : undefined,
            cagr: Number(row.cagr || 0),
            cagr1y: Number(row.cagr1y || 0),
            cagr3y: Number(row.cagr3y || 0),
            cagr5y: Number(row.cagr5y || 0),
            volatility: Number(row.volatility || 0),
            maxDrawdown: Number(row.max_drawdown || 0),
            sharpeRatio: Number(row.sharpe_ratio || 0),
            growthScore: Number(row.growth_score || 0),
            irr: Number(row.irr || 0),
            inceptionValue: row.inception_value ? Number(row.inception_value) : undefined,
            todayReturn: Number(row.today_return || 0),
            inceptionReturn: Number(row.inception_return || 0)
        }));
    } catch (error: any) {
        console.error("Fetch Error:", error?.message || error);
        return [];
    }
};

/**
 * Fetches a specific portfolio by ID.
 */
export const fetchProjectById = async (projectId: string): Promise<Basket | null> => {
    try {
        const { data, error } = await supabase
            .from("baskets")
            .select("*")
            .eq("id", projectId)
            .single();

        if (error) throw error;
        if (!data) return null;

        return {
            id: data.id,
            name: data.name,
            description: data.description,
            category: data.category,
            iconUrl: data.icon_url,
            items: data.items,
            allocationMode: data.allocation_mode as Basket["allocationMode"] || "weight",
            rebalanceInterval: data.rebalance_interval as Basket["rebalanceInterval"],
            initialInvestment: Number(data.initial_investment),
            createdAt: new Date(data.created_at).getTime(),
            updatedAt: data.updated_at ? new Date(data.updated_at).getTime() : undefined,
            cagr: Number(data.cagr || 0),
            cagr1y: Number(data.cagr1y || 0),
            cagr3y: Number(data.cagr3y || 0),
            cagr5y: Number(data.cagr5y || 0),
            volatility: Number(data.volatility || 0),
            maxDrawdown: Number(data.max_drawdown || 0),
            sharpeRatio: Number(data.sharpe_ratio || 0),
            growthScore: Number(data.growth_score || 0),
            irr: Number(data.irr || 0),
            inceptionValue: data.inception_value ? Number(data.inception_value) : undefined,
            todayReturn: Number(data.today_return || 0),
            inceptionReturn: Number(data.inception_return || 0)
        };
    } catch (error: any) {
        console.error("Fetch By ID Error:", error?.message || error);
        return null;
    }
};

/**
 * Deletes a portfolio from the Supabase 'baskets' table.
 */
export const deleteProject = async (projectId: string) => {
    try {
        const { error } = await supabase
            .from("baskets")
            .delete()
            .eq("id", projectId);

        if (error) throw error;
    } catch (error: any) {
        console.error("Delete Error:", error?.message || error);
        throw error;
    }
};

