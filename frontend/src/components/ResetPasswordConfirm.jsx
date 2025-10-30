import React, { useState } from "react";
import axios from "axios";
import { useSearchParams, Link, useNavigate } from "react-router-dom";

export default function ResetPasswordConfirm() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    // Валидация
    if (password.length < 6) {
      setMessage("Пароль должен содержать минимум 6 символов");
      setIsSuccess(false);
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Пароли не совпадают");
      setIsSuccess(false);
      return;
    }

    if (!token) {
      setMessage("Токен не найден. Проверьте ссылку из письма.");
      setIsSuccess(false);
      return;
    }

    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/api/password_reset/confirm/", {
        token,
        password
      });

      setIsSuccess(true);
      setMessage("Пароль успешно изменен!");

      // Перенаправляем на страницу логина через 2 секунды
      setTimeout(() => {
        navigate("/login");
      }, 2000);
    } catch (error) {
      setIsSuccess(false);
      const errorMsg = error.response?.data?.detail
        || error.response?.data?.password?.[0]
        || error.response?.data?.token?.[0]
        || "Ошибка при сбросе пароля";
      setMessage(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
        background: "#f0f2f5",
      }}
    >
      <div
        style={{
          width: 400,
          padding: 30,
          borderRadius: 10,
          background: "#fff",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
        }}
      >
        {/* Логотип по центру */}
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <img
            src="/rtk_logo.png"
            alt="logo"
            style={{ width: "50px", height: "auto" }}
          />
        </div>

        <h4 style={{ marginBottom: 10, textAlign: "center" }}>
          Создание нового пароля
        </h4>
        <p style={{ fontSize: 16, color: "#666", textAlign: "center", marginBottom: 20 }}>
          Введите новый пароль для вашего аккаунта
        </p>

        {/* Форма */}
        <form onSubmit={handleSubmit}>
          {message && (
            <div
              style={{
                background: isSuccess ? "#d4edda" : "#ffe6e6",
                color: isSuccess ? "#155724" : "#900",
                padding: 10,
                marginBottom: 10,
                borderRadius: 5,
                fontSize: 14,
              }}
            >
              {message}
            </div>
          )}

          <input
            type="password"
            placeholder="Новый пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={isSuccess}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
              borderRadius: 5,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
          />

          <input
            type="password"
            placeholder="Подтвердите пароль"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            disabled={isSuccess}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
              borderRadius: 5,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
          />

          <button
            type="submit"
            disabled={loading || isSuccess}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 10,
              borderRadius: 5,
              border: "none",
              background: isSuccess ? "#28a745" : "#007bff",
              color: "#fff",
              fontSize: 16,
              cursor: loading || isSuccess ? "not-allowed" : "pointer",
              opacity: loading || isSuccess ? 0.7 : 1,
            }}
          >
            {loading ? "Сохранение..." : isSuccess ? "✓ Пароль изменен" : "Сохранить пароль"}
          </button>

          {!isSuccess && (
            <div
              style={{
                marginTop: 15,
                textAlign: "center",
                fontSize: 14,
              }}
            >
              <Link to="/login" style={{ color: "#007bff", textDecoration: "none" }}>
                ← Вернуться к входу
              </Link>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}