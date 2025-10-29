import React, { useState, useEffect, useContext } from "react";
import api from "../api"; // axios-инстанс
import { AuthContext } from "../context/AuthContext";

export default function WarehouseMap() {
  const { access } = useContext(AuthContext);

  const [robots, setRobots] = useState([]);
  const [zoneStatus, setZoneStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredRobot, setHoveredRobot] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  const cellWidth = 40;
  const cellHeight = 20;
  const zones = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const rows = 50;

  // Цвет ячейки в зависимости от состояния
  const getZoneColor = (cell) => {
    if (!cell) return "#fff3cd"; // нет данных — жёлтый
    const now = new Date();
    const scannedAt = new Date(cell.scanned_at);
    if (cell.status?.toUpperCase() === "CRITICAL") return "#f8d7da"; // красный
    if (now - scannedAt > 15 * 60 * 1000) return "#fff3cd"; // устаревшие — жёлтый
    return "#d4edda"; // зелёный
  };

  const robotColor = (status, battery) => {
    if (status === "offline") return "red";
    if (battery < 50) return "yellow";
    return "green";
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get("/dashboard/current/", {
          headers: { Authorization: `Bearer ${access}` },
        });

        // Нормализуем роботов
        const robotsData = (res.data.robots || []).map((r) => ({
          ...r,
          battery: r.battery,
          status: r.status || "active",
        }));
        setRobots(robotsData);

        // Формируем объект зон
        const scans = res.data.recent_scans || [];
        const newZoneData = {};

        scans.forEach((scan) => {
          const key = `${scan.zone}${scan.row_number}`;
          const prev = newZoneData[key];
          // если несколько сканов — берём самый свежий
          if (!prev || new Date(scan.scanned_at) > new Date(prev.scanned_at)) {
            newZoneData[key] = scan;
          }
        });

        // создаём пустые ячейки для отсутствующих
        zones.forEach((zone) => {
          for (let r = 1; r <= rows; r++) {
            const key = `${zone}${r}`;
            if (!newZoneData[key]) {
              newZoneData[key] = null;
            }
          }
        });

        setZoneStatus(newZoneData);
        setError(null);
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить данные карты склада");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, [access]);

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleCenter = () => setOffset({ x: 0, y: 0 });

  if (loading) return <p>Загрузка карты...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  return (
    <div style={{ padding: "16px", position: "relative" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
        Интерактивная карта склада
      </h2>

      <div style={{ marginBottom: "12px" }}>
        <button onClick={handleZoomIn} style={buttonStyle}>
          +
        </button>
        <button onClick={handleZoomOut} style={buttonStyle}>
          −
        </button>
        <button onClick={handleCenter} style={buttonGrayStyle}>
          Центрировать
        </button>
      </div>

      <div
        style={{
          overflow: "auto",
          border: "1px solid #ddd",
          borderRadius: "8px",
          width: "100%",
          height: "80vh",
          background: "#fafafa",
        }}
      >
        <svg width={zones.length * cellWidth + 100} height={rows * cellHeight + 100}>
          <g transform={`scale(${scale}) translate(${offset.x}, ${offset.y})`}>
            {/* Сетка зон */}
            {zones.map((zone, i) =>
              Array.from({ length: rows }).map((_, j) => {
                const cellId = `${zone}${j + 1}`;
                const cell = zoneStatus[cellId];
                return (
                  <rect
                    key={cellId}
                    x={i * cellWidth}
                    y={j * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={getZoneColor(cell)}
                    stroke="#ccc"
                    strokeWidth={0.5}
                    onMouseEnter={(e) =>
                      setHoveredCell({ id: cellId, x: e.clientX, y: e.clientY, cell })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })
            )}

            {/* Подписи зон */}
            {zones.map((zone, i) => (
              <text
                key={`zone-${zone}`}
                x={i * cellWidth + cellWidth / 2}
                y={-5}
                fontSize={10}
                fontWeight="bold"
                textAnchor="middle"
                fill="#333"
              >
                {zone}
              </text>
            ))}

            {/* Подписи рядов */}
            {Array.from({ length: rows }).map((_, j) => (
              <text
                key={`row-${j + 1}`}
                x={-5}
                y={j * cellHeight + cellHeight / 2 + 3}
                fontSize={10}
                fontWeight="bold"
                textAnchor="end"
                fill="#333"
              >
                {j + 1}
              </text>
            ))}

            {/* Роботы */}
            {robots.map((robot) => {
              const zoneIndex = zones.indexOf(robot.zone);
              if (zoneIndex === -1) return null;
              const x = zoneIndex * cellWidth + cellWidth / 2;
              const y = (robot.row - 1) * cellHeight + cellHeight / 2;
              const color = robotColor(robot.status, robot.battery);

              return (
                <g
                  key={robot.id}
                  onMouseEnter={(e) =>
                    setHoveredRobot({ ...robot, x: e.clientX, y: e.clientY })
                  }
                  onMouseLeave={() => setHoveredRobot(null)}
                  cursor="pointer"
                >
                  <circle cx={x} cy={y} r={8} fill={color} stroke="#000" strokeWidth={1} />
                  <text
                    x={x}
                    y={y + 3}
                    fontSize={8}
                    fill="#000"
                    textAnchor="middle"
                  >
                    {robot.id.replace("RB-", "")}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Tooltip для робота */}
      {hoveredRobot && (
        <div style={tooltipStyle(hoveredRobot.x, hoveredRobot.y)}>
          <p>
            <strong>{hoveredRobot.id}</strong>
          </p>
          <p>Батарея: {hoveredRobot.battery}%</p>
          <p>
            Зона: {hoveredRobot.zone}
            {hoveredRobot.row}
          </p>
          <p>Статус: {hoveredRobot.status || "active"}</p>
        </div>
      )}

      {/* Tooltip для ячейки */}
      {hoveredCell && (
        <div style={tooltipStyle(hoveredCell.x, hoveredCell.y)}>
          <p>
            <strong>Координата:</strong> {hoveredCell.id}
          </p>
          <p>
            <strong>Статус:</strong> {hoveredCell.cell?.status || "OK"}
          </p>
          <p>
            <strong>Последнее сканирование:</strong>{" "}
            {hoveredCell.cell?.scanned_at
              ? new Date(hoveredCell.cell.scanned_at).toLocaleTimeString()
              : "—"}
          </p>
        </div>
      )}
    </div>
  );
}

const buttonStyle = {
  padding: "6px 12px",
  marginRight: "6px",
  backgroundColor: "#007bff",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const buttonGrayStyle = {
  padding: "6px 12px",
  marginRight: "6px",
  backgroundColor: "#6c757d",
  color: "white",
  border: "none",
  borderRadius: "4px",
  cursor: "pointer",
};

const tooltipStyle = (x, y) => ({
  position: "fixed",
  left: x + 10,
  top: y + 10,
  background: "white",
  border: "1px solid #ccc",
  borderRadius: "4px",
  padding: "6px",
  fontSize: "12px",
  pointerEvents: "none",
  zIndex: 1000,
});
