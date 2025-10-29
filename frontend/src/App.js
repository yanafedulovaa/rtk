import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard"; // Страница сбора данных
import InventoryHistory from "./pages/InventoryHistory"; // 🔹 добавь импорт
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import PasswordResetRequest from "./components/PasswordResetRequest";
import ResetPasswordConfirm from "./components/ResetPasswordConfirm";


function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Страница входа */}
          <Route path="/login" element={<Login />} />

          {/* Главная страница (сбор данных) */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          {/* 🔹 Страница исторических данных */}
          <Route
            path="/history"
            element={
              <PrivateRoute>
                <InventoryHistory />
              </PrivateRoute>
            }
          />

          {/* 🔸 Редирект на /dashboard по умолчанию */}
          <Route path="*" element={<Navigate to="/dashboard" />} />
          <Route path="/password-reset" element={<PasswordResetRequest />} />
          <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
        </Routes>


      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
