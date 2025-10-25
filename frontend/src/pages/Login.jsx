import React, { useState, useContext } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const validate = () => {
    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setError("Неверный формат email");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await login(email, password);
      navigate("/dashboard");
    } catch (err) {
      if (err.response && err.response.data) {
        setError(err.response.data.detail || "Ошибка авторизации");
      } else {
        setError("Ошибка соединения с сервером");
      }
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
        {/* Логотип и заголовок */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginBottom: 20,
          }}
        >
          <img
            src="/rtk_logo.png"
            alt="logo"
            style={{ width: "80px", height: "auto" }}
          />
          <span
            style={{
              fontSize: "30px",
               color : "#7700FF",
              fontFamily: "etude, sans-serif",
              marginTop: "25px", // смещение вниз
    display: "block", // чтобы marginTop применялся корректно
            }}
          >
            Умный  <br />
             склад
          </span>
        </div>

        {/* Форма авторизации */}
        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "#ffe6e6",
                color: "#900",
                padding: 10,
                marginBottom: 10,
                borderRadius: 5,
                fontSize: 14,
              }}
            >
              {error}
            </div>
          )}

          <input
            type="text"
            placeholder="Введите email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
            placeholder="Введите пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              width: "100%",
              padding: 10,
              marginBottom: 10,
              borderRadius: 5,
              border: "1px solid #ccc",
              fontSize: 16,
            }}
          />

          <label
            style={{
              display: "block",
              marginBottom: 10,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              style={{ marginRight: 5 }}
            />
            Запомнить меня
          </label>

          <button
            type="submit"
            style={{
              width: "100%",
              padding: 10,
              marginTop: 10,
              borderRadius: 5,
              border: "none",
              background: "#007bff",
              color: "#fff",
              fontSize: 16,
              cursor: "pointer",
            }}
          >
            {loading ? "Загрузка..." : "Войти"}
          </button>

          <div
            style={{
              marginTop: 10,
              textAlign: "center",
              fontSize: 14,
            }}
          >
            <a href="/forgot-password" style={{ color: "#007bff" }}>
              Забыли пароль?
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
