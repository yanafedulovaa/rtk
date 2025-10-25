import React, { useState, useEffect, useContext } from "react";
import api from "../api"; // axios-инстанс
import { AuthContext } from "../context/AuthContext";

export default function WarehouseMap() {
  const { access } = useContext(AuthContext);
  const [robots, setRobots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Настройки карты
  const cellWidth = 30;  // ширина одной зоны
  const cellHeight = 10; // высота одного ряда
  const zones = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split(""); // A-Z
  const rows = 50;

  // Функция для цвета робота по статусу
  const statusColor = (status) => {
    switch(status) {
      case "active": return "green";
      case "low_battery": return "yellow";
      case "offline": return "red";
      default: return "gray";
    }
  };

  useEffect(() => {
    const fetchRobots = async () => {
      try {
        const res = await api.get("/dashboard/current/", {
          headers: { Authorization: `Bearer ${access}` }
        });
        setRobots(res.data.robots); // массив роботов с полем status, zone, row
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить данные роботов");
      } finally {
        setLoading(false);
      }
    };

    fetchRobots();
    const interval = setInterval(fetchRobots, 5000); // обновляем каждые 5 сек
    return () => clearInterval(interval);
  }, [access]);

  if (loading) return <p>Загрузка карты...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ overflow: "auto" }}>
      <h2>Карта склада</h2>
      <svg width={zones.length * cellWidth + 50} height={rows * cellHeight + 50}>
        {/* ------------------- Сетка зон ------------------- */}
        {zones.map((zone, i) =>
          Array.from({ length: rows }).map((_, j) => (
            <rect
              key={`${zone}-${j}`}
              x={i * cellWidth}
              y={j * cellHeight}
              width={cellWidth}
              height={cellHeight}
              fill="#eee"
              stroke="#ccc"
            />
          ))
        )}

        {/* ------------------- Идентификаторы зон и рядов ------------------- */}
        {zones.map((zone, i) => (
          <text
            key={`zone-label-${zone}`}
            x={i * cellWidth + cellWidth / 2}
            y={rows * cellHeight + 15}
            fontSize={12}
            textAnchor="middle"
          >
            {zone}
          </text>
        ))}
        {Array.from({ length: rows }).map((_, j) => (
          <text
            key={`row-label-${j+1}`}
            x={-10}
            y={j * cellHeight + cellHeight / 2 + 4}
            fontSize={12}
            textAnchor="end"
          >
            {j + 1}
          </text>
        ))}

        {/* ------------------- Роботы ------------------- */}
        {robots.map((robot) => {
          const zoneIndex = zones.indexOf(robot.zone);
          if (zoneIndex === -1) return null; // если зона неизвестна
          const x = zoneIndex * cellWidth + cellWidth / 2;
          const y = (robot.row - 1) * cellHeight + cellHeight / 2;

          return (
            <g key={robot.id}>
              <circle
                cx={x}
                cy={y}
                r={10}
                fill={statusColor(robot.status)}
                stroke="#000"
              />
              <text
                x={x}
                y={y + 4} // поднимаем текст чуть вниз
                fontSize={10}
                fill="#000"
                textAnchor="middle"
              >
                {robot.id}
              </text>
              <title>
                Robot {robot.id} | Battery: {robot.battery}% | Status: {robot.status}
              </title>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
