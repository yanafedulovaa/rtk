import React, { useState, useEffect } from "react";
import api from "../api"; // твой axios-инстанс

export default function WarehousePrediction() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        const res = await api.get("/warehouse/predict/"); // эндпоинт mock
        setPredictions(res.data.predictions);
      } catch (err) {
        console.error("Ошибка загрузки прогнозов:", err);
        setError("Не удалось загрузить прогнозы");
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) return <p>Загрузка прогнозов...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Прогноз запасов на складе</h2>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Product ID</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Дней до критического остатка</th>
            <th style={{ border: "1px solid #ccc", padding: 8 }}>Рекомендованный заказ</th>
          </tr>
        </thead>
        <tbody>
          {predictions.map((p) => (
            <tr key={p.product_id}>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.product_id}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.days_until_stockout}</td>
              <td style={{ border: "1px solid #ccc", padding: 8 }}>{p.recommended_order_quantity}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
