import { useState } from 'react';

function PasswordResetRequest() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch('http://127.0.0.1:8000/api/password_reset/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Письмо для сброса пароля отправлено! (проверьте консоль Django)');
      } else {
        // Если сервер вернул ошибку по полю email
        setMessage(data.email ? data.email[0] : 'Ошибка при отправке');
      }
    } catch (error) {
      setMessage('Ошибка сети');
    }
  };

  return (
    <div>
      <h2>Сброс пароля</h2>
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          placeholder="Введите ваш email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit">Отправить письмо</button>
      </form>
      {message && <p>{message}</p>}
    </div>
  );
}

export default PasswordResetRequest;
