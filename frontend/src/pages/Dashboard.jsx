Яна, [23.10.2025 16:09]
import React, { useState, useEffect, useContext } from "react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import WarehouseMap from "./WarehouseMap";
import InventoryPredict from "./InventoryPredict";

export default function Dashboard() {
  const { access } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard/current/", {
          headers: { Authorization: Bearer ${access} }
        });
        setData(res.data);
        setError(null);
        setLastUpdated(new Date().toLocaleTimeString());
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить данные");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [access]);

  if (loading) return <p>Загрузка...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  // Функция для цвета батареи: зелёный если > 60, жёлтый 30-60, красный < 30
  const batteryColor = (level) => {
    if (level > 60) return "green";
    if (level > 30) return "orange";
    return "red";
  };

  // Функция для цвета статуса скана
  const statusColor = (status) => {
    return status === "CRITICAL" ? "red" : "green";
  };

  return (
    <div style={{ padding: 20 }}>
      <h1>Дашборд склада</h1>
      {lastUpdated && <p style={{ fontStyle: "italic" }}>Последнее обновление: {lastUpdated}</p>}

      {/* ------------------- Статистика ------------------- */}
      <div style={{ display: "flex", gap: 20, marginBottom: 20 }}>
        <div style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, width: 180 }}>
          <h3>Активные роботы</h3>
          <p style={{ fontSize: 24 }}>{data.statistics.active_robots}</p>
        </div>
            {/* Карта склада */}
        <div style={{ marginBottom: 20 }}>
          <WarehouseMap />
        </div>

        <div style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, width: 180 }}>
          <h3>Сканировано сегодня</h3>
          <p style={{ fontSize: 24 }}>{data.statistics.checked_today}</p>
        </div>
        <div style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, width: 180 }}>
          <h3>Критический остаток</h3>
          <p style={{ fontSize: 24, color: data.statistics.critical_stock > 0 ? "red" : "green" }}>
            {data.statistics.critical_stock}
          </p>
        </div>
        <div style={{ padding: 10, border: "1px solid #ccc", borderRadius: 8, width: 180 }}>
          <h3>Средний заряд батареи</h3>
          <p style={{ fontSize: 24 }}>{data.statistics.avg_battery}%</p>
        </div>
      </div>

Яна, [23.10.2025 16:09]
{/* ------------------- Список роботов ------------------- */}
      <div style={{ marginBottom: 20 }}>
        <h2>Роботы</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>ID</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Батарея</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Зона</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Стеллаж</th>
            </tr>
          </thead>
          <tbody>
            {data.robots.map((r) => (
              <tr key={r.id}>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.id}</td>
                <td style={{ border: "1px solid #ccc", padding: 8, color: batteryColor(r.battery) }}>
                  {r.battery}%
                </td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.zone}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{r.row}-{r.shelf}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
            {/* ------------------- ИИ аналитика ------------------- */}
        <div style={{ padding: 20 }}>
          {/* Прогноз остатков */}
          <InventoryPredict />
        </div>
      {/* ------------------- Последние сканы ------------------- */}
      <div>
        <h2>Последние сканы</h2>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Время</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Робот ID</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Продукт</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Кол-во</th>
              <th style={{ border: "1px solid #ccc", padding: 8 }}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {data.recent_scans.map((s, index) => (
              <tr key={index}>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{s.time}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{s.robot_id}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{s.product}</td>
                <td style={{ border: "1px solid #ccc", padding: 8 }}>{s.quantity}</td>
                <td style={{ border: "1px solid #ccc", padding: 8, color: statusColor(s.status) }}>
                  {s.status}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

}