
import { Basket } from '../types';
import { supabase } from './supabase';

/**
 * Uploads a basket icon to Supabase storage.
 */
export const uploadBasketIcon = async (basketId: string, file: File): Promise<string | null> => {
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${basketId}-${Math.random()}.${fileExt}`;
        const filePath = `icons/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('basket-assets')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data } = supabase.storage
            .from('basket-assets')
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
            description: basket.description || '',
            category: basket.category || 'General',
            icon_url: basket.iconUrl || null,
            items: basket.items || [],
            allocation_mode: basket.allocationMode,
            rebalance_interval: basket.rebalanceInterval,
            initial_investment: basket.initialInvestment,
            updated_at: new Date().toISOString(),
            created_at: basket.createdAt ? new Date(basket.createdAt).toISOString() : new Date().toISOString()
        };

        const { error } = await supabase
            .from('baskets')
            .upsert(payload, { onConflict: 'id' });

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
            .from('baskets')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            category: row.category,
            iconUrl: row.icon_url,
            items: row.items,
            allocationMode: row.allocation_mode as Basket['allocationMode'] || 'weight',
            rebalanceInterval: row.rebalance_interval as Basket['rebalanceInterval'],
            initialInvestment: Number(row.initial_investment),
            createdAt: new Date(row.created_at || row.updated_at).getTime()
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
            .from('baskets')
            .select('*')
            .eq('id', projectId)
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
            allocationMode: data.allocation_mode as Basket['allocationMode'] || 'weight',
            rebalanceInterval: data.rebalance_interval as Basket['rebalanceInterval'],
            initialInvestment: Number(data.initial_investment),
            createdAt: new Date(data.created_at || data.updated_at).getTime()
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
            .from('baskets')
            .delete()
            .eq('id', projectId);

        if (error) throw error;
    } catch (error: any) {
        console.error("Delete Error:", error?.message || error);
        throw error;
    }
};
