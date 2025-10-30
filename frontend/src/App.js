import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import InventoryHistory from "./pages/InventoryHistory";
import { AuthProvider } from "./context/AuthContext";
import PrivateRoute from "./components/PrivateRoute";
import PasswordResetRequest from "./components/PasswordResetRequest";
import ResetPasswordConfirm from "./components/ResetPasswordConfirm";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />

          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <Dashboard />
              </PrivateRoute>
            }
          />

          <Route
            path="/history"
            element={
              <PrivateRoute>
                <InventoryHistory />
              </PrivateRoute>
            }
          />

          <Route path="/password-reset" element={<PasswordResetRequest />} />
          <Route path="/reset-password-confirm" element={<ResetPasswordConfirm />} />
          <Route path="*" element={<Navigate to="/login" />} />
        </Routes>


        <ToastContainer
          position="top-right"
          autoClose={3000}
          hideProgressBar={false}
          newestOnTop={true}
          closeOnClick
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
          style={{ zIndex: 9999 }}
        />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;