import { core_services } from "@/services/api";
import React, { createContext, useCallback, useContext, useState } from "react";

const RefreshContext = createContext<any>(null);

export const RefreshProvider = ({ children }: any) => {
    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);

        // GLOBAL REFRESH ACTIONS
        // Add anything you want refreshed everywhere:
        // Example:
        // await api.reloadHome();
        // await api.reloadUser();
        // await api.reloadEvents();
        try {
            await core_services.getAllEvents();     // refresh events everywhere
            // If needed:
            // await core_services.getProfile();
            // await core_services.getCategories();
        } catch (err) { }
        setRefreshing(false);
    }, []);

    return (
        <RefreshContext.Provider value={{ refreshing, onRefresh }}>
            {children}
        </RefreshContext.Provider>
    );
};

export const useGlobalRefresh = () => useContext(RefreshContext);
