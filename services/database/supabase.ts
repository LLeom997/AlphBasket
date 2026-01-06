import { createClient } from "@supabase/supabase-js";
import { STORAGE_KEYS } from "../../utils/constants";

const supabaseUrl = "https://gtmyjimhspaycvhzjxby.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd0bXlqaW1oc3BheWN2aHpqeGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQ2MTE4OTYsImV4cCI6MjA4MDE4Nzg5Nn0.iI5lQh8ZaKd7j4Nl6R-gJi8NZLMnKcU7miQeLUQreKw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const signOut = async () => {
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_BASKET_ID);
    localStorage.removeItem(STORAGE_KEYS.VIEW_MODE);
    await supabase.auth.signOut();
};

