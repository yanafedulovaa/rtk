import React, { createContext, useState, useEffect } from "react";
import api from "../api";
import { useNavigate } from "react-router-dom";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    const u = localStorage.getItem("user");
    return u ? JSON.parse(u) : null;
  });
  const [access, setAccess] = useState(() => localStorage.getItem("access"));
  const navigate = useNavigate();

  useEffect(() => {
    if (user) localStorage.setItem("user", JSON.stringify(user));
    else localStorage.removeItem("user");
  }, [user]);

  useEffect(() => {
    if (access) localStorage.setItem("access", access);
    else localStorage.removeItem("access");
  }, [access]);

  const login = async (email, password) => {
    const res = await api.post("/auth/login/", { email, password });
    const data = res.data;
    // в твоём сериализаторе вернётся { access, refresh, user }
    setAccess(data.access);
    localStorage.setItem("refresh", data.refresh); // сохраняем refresh
    setUser(data.user);
    return data;
  };

  const logout = () => {
    setUser(null);
    setAccess(null);
    localStorage.removeItem("refresh");
    // редирект на логин
    navigate("/login");
  };

  return (
    <AuthContext.Provider value={{ user, access, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
