import React, { useState } from "react";
import axios from "axios";
import { useSearchParams } from "react-router-dom";

export default function ResetPasswordConfirm() {
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await axios.post("http://127.0.0.1:8000/api/password_reset/confirm/", {
        token,
        password
      });
      setMessage("Пароль успешно сброшен!");
    } catch (error) {
      setMessage("Ошибка: " + JSON.stringify(error.response?.data || error.message));
    }
  };

  return (
    <div>
      <h2>Сброс пароля</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          placeholder="Новый пароль"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button type="submit">Сбросить пароль</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}
