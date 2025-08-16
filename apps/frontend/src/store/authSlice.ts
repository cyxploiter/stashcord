import { StateCreator } from "zustand";

interface User {
  id: string;
  username: string;
  avatar: string | null;
}

export interface AuthSlice {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  checkAuth: () => Promise<void>;
  logout: () => Promise<void>;
}

export const createAuthSlice: StateCreator<AuthSlice, [], [], AuthSlice> = (
  set
) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,
  checkAuth: async () => {
    // Skip auth check on server-side
    if (typeof window === "undefined") {
      set({ isLoading: false });
      return;
    }

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

      const response = await fetch(`${apiUrl}/auth/verify`, {
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (response.ok) {
        const userData = await response.json();

        // Backend returns { success: true, user: {...} }
        if (userData.success && userData.user) {
          set({ user: userData.user, isAuthenticated: true });
        } else {
          set({ user: null, isAuthenticated: false });
        }
      } else {
        set({ user: null, isAuthenticated: false });
      }
    } catch (error) {
      console.error("Auth check failed with error:", error);
      set({ user: null, isAuthenticated: false });
    } finally {
      set({ isLoading: false });
    }
  },
  logout: async () => {
    // Skip logout API call on server-side
    if (typeof window === "undefined") {
      set({ user: null, isAuthenticated: false });
      return;
    }

    try {
      const apiUrl =
        process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001/api";

      // Call backend logout endpoint to clear session
      await fetch(`${apiUrl}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
      });
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      set({ user: null, isAuthenticated: false });
    }
  },
});
