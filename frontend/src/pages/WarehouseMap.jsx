import React, { useState, useEffect, useRef } from "react";
import api from "../api";

export default function WarehouseMap({ robots = [], recentScans = [] }) {
  const containerRef = useRef(null);

  const [zoneStatus, setZoneStatus] = useState({});
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [hoveredRobot, setHoveredRobot] = useState(null);
  const [hoveredCell, setHoveredCell] = useState(null);
  const [loading, setLoading] = useState(true);

  const cellWidth = 40;
  const cellHeight = 28;
  const zones = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
  const rows = 50;
  const marginLeft = 40;
  const marginTop = 36;

  // Загрузка статуса зон из API при монтировании компонента
  useEffect(() => {
    const fetchZoneStatus = async () => {
      try {
        setLoading(true);
        // Получаем токен из localStorage
        const token = localStorage.getItem('access');
        const config = token ? {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        } : {};

        const response = await api.get('/dashboard/zone-status/', config);
        const apiZoneData = response.data;

        // Преобразуем данные из API в нужный формат
        const formattedData = {};
        zones.forEach(zone => {
          for (let r = 1; r <= rows; r++) {
            const key = `${zone}${r}`;
            formattedData[key] = apiZoneData[key] || null;
          }
        });

        setZoneStatus(formattedData);
      } catch (error) {
        console.error('Ошибка загрузки статуса зон:', error);
        // В случае ошибки просто инициализируем пустыми данными
        const emptyData = {};
        zones.forEach(zone => {
          for (let r = 1; r <= rows; r++) {
            emptyData[`${zone}${r}`] = null;
          }
        });
        setZoneStatus(emptyData);
      } finally {
        setLoading(false);
      }
    };

    fetchZoneStatus();
  }, []); // Загружаем только при монтировании

  // Обновление зон при получении новых данных через props (WebSocket)
  useEffect(() => {
    if (loading) return; // Не обновляем, пока загружаются начальные данные

    const newZoneData = { ...zoneStatus }; // Сохраняем существующие данные

    // Обрабатываем последние сканирования из WebSocket
    recentScans.forEach(scan => {
      // ИСПРАВЛЕНИЕ: используем zone и row напрямую из сканирования
      const zone = scan.zone;
      const row = scan.row || scan.row_number; // поддержка обоих форматов

      if (!zone || row == null) return; // проверяем наличие данных

      const key = `${zone}${row}`;
      const prev = newZoneData[key];

      const prevTime = prev?.time ? new Date(prev.time) : null;
      const thisTime = scan.time ? new Date(scan.time) : null;

      // Обновляем только если новое сканирование свежее
      if (!prev || (thisTime && (!prevTime || thisTime > prevTime))) {
        newZoneData[key] = {
          ...scan,
          zone: zone,
          row: row,
        };
      }
    });

    // Обновляем состояние только если есть изменения
    setZoneStatus(newZoneData);
  }, [robots, recentScans, loading, zoneStatus]); // Добавлен zoneStatus в зависимости

  // --- Цвет ячейки ---
  const getZoneColor = (cell) => {
    if (!cell) return "#e9ecef"; // нет данных — серый

    const statusRaw = (cell.status || "").toString().trim().toUpperCase(); // Используем uppercase для проверки
    const scannedAt = cell.time ? new Date(cell.time) : null;
    const now = new Date();

    // Критический статус
    if (statusRaw.includes("CRITICAL") || statusRaw.includes("CRIT")) return "#f8d7da";

    // Низкий остаток
    if (statusRaw.includes("LOW_STOCK") || statusRaw.includes("LOW")) return "#fff3cd";

    // Если нет времени сканирования
    if (!scannedAt) return "#fff3cd";

    // Если сканирование старше 1 часа
    if (now - scannedAt > 60 * 60 * 1000) return "#fff3cd";

    // Все хорошо
    return "#d4edda";
  };

  // --- Цвет робота ---
  const robotColor = (status, battery) => {
    const s = (status || "").toLowerCase();
    if (s.includes("offline") || s.includes("off")) return "#dc3545"; // красный
    if (typeof battery === "number" && battery < 50) return "#ffc107"; // желтый
    return "#28a745"; // зеленый
  };

  const handleZoomIn = () => setScale((s) => Math.min(s + 0.2, 3));
  const handleZoomOut = () => setScale((s) => Math.max(s - 0.2, 0.5));
  const handleCenter = () => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth / 2 - containerRef.current.clientWidth / 2;
      containerRef.current.scrollTop = containerRef.current.scrollHeight / 2 - containerRef.current.clientHeight / 2;
    }
    setOffset({ x: 0, y: 0 });
  };

  const svgWidth = zones.length * cellWidth + marginLeft + 20;
  const svgHeight = rows * cellHeight + marginTop + 20;

  const getTooltipPos = (clientX, clientY) => {
    return { left: clientX + 10, top: clientY + 10 };
  };

  return (
    <div style={{ padding: 0, position: "relative", width: "100%", height: "100%", display: "flex", flexDirection: "column" }}>
      {loading && (
        <div style={{
          position: "absolute",
          top: 50,
          left: "50%",
          transform: "translateX(-50%)",
          zIndex: 1000,
          background: "#fff",
          padding: "8px 16px",
          borderRadius: 4,
          border: "1px solid #ddd"
        }}>
          Загрузка карты...
        </div>
      )}
      <div style={{ marginBottom: 10, flexShrink: 0 }}>
        <button onClick={handleZoomIn} style={buttonStyle}>+</button>
        <button onClick={handleZoomOut} style={buttonStyle}>−</button>
        <button onClick={handleCenter} style={buttonGrayStyle}>Центрировать</button>
        <span style={{ marginLeft: 15, fontSize: 12, color: "#666" }}>
          Роботов на карте: {robots.length} | Масштаб: {Math.round(scale * 100)}%
        </span>
      </div>

      {/* Карта */}
      <div
        ref={containerRef}
        style={{
          overflow: "auto",
          border: "1px solid #ddd",
          borderRadius: 8,
          width: "100%",
          flex: 1,
          minHeight: 0,
          background: "#fff",
          position: "relative",
        }}
      >
        <div style={{
          width: svgWidth * scale,
          height: svgHeight * scale,
          position: "relative",
          margin: "auto",
        }}>
          <svg
            width={svgWidth * scale}
            height={svgHeight * scale}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            preserveAspectRatio="xMinYMin meet"
            style={{
              display: "block",
            }}
          >
            <g transform={`translate(${marginLeft + offset.x}, ${marginTop + offset.y}) scale(${scale})`}>
              {/* Сетка ячеек */}
              {zones.map((zone, colIdx) =>
                Array.from({ length: rows }).map((_, rowIdx) => {
                  const cellId = `${zone}${rowIdx + 1}`;
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
                      onMouseEnter={(e) => setHoveredCell({
                        id: cellId,
                        x: e.clientX,
                        y: e.clientY,
                        cell
                      })}
                      onMouseLeave={() => setHoveredCell(null)}
                      style={{ cursor: 'pointer' }}
                    />
                  );
                })
              )}

              {/* Подписи столбцов (зоны A-Z) */}
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

              {/* Подписи рядов (1-50) */}
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
                const zoneStr = (robot.zone || "").toString().toUpperCase();
                const zoneIndex = zones.indexOf(zoneStr);
                const rowNum = Number(robot.row);

                if (zoneIndex === -1 || !rowNum || rowNum < 1 || rowNum > rows) {
                  return null;
                }

                const x = zoneIndex * cellWidth + cellWidth / 2;
                const y = (rowNum - 1) * cellHeight + cellHeight / 2;
                const color = robotColor(robot.status, robot.battery);

                return (
                  <g
                    key={robot.id}
                    onMouseEnter={(e) => setHoveredRobot({
                      ...robot,
                      x: e.clientX,
                      y: e.clientY
                    })}
                    onMouseLeave={() => setHoveredRobot(null)}
                    style={{ cursor: 'pointer' }}
                  >
                    <circle
                      cx={x}
                      cy={y}
                      r={9}
                      fill={color}
                      stroke="#222"
                      strokeWidth={0.8}
                    />
                    <text
                      x={x}
                      y={y + 4}
                      fontSize={9}
                      fill="#fff"
                      textAnchor="middle"
                      fontWeight="bold"
                    >
                      {String(robot.id).replace(/^RB-/, "")}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
      </div>

      {/* Tooltip робота */}
      {hoveredRobot && (
        (() => {
          const pos = getTooltipPos(hoveredRobot.x, hoveredRobot.y);
          return (
            <div style={{ ...tooltipStyle(pos.left, pos.top) }}>
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                🤖 Робот {hoveredRobot.id}
              </div>
              <div style={{ fontSize: 12 }}>
                🔋 Батарея: {hoveredRobot.battery}%
              </div>
              <div style={{ fontSize: 12 }}>
                📍 Позиция: {hoveredRobot.zone}{hoveredRobot.row}
              </div>
              <div style={{ fontSize: 12 }}>
                ⚡ Статус: {hoveredRobot.status}
              </div>
              {hoveredRobot.last_update && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
                  🕐 {new Date(hoveredRobot.last_update).toLocaleString()}
                </div>
              )}
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
              <div style={{ fontWeight: "bold", marginBottom: 5 }}>
                📦 Зона {hoveredCell.id}
              </div>
              {sc ? (
                <>
                  <div style={{ fontSize: 12 }}>
                    📊 Статус: {sc.status || "OK"}
                  </div>
                  {sc.product && (
                    <div style={{ fontSize: 12 }}>
                      📦 Товар: {sc.product}
                    </div>
                  )}
                  {sc.quantity != null && (
                    <div style={{ fontSize: 12 }}>
                      📈 Количество: {sc.quantity}
                    </div>
                  )}
                  <div style={{ fontSize: 11, color: "#666", marginTop: 3 }}>
                    🕐 {sc.time ? new Date(sc.time).toLocaleString() : "—"}
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "#999" }}>
                  Нет данных сканирования
                </div>
              )}
            </div>
          );
        })()
      )}

      {/* Легенда */}
      {/* Легенда рендерится в Dashboard */}
    </div>
  );
}

// === Стили (остаются без изменений) ===
const buttonStyle = {
  padding: "6px 10px",
  marginRight: 8,
  backgroundColor: "#007bff",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: "500",
};

const buttonGrayStyle = {
  padding: "6px 10px",
  marginRight: 8,
  backgroundColor: "#6c757d",
  color: "#fff",
  border: "none",
  borderRadius: 6,
  cursor: "pointer",
  fontSize: 13,
  fontWeight: "500",
};

const tooltipStyle = (left, top) => ({
  position: "fixed",
  left,
  top,
  background: "#fff",
  border: "1px solid #ccc",
  borderRadius: 8,
  padding: "10px 12px",
  fontSize: 13,
  pointerEvents: "none",
  zIndex: 2000,
  boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
  minWidth: 180,
});

const legendStyle = {
  position: "absolute",
  top: 60,
  right: 20,
  background: "white",
  border: "1px solid #ddd",
  borderRadius: 8,
  padding: 12,
  fontSize: 12,
  boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
  zIndex: 100,
};

const legendItemStyle = {
  display: "flex",
  alignItems: "center",
  marginBottom: 6,
  gap: 8,
};

const legendColorBox = {
  width: 20,
  height: 14,
  border: "1px solid #999",
  borderRadius: 3,
};

const legendColorCircle = {
  width: 12,
  height: 12,
  borderRadius: "50%",
  border: "1px solid #666",
};