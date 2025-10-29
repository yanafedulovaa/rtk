import React, { useState } from "react";

export default function WarehouseMap({ robots = [], recentScans = [] }) {
  const [hoveredRobot, setHoveredRobot] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  const cellWidth = 40;
  const cellHeight = 20;
  const zones = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const rows = 50;

  // Создаём объект зон по последним сканам
  const zoneStatus = {};
  zones.forEach((zone) => {
    for (let r = 1; r <= rows; r++) {
      zoneStatus[`${zone}${r}`] = null;
    }
  });
  recentScans.forEach((scan) => {
    const key = `${scan.zone}${scan.row_number}`;
    const prev = zoneStatus[key];
    if (!prev || new Date(scan.scanned_at) > new Date(prev?.scanned_at)) {
      zoneStatus[key] = scan;
    }
  });

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

  return (
    <div style={{ padding: "16px", position: "relative" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
        Интерактивная карта склада
      </h2>

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
          <g>
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
