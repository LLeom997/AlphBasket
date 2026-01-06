import { useState, useEffect } from "react";
import { supabase, signOut } from "../services/database/supabase";

/**
 * Custom hook for managing authentication state
 */
export function useAuth() {
    const [session, setSession] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const restoreSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            setSession(session);
            setIsLoading(false);
        };

        restoreSession();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
            setSession(newSession);
            setIsLoading(false);
        });

        return () => subscription.unsubscribe();
    }, []);

    const logout = async () => {
        setIsLoading(true);
        await signOut();
        setIsLoading(false);
    };

    return { session, isLoading, logout };
}

