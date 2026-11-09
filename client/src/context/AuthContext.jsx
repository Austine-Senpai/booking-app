import { createContext, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth.js";

const AuthContext = createContext(null);

// Wraps the whole app (see main.jsx) so any component can call useAuth().
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // true until we know whether someone is logged in. Without it, a logged-in
  // user refreshing /my-bookings would be bounced to /login for a split second.
  const [loading, setLoading] = useState(true);

  // On app load, ask the API who we are. The httpOnly cookie is sent
  // automatically; JavaScript can't read it, so this is the only way to know.
  useEffect(() => {
    async function loadUser() {
      try {
        setUser(await authApi.getMe());
      } catch {
        setUser(null); // 401 → simply not logged in
      } finally {
        setLoading(false);
      }
    }
    loadUser();
  }, []);

  async function login(credentials) {
    const loggedInUser = await authApi.login(credentials);
    setUser(loggedInUser);
    return loggedInUser;
  }

  async function register(details) {
    const newUser = await authApi.register(details);
    setUser(newUser);
    return newUser;
  }

  async function logout() {
    try {
      await authApi.logout();
    } finally {
      // Even if the request fails (e.g. offline), forget the user on this device
      setUser(null);
    }
  }

  const value = { user, loading, login, register, logout };
  // React 19: <AuthContext value={...}> is the new short form of <AuthContext.Provider>
  return <AuthContext value={value}>{children}</AuthContext>;
}

// Usage: const { user, login, logout } = useAuth();
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>");
  return context;
}
