<<<<<<< HEAD
import React, { useState } from "react";

export default function WarehouseMap({ robots = [], recentScans = [] }) {
=======
import React, { useState, useEffect, useContext, useRef } from "react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";

export default function WarehouseMap() {
  const { access } = useContext(AuthContext);
  const containerRef = useRef(null);

  const [robots, setRobots] = useState([]);
  const [zoneStatus, setZoneStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
>>>>>>> 25284483d6eba5df6cbdb3b5b473be2fa634657b
  const [hoveredRobot, setHoveredRobot] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);

  const cellWidth = 40;
  const cellHeight = 28;
  const zones = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const rows = 50;
  const marginLeft = 40;
  const marginTop = 36;

<<<<<<< HEAD
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

=======
  // --- Цвет ячейки ---
>>>>>>> 25284483d6eba5df6cbdb3b5b473be2fa634657b
  const getZoneColor = (cell) => {
      console.log(cell);
    if (!cell) return "#e9ecef"; // нет данных — серый
    const statusRaw = (cell.status || cell.result || cell.scan_status || "").toString().trim();
    const status = statusRaw.replace(/\s+/g, "_").toLowerCase();
    const scannedAt = cell.time ? new Date(cell.time) : null;
    const now = new Date();

    if (status.includes("crit")) return "#f8d7da"; // красный
    if (!scannedAt) return "#fff3cd"; // желтый
    if (now - scannedAt > 60 * 60 * 1000) return "#fff3cd"; // старше 1 часа
    return "#d4edda"; // зеленый
  };

  // --- Цвет робота ---
  const robotColor = (status, battery) => {
    const s = (status || "").toLowerCase();
    if (s.includes("offline") || s.includes("off")) return "#dc3545";
    if (typeof battery === "number" && battery < 50) return "#ffc107";
    return "#28a745";
  };

<<<<<<< HEAD
  return (
    <div style={{ padding: "16px", position: "relative" }}>
      <h2 style={{ fontSize: "20px", marginBottom: "12px" }}>
        Интерактивная карта склада
      </h2>

=======
  // --- Нормализация зон ---
  const normalizeZoneStatus = (scans) => {
    const newZoneData = {};

    scans.forEach((scan) => {
      const zone = scan.zone || scan.zoneName || scan.zone_id;
      const rowNumber = scan.row_number || scan.row || scan.r;
      if (!zone || rowNumber == null) return;
      const key = `${zone}${rowNumber}`;

      const prev = newZoneData[key];
      const prevTime = prev?.time ? new Date(prev.time) : null;
      const thisTime = scan.time ? new Date(scan.time) : null;

      if (!prev || (thisTime && (!prevTime || thisTime > prevTime))) {
        newZoneData[key] = scan;
      }
    });

    // Заполняем пустые ячейки
    zones.forEach((zone) => {
      for (let r = 1; r <= rows; r++) {
        const key = `${zone}${r}`;
        if (!newZoneData.hasOwnProperty(key)) newZoneData[key] = null;
      }
    });

    return newZoneData;
  };

  // --- Fetch данных ---
 useEffect(() => {
  let mounted = true;

  const fetchData = async () => {
    try {
      const res = await api.get("/dashboard/current/", {
        headers: { Authorization: `Bearer ${access}` },
      });

      // --- Нормализуем роботов ---
      const robotsRaw = res.data.robots || [];
      const robotsData = robotsRaw.map(r => ({
        id: r.id,
        zone: r.zone || r.zone_id || r.zoneName || "",
        row: Number(r.row || r.row_number || r.shelf_row || 0),
        battery: typeof r.battery === "number" ? r.battery : Number(r.batt) || 0,
        status: r.status || r.state || "active",
        ...r,
      }));
      if (!mounted) return;
      setRobots(robotsData);

      // --- Формируем статус по зонам ---
      const scans = res.data.recent_scans || [];
      const newZoneData = {};

      scans.forEach(scan => {
        // Берем зону и ряд по роботу
        const robot = robotsData.find(r => r.id === scan.robot_id);
        if (!robot || !robot.zone || robot.row == null) return;

        const key = `${robot.zone}${robot.row}`;
        const prev = newZoneData[key];

        const prevTime = prev?.time ? new Date(prev.time) : null;
        const thisTime = scan.time ? new Date(scan.time) : null;

        // Сохраняем самый свежий скан
        if (!prev || (thisTime && (!prevTime || thisTime > prevTime))) {
          newZoneData[key] = scan;
        }
      });

      // --- Добавляем отсутствующие ячейки ---
      zones.forEach(zone => {
        for (let r = 1; r <= rows; r++) {
          const key = `${zone}${r}`;
          if (!newZoneData.hasOwnProperty(key)) newZoneData[key] = null;
        }
      });

      if (!mounted) return;
      setZoneStatus(newZoneData);
      setError(null);
    } catch (err) {
      console.error(err);
      if (!mounted) return;
      setError("Не удалось загрузить данные карты склада");
    } finally {
      if (!mounted) return;
      setLoading(false);
    }
  };

  fetchData();
  const interval = setInterval(fetchData, 5000);

  return () => {
    mounted = false;
    clearInterval(interval);
  };
}, [access]);


  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleCenter = () => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
      containerRef.current.scrollLeft = 0;
    }
    setOffset({ x: 0, y: 0 });
  };

  if (loading) return <p>Загрузка карты...</p>;
  if (error) return <p style={{ color: "red" }}>{error}</p>;

  const svgWidth = zones.length * cellWidth + marginLeft + 20;
  const svgHeight = rows * cellHeight + marginTop + 20;

  const getTooltipPos = (clientX, clientY) => {
    return { left: clientX + 10, top: clientY + 10 };
  };

  return (
    <div style={{ padding: 12, position: "relative" }}>
      <h2 style={{ fontSize: 18, marginBottom: 12 }}>Интерактивная карта склада</h2>
      <div style={{ marginBottom: 10 }}>
        <button onClick={handleZoomIn} style={buttonStyle}>+</button>
        <button onClick={handleZoomOut} style={buttonStyle}>−</button>
        <button onClick={handleCenter} style={buttonGrayStyle}>Центрировать</button>
      </div>

>>>>>>> 25284483d6eba5df6cbdb3b5b473be2fa634657b
      <div
        ref={containerRef}
        style={{
          overflow: "auto",
          border: "1px solid #ddd",
          borderRadius: 8,
          width: "100%",
          height: "72vh",
          background: "#fff",
        }}
      >
<<<<<<< HEAD
        <svg width={zones.length * cellWidth + 100} height={rows * cellHeight + 100}>
          <g>
            {/* Сетка зон */}
            {zones.map((zone, i) =>
              Array.from({ length: rows }).map((_, j) => {
                const cellId = `${zone}${j + 1}`;
=======
        <svg width={svgWidth} height={svgHeight} viewBox={`0 0 ${svgWidth} ${svgHeight}`} preserveAspectRatio="xMinYMin meet">
          <g transform={`translate(${marginLeft + offset.x}, ${marginTop + offset.y}) scale(${scale})`}>
            {/* Сетка */}
            {zones.map((zone, colIdx) =>
              Array.from({ length: rows }).map((_, rowIdx) => {
                const cellId = `${zone}${rowIdx + 1}`;
>>>>>>> 25284483d6eba5df6cbdb3b5b473be2fa634657b
                const cell = zoneStatus[cellId];
                return (
                  <rect
                    key={cellId}
                    x={colIdx * cellWidth}
                    y={rowIdx * cellHeight}
                    width={cellWidth}
                    height={cellHeight}
                    fill={getZoneColor(cell)}
                    stroke="#cfcfcf"
                    strokeWidth={0.5}
                    onMouseEnter={(e) => setHoveredCell({ id: cellId, x: e.clientX, y: e.clientY, cell })}
                    onMouseLeave={() => setHoveredCell(null)}
                  />
                );
              })
            )}

            {/* Подписи столбцов */}
            {zones.map((zone, i) => (
              <text
                key={`col-${zone}`}
                x={i * cellWidth + cellWidth / 2}
                y={-8}
                fontSize={12}
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
                key={`row-label-${j + 1}`}
                x={-10}
                y={j * cellHeight + cellHeight / 2 + 4}
                fontSize={12}
                fontWeight="bold"
                textAnchor="end"
                fill="#333"
              >
                {j + 1}
              </text>
            ))}

            {/* Роботы */}
            {robots.map((robot) => {
              const zoneIndex = zones.indexOf((robot.zone || "").toString());
              const rowNum = Number(robot.row);
              if (zoneIndex === -1 || !rowNum) return null;
              const x = zoneIndex * cellWidth + cellWidth / 2;
              const y = (rowNum - 1) * cellHeight + cellHeight / 2;
              const color = robotColor(robot.status, robot.battery);

              return (
                <g
                  key={robot.id}
                  cursor="pointer"
                  onMouseEnter={(e) => setHoveredRobot({ ...robot, x: e.clientX, y: e.clientY })}
                  onMouseLeave={() => setHoveredRobot(null)}
                >
                  <circle cx={x} cy={y} r={9} fill={color} stroke="#222" strokeWidth={0.8} />
                  <text x={x} y={y + 4} fontSize={9} fill="#fff" textAnchor="middle">
                    {String(robot.id).replace(/^RB-/, "")}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Tooltip робот */}
      {hoveredRobot && (
        (() => {
          const pos = getTooltipPos(hoveredRobot.x, hoveredRobot.y);
          return (
            <div style={{ ...tooltipStyle(pos.left, pos.top) }}>
              <div style={{ fontWeight: "bold" }}>{hoveredRobot.id}</div>
              <div>Батарея: {hoveredRobot.battery}%</div>
              <div>Позиция: {hoveredRobot.zone}{hoveredRobot.row}</div>
              <div>Статус: {hoveredRobot.status}</div>
            </div>
          );
        })()
      )}

      {/* Tooltip ячейки */}
      {hoveredCell && (
        (() => {
          const pos = getTooltipPos(hoveredCell.x, hoveredCell.y);
          const sc = hoveredCell.cell;
          return (
            <div style={{ ...tooltipStyle(pos.left, pos.top) }}>
              <div style={{ fontWeight: "bold" }}>{hoveredCell.id}</div>
              <div>Статус: { (sc && (sc.status || sc.result || "OK")) }</div>
              <div>Последнее сканирование: { sc && sc.time ? new Date(sc.time).toLocaleString() : "—" }</div>
            </div>
          );
        })()
      )}
    </div>
  );
}

<<<<<<< HEAD
const tooltipStyle = (x, y) => ({
=======
// === Стили ===
const buttonStyle = {
  padding: "6px 10px",
  marginRight: 8,
  backgroundColor: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const buttonGrayStyle = {
  padding: "6px 10px",
  marginRight: 8,
  backgroundColor: "#6c757d",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
};

const tooltipStyle = (left, top) => ({
>>>>>>> 25284483d6eba5df6cbdb3b5b473be2fa634657b
  position: "fixed",
  left,
  top,
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 6,
  padding: "8px",
  fontSize: 13,
  pointerEvents: "none",
  zIndex: 2000,
  boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
});