import { supabase } from "./supabase";
import { Snapshot, SimulationResult, Basket } from "../../types";

/**
 * Saves a snapshot of the current simulation to Supabase.
 */
export const saveSnapshot = async (
    basket: Basket,
    simulation: SimulationResult,
    label: string,
    userId: string
): Promise<Snapshot | null> => {
    try {
        const payload = {
            basket_id: basket.id,
            user_id: userId,
            label: label,
            metrics: simulation.metrics,
            forecast: simulation.forecast,
            basket_state: {
                items: basket.items,
                allocationMode: basket.allocationMode,
                initialInvestment: basket.initialInvestment
            },
            snapshot_date: new Date().toISOString()
        };

        const { data, error } = await supabase
            .from("snapshots")
            .insert(payload)
            .select()
            .single();

        if (error) throw error;

        return {
            id: data.id,
            basketId: data.basket_id,
            snapshotDate: data.snapshot_date,
            label: data.label,
            metrics: data.metrics,
            forecast: data.forecast,
            basketState: data.basket_state
        };
    } catch (error: any) {
        console.error("Error saving snapshot:", error?.message || error);
        return null;
    }
};

/**
 * Fetches all snapshots for a specific basket.
 */
export const fetchSnapshots = async (basketId: string): Promise<Snapshot[]> => {
    try {
        const { data, error } = await supabase
            .from("snapshots")
            .select("*")
            .eq("basket_id", basketId)
            .order("snapshot_date", { ascending: false });

        if (error) throw error;

        return (data || []).map((row: any) => ({
            id: row.id,
            basketId: row.basket_id,
            snapshotDate: row.snapshot_date,
            label: row.label,
            metrics: row.metrics,
            forecast: row.forecast,
            basketState: row.basket_state
        }));
    } catch (error: any) {
        console.error("Error fetching snapshots:", error?.message || error);
        return [];
    }
};

/**
 * Deletes a snapshot.
 */
export const deleteSnapshot = async (snapshotId: string): Promise<boolean> => {
    try {
        const { error } = await supabase
            .from("snapshots")
            .delete()
            .eq("id", snapshotId);

        if (error) throw error;
        return true;
    } catch (error: any) {
        console.error("Error deleting snapshot:", error?.message || error);
        return false;
    }
};

