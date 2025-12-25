import { Basket } from '../types';
import { supabase } from './supabase';

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
            items: basket.items,
            rebalance_interval: basket.rebalanceInterval,
            initial_investment: basket.initialInvestment,
            updated_at: new Date().toISOString()
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

        // Map database snake_case to frontend camelCase
        return (data || []).map((row: any) => ({
            id: row.id,
            name: row.name,
            description: row.description,
            items: row.items,
            rebalanceInterval: row.rebalance_interval as Basket['rebalanceInterval'],
            initialInvestment: Number(row.initial_investment),
            createdAt: new Date(row.created_at).getTime()
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
