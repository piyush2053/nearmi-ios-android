import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import Constants from "expo-constants";

const API_BASE_URL =
  Constants.expoConfig?.extra?.API_URL ||
  "http://nearmi-ccd3caa6gcetcaa5.centralindia-01.azurewebsites.net";


axios.interceptors.request.use((config) => {
  console.log("📡 API REQUEST:", config.method?.toUpperCase(), config.url);
  console.log("➡️ Body:", config.data);
  return config;
});

axios.interceptors.response.use(
  (response) => {
    console.log("✅ API RESPONSE:", response.config.url, response.status);
    console.log("📥 Data:", response.data);
    return response;
  },
  (error) => {
    console.log("❌ API ERROR:", error.config?.url);
    console.log("Error:", error.response?.data || error.message);
    return Promise.reject(error);
  }
);



export const setToken = async (token: string) => {
  await AsyncStorage.setItem("token", token);
};

export const getToken = async () => {
  return await AsyncStorage.getItem("token");
};

export const removeToken = async () => {
  await AsyncStorage.removeItem("token");
};

// ----------------- API SERVICES ----------------- //
export const core_services = {
  // ---------------- LOGIN ---------------- //
  loginUser: async ({
    email,
    password,
  }: {
    email: string;
    password: string;
  }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/login`,
        { email, password },
        { headers: { "Content-Type": "application/json" } }
      );
console.log(email, password, '@@@@@@@--------->incomin')
console.log(response, '@@@@@@@--------->outgoing')
      const token = response.data.token;
      if (token) {
        await setToken(token);
      }

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- REGISTER ---------------- //
  registerUser: async ({
    username,
    email,
    password,
    location,
  }: {
    username: string;
    email: string;
    password: string;
    location: string;
  }) => {
    try {
      const response = await axios.post(
        `${API_BASE_URL}/auth/register`,
        { username, email, password, location },
        { headers: { "Content-Type": "application/json" } }
      );

      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- GET ALL EVENTS ---------------- //
  getAllEvents: async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_BASE_URL}/events`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- CREATE EVENT ---------------- //
  createEvent: async (eventData: any) => {
    try {
      const token = await getToken();
      const response = await axios.post(`${API_BASE_URL}/events`, eventData, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- UPDATE EVENT ---------------- //
  updateEvent: async (eventId: string, eventData: any) => {
    try {
      const token = await getToken();
      const response = await axios.put(
        `${API_BASE_URL}/events/${eventId}`,
        eventData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- GET EVENT BY ID ---------------- //
  getEventById: async (eventId: string) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- GET CATEGORIES ---------------- //
  getCategories: async () => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_BASE_URL}/event-category`, {
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- MESSAGES ---------------- //
  createMessage: async (messageData: any) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_BASE_URL}/message`,
        messageData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  updateMessage: async (messageId: string, messageData: any) => {
    try {
      const token = await getToken();
      const response = await axios.put(
        `${API_BASE_URL}/message/${messageId}`,
        messageData,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  getMessagesByEvent: async (eventId: string) => {
    try {
      const token = await getToken();
      const response = await axios.get(`${API_BASE_URL}/message/${eventId}`, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  deleteMessage: async (messageId: string, userId: string) => {
    try {
      const token = await getToken();
      const response = await axios.delete(
        `${API_BASE_URL}/message/${messageId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          data: { userId },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  // ---------------- EVENT ATTENDEE ---------------- //
  getEventAttendees: async (eventId: string) => {
    try {
      const token = await getToken();
      const response = await axios.get(
        `${API_BASE_URL}/event-attender/${eventId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  addEventAttender: async ({ eventId, userId }: any) => {
    try {
      const token = await getToken();
      const response = await axios.post(
        `${API_BASE_URL}/event-attender`,
        { eventId, userId },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  getAlleventsJoinedbyUser: async (userId: string) => {
    try {
      const token = await getToken();
      const response = await axios.get(
        `${API_BASE_URL}/event-attender/user/${userId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  getParticipants: async (eventId: string) => {
    try {
      const token = await getToken();
      const response = await axios.get(
        `${API_BASE_URL}/event-attender/${eventId}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
        }
      );
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },

  deleteEvent: async (eventId: string) => {
    try {
      const token = await getToken();
      const response = await axios.delete(`${API_BASE_URL}/events/${eventId}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
      });
      return response.data;
    } catch (error: any) {
      throw error.response?.data || error.message;
    }
  },
};
