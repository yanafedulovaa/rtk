import { useState } from 'react';
import { Link } from 'react-router-dom';

function PasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    try {
      const response = await fetch('http://185.146.3.192/api/password_reset/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        setMessage('Письмо для сброса пароля отправлено! Проверьте вашу почту.');
      } else {
        setIsSuccess(false);
        setMessage(data.email ? data.email[0] : 'Ошибка при отправке');
      }
    } catch (error) {
      setIsSuccess(false);
      setMessage('Ошибка соединения с сервером');
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

        <h3 style={{ marginBottom: 10, textAlign: "center" }}>
          Сброс пароля
        </h3>
        <p style={{ fontSize: 16, color: "#666", textAlign: "center", marginBottom: 20 }}>
          Введите email для получения инструкций
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
            type="email"
            placeholder="Введите email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
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
            disabled={loading}
            style={{
              width: "100%",
              padding: 10,
              marginTop: 10,
              borderRadius: 5,
              border: "none",
              background: "#007bff",
              color: "#fff",
              fontSize: 16,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? "Отправка..." : "Отправить письмо"}
          </button>

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
        </form>
      </div>
    </div>
  );
}

export default PasswordResetRequest;