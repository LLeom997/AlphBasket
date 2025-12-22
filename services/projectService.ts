
import { Basket } from '../types';
import { supabase } from './supabase';

/**
 * Maps DB snake_case to TS camelCase
 */
const mapFromDb = (row: any): Basket => ({
    id: row.id,
    name: row.name,
    description: row.description || '',
    items: row.items || [],
    rebalanceInterval: row.rebalance_interval as Basket['rebalanceInterval'],
    initialInvestment: Number(row.initial_investment),
    createdAt: new Date(row.created_at).getTime()
});

/**
 * Maps TS camelCase to DB snake_case
 */
const mapToDb = (basket: Basket, userId: string) => ({
    id: basket.id,
    user_id: userId,
    name: basket.name,
    description: basket.description,
    items: basket.items,
    rebalance_interval: basket.rebalanceInterval,
    initial_investment: basket.initialInvestment,
    created_at: new Date(basket.createdAt).toISOString()
});

export const saveProject = async (basket: Basket, userId: string) => {
    const payload = mapToDb(basket, userId);
    
    const { data, error } = await supabase
        .from('baskets')
        .upsert(payload)
        .select()
        .single();

    if (error) {
        console.error("Error saving project:", error);
        throw error;
    }
    
    return mapFromDb(data);
};

export const fetchProjects = async (userId: string): Promise<Basket[]> => {
    const { data, error } = await supabase
        .from('baskets')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

    if (error) {
        console.error("Error fetching projects:", error);
        return [];
    }

    return (data || []).map(mapFromDb);
};

export const deleteProject = async (projectId: string) => {
    const { error } = await supabase
        .from('baskets')
        .delete()
        .eq('id', projectId);

    if (error) {
        console.error("Error deleting project:", error);
        throw error;
    }
};
