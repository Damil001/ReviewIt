import { createContext, useContext, useState, useEffect } from "react";
import axios from "axios";
import { API_BASE_URL } from "../config.js";

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem("token"));

  // Listen for token updates (for OAuth callback)
  useEffect(() => {
    const handleTokenUpdate = () => {
      const newToken = localStorage.getItem("token");
      if (newToken && newToken !== token) {
        setToken(newToken);
        setLoading(true); // Reset loading to fetch user
      }
    };

    // Listen for custom event from AuthCallback
    const tokenUpdatedHandler = () => {
      // Check localStorage immediately when event fires
      const newToken = localStorage.getItem("token");
      if (newToken && newToken !== token) {
        setToken(newToken);
        setLoading(true);
      }
    };

    window.addEventListener("tokenUpdated", tokenUpdatedHandler);

    // Also listen for storage events (from other tabs)
    window.addEventListener("storage", handleTokenUpdate);

    return () => {
      window.removeEventListener("tokenUpdated", tokenUpdatedHandler);
      window.removeEventListener("storage", handleTokenUpdate);
    };
  }, [token]);

  // Set up axios interceptor
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const fetchUser = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/me`);
      setUser(response.data.user);
    } catch (error) {
      localStorage.removeItem("token");
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });
      const { token: newToken, user } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(user);
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Login failed",
      };
    }
  };

  const register = async (name, email, password) => {
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        email,
        password,
      });
      const { token: newToken, user } = response.data;
      localStorage.setItem("token", newToken);
      setToken(newToken);
      setUser(user);
      axios.defaults.headers.common["Authorization"] = `Bearer ${newToken}`;
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data?.error || "Registration failed",
      };
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    setToken(null);
    setUser(null);
    delete axios.defaults.headers.common["Authorization"];
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
