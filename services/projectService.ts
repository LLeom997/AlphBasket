
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
    } catch (error) {
        console.error("Error uploading basket icon:", error);
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
            description: basket.description,
            category: basket.category,
            icon_url: basket.iconUrl,
            items: basket.items,
            // Fix: Include allocation_mode in the database payload
            allocation_mode: basket.allocationMode,
            rebalance_interval: basket.rebalanceInterval,
            initial_investment: basket.initialInvestment,
            updated_at: new Date().toISOString(),
            created_at: new Date(basket.createdAt).toISOString()
        };

        const { data, error } = await supabase
            .from('baskets')
            .upsert(payload);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error("Error saving project to Supabase:", error);
        throw error;
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

        // Fix: Map allocation_mode back to allocationMode property
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
    } catch (error) {
        console.error("Error fetching projects from Supabase:", error);
        return [];
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
    } catch (error) {
        console.error("Error deleting project from Supabase:", error);
        throw error;
    }
};
