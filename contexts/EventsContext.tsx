import { core_services } from "@/services/api";
import React, { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthContext";

type EventsContextType = {
  events: any[];
  loading: boolean;
  refreshEvents: () => Promise<void>;
};

const EventsContext = createContext<EventsContextType | null>(null);

export const EventsProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const data = await core_services.getAllEvents();
      setEvents(Array.isArray(data) ? data : []);
    } catch (e) {
      console.warn("Events API error", e);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();   
  }, []);

  useEffect(() => {
    if (user) fetchEvents();
  }, [user]);

  return (
    <EventsContext.Provider value={{ events, loading, refreshEvents: fetchEvents }}>
      {children}
    </EventsContext.Provider>
  );
};

export const useEvents = () => {
  const ctx = useContext(EventsContext);
  if (!ctx) throw new Error("useEvents must be used inside EventsProvider");
  return ctx;
};
