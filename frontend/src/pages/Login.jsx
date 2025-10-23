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
      // Если не хотим хранить в localStorage — можно использовать cookies
      navigate("/dashboard"); // редирект на страницу сбора данных
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
    <div style={{ maxWidth: 420, margin: "0 auto", padding: 20 }}>
      <img src="/logo.png" alt="logo" style={{ display: "block", margin: "20px auto" }} />
      <form onSubmit={handleSubmit}>
        {error && <div style={{ background: "#ffe6e6", color: "#900", padding: 10, marginBottom: 10 }}>{error}</div>}
        <input
          type="text"
          placeholder="Введите email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />
        <input
          type="password"
          placeholder="Введите пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 10, marginBottom: 10 }}
        />

        <label>
          <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /> Запомнить меня
        </label>

        <button type="submit" style={{ width: "100%", padding: 10, marginTop: 10 }}>
          {loading ? "Загрузка..." : "Войти"}
        </button>

        <div style={{ marginTop: 10 }}>
          <a href="/forgot-password">Забыли пароль?</a>
        </div>
      </form>
    </div>
  );
}
