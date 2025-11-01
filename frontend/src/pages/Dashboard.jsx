import React, { useState, useEffect, useContext } from "react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import { useWebSocket } from "../hooks/useWebSocket";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import WarehouseMap from "./WarehouseMap";
import RobotActivityChart from "../components/RobotActivityChart";
import PredictiveAnalytics from "./PredictiveAnalytics";

const styles = {
  container: {
    minHeight: "100vh",
    backgroundColor: "#f5f5f5",
  },
  main: {
    padding: "20px",
    display: "grid",
    gridTemplateColumns: "2fr 1fr",
    gridTemplateRows: "auto auto",
    gap: "20px",
    height: "calc(100vh - 120px)",
  },
  mapSection: {
    gridColumn: "1",
    gridRow: "1 / span 2",
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    overflow: "hidden",
  },
  statsSection: {
    gridColumn: "2",
    gridRow: "1",
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  scansSection: {
    gridColumn: "2",
    gridRow: "2",
    backgroundColor: "white",
    borderRadius: "8px",
    padding: "20px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
    display: "flex",
    flexDirection: "column",
  },
  sectionTitle: {
    fontSize: "16px",
    fontWeight: "bold",
    color: "#333",
    marginBottom: "15px",
    paddingBottom: "8px",
    borderBottom: "1px solid #e0e0e0",
  },
  statsGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "15px",
    marginBottom: "15px",
  },
  statCard: {
    padding: "12px",
    border: "1px solid #e0e0e0",
    borderRadius: "6px",
    textAlign: "center",
  },
  statValue: {
    fontSize: "24px",
    fontWeight: "bold",
    margin: "5px 0",
  },
  statLabel: {
    fontSize: "12px",
    color: "#666",
    margin: 0,
  },
  chartContainer: {
    flex: 1,
    minHeight: "200px",
    marginTop: "15px",
  },
  tableContainer: {
    flex: 1,
    overflow: "auto",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  tableHeader: {
    backgroundColor: "#f8f9fa",
    position: "sticky",
    top: 0,
    zIndex: 1,
  },
  tableHeaderCell: {
    padding: "8px",
    textAlign: "left",
    fontWeight: "bold",
    color: "#333",
    borderBottom: "1px solid #e0e0e0",
    fontSize: "11px",
  },
  tableCell: {
    padding: "6px",
    borderBottom: "1px solid #e0e0e0",
    color: "#333",
    fontSize: "11px",
  },
  statusBadge: {
    padding: "2px 6px",
    borderRadius: "10px",
    fontSize: "10px",
    fontWeight: "bold",
    textTransform: "uppercase",
  },
  statusOk: {
    backgroundColor: "#d4edda",
    color: "#155724",
  },
  statusLow: {
    backgroundColor: "#fff3cd",
    color: "#856404",
  },
  statusCritical: {
    backgroundColor: "#f8d7da",
    color: "#721c24",
  },
  controls: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: "15px",
    paddingTop: "10px",
    borderTop: "1px solid #e0e0e0",
  },
  pauseButton: {
    backgroundColor: "#6c757d",
    color: "#fff",
    border: "none",
    padding: "6px 12px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "12px",
  },
  websocketIndicator: {
    display: "flex",
    alignItems: "center",
    gap: "5px",
    fontSize: "12px",
    color: "#666",
  },
  indicator: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    animation: "pulse 2s infinite",
  },
  indicatorConnected: {
    backgroundColor: "#28a745",
  },
  indicatorDisconnected: {
    backgroundColor: "#dc3545",
    animation: "none",
  },
  indicatorReconnecting: {
    backgroundColor: "#ffc107",
  },
  lastUpdated: {
    fontSize: "11px",
    color: "#666",
    fontStyle: "italic",
  },
  alertBanner: {
    position: "fixed",
    top: "80px",
    right: "20px",
    maxWidth: "400px",
    backgroundColor: "#dc3545",
    color: "white",
    padding: "15px 20px",
    borderRadius: "8px",
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 1000,
    animation: "slideIn 0.3s ease-out",
  },
  alertClose: {
    position: "absolute",
    top: "10px",
    right: "10px",
    background: "none",
    border: "none",
    color: "white",
    fontSize: "18px",
    cursor: "pointer",
    padding: "0",
    width: "20px",
    height: "20px",
  },
  newScanRow: {
    animation: "highlightRow 2s ease-out",
  },
};

// CSS для анимаций - добавьте в index.css или создайте отдельный файл
const styleSheet = document.createElement("style");
styleSheet.textContent = `
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }
  @keyframes slideIn {
    from { transform: translateX(400px); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes highlightRow {
    0% { background-color: #fff3cd; }
    100% { background-color: transparent; }
  }
`;
document.head.appendChild(styleSheet);

export default function Dashboard() {
  const { access } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [alerts, setAlerts] = useState([]);
  const [newScanIds, setNewScanIds] = useState(new Set());

  // WebSocket подключение
  const WS_URL = "ws://127.0.0.1:8000/ws/dashboard/";
  const { isConnected, lastMessage, connectionStatus } = useWebSocket(WS_URL);

  // Загрузка начальных данных через REST API
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const res = await api.get("/dashboard/current/", {
          headers: { Authorization: `Bearer ${access}` },
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

    fetchInitialData();
  }, [access]);

  // Обработка сообщений от WebSocket
  useEffect(() => {
    if (!lastMessage || isPaused) return;

    console.log("Processing WebSocket message:", lastMessage);

    switch (lastMessage.type) {
      case "initial_data":
        // Начальные данные при подключении
        setData({
          robots: lastMessage.data.robots || [],
          recent_scans: lastMessage.data.recent_scans || [],
          statistics: {
            active_robots: lastMessage.data.robots?.length || 0,
            total_robots: lastMessage.data.robots?.length || 0,
            checked_today: lastMessage.data.recent_scans?.length || 0,
            critical_stock: lastMessage.data.recent_scans?.filter(s => s.status === "CRITICAL").length || 0,
            avg_battery: Math.round(
              lastMessage.data.robots?.reduce((sum, r) => sum + (r.battery || 0), 0) /
              (lastMessage.data.robots?.length || 1)
            ),
          },
        });
        setLastUpdated(new Date().toLocaleTimeString());
        break;

      case "robot_update":
        // Обновление данных робота
        setData(prevData => {
          if (!prevData) return prevData;

          const robotIndex = prevData.robots.findIndex(r => r.id === lastMessage.data.id);
          const newRobots = [...prevData.robots];

          if (robotIndex !== -1) {
            newRobots[robotIndex] = lastMessage.data;
          } else {
            newRobots.push(lastMessage.data);
          }

          // Пересчитываем статистику
          const stats = {
            ...prevData.statistics,
            active_robots: newRobots.filter(r => r.status === "active").length,
            total_robots: newRobots.length,
            avg_battery: Math.round(
              newRobots.reduce((sum, r) => sum + (r.battery || 0), 0) / newRobots.length
            ),
          };

          return {
            ...prevData,
            robots: newRobots,
            statistics: stats,
          };
        });
        setLastUpdated(new Date().toLocaleTimeString());
        break;

      case "new_scan":
        // Новое сканирование
        setData(prevData => {
          if (!prevData) return prevData;

          const newScan = lastMessage.data;
          const newScans = [newScan, ...prevData.recent_scans].slice(0, 20);

          // Помечаем новую строку для анимации
          const scanId = `${newScan.robot_id}-${newScan.time}`;
          setNewScanIds(prev => new Set([...prev, scanId]));
          setTimeout(() => {
            setNewScanIds(prev => {
              const newSet = new Set(prev);
              newSet.delete(scanId);
              return newSet;
            });
          }, 2000);

          // Обновляем статистику
          const stats = {
            ...prevData.statistics,
            checked_today: (prevData.statistics.checked_today || 0) + 1,
            critical_stock: newScans.filter(s => s.status === "CRITICAL").length,
          };

          return {
            ...prevData,
            recent_scans: newScans,
            statistics: stats,
          };
        });
        setLastUpdated(new Date().toLocaleTimeString());
        break;

      case "inventory_alert":
        // Критический остаток
        const alert = {
          id: Date.now(),
          ...lastMessage.data,
        };
        setAlerts(prev => [...prev, alert]);

        // Автоматически скрываем алерт через 10 секунд
        setTimeout(() => {
          setAlerts(prev => prev.filter(a => a.id !== alert.id));
        }, 10000);

        // Браузерное уведомление (если разрешено)
        if ('Notification' in window && Notification.permission === 'granted') {
          new Notification('Критический остаток!', {
            body: `${alert.product_name} в зоне ${alert.zone}: ${alert.quantity} шт.`,
            icon: '/favicon.ico',
            requireInteraction: false,
          });
        }
        break;

      default:
        console.log("Unknown WebSocket message type:", lastMessage.type);
    }
  }, [lastMessage, isPaused]);

  // Запрос разрешения на уведомления при загрузке
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        console.log('Notification permission:', permission);
      });
    }
  }, []);

  const getStatusBadge = (status) => {
    const statusMap = {
      ok: { label: "ОК", style: styles.statusOk },
      low: { label: "Низкий", style: styles.statusLow },
      critical: { label: "Критично", style: styles.statusCritical },
    };
    const statusInfo = statusMap[status?.toLowerCase()] || statusMap.ok;
    return (
      <span style={{ ...styles.statusBadge, ...statusInfo.style }}>
        {statusInfo.label}
      </span>
    );
  };

  const closeAlert = (alertId) => {
    setAlerts(prev => prev.filter(a => a.id !== alertId));
  };

  const getConnectionStatusText = () => {
    switch (connectionStatus) {
      case "connected": return "Подключено";
      case "connecting": return "Подключение...";
      case "reconnecting": return "Переподключение...";
      case "disconnected": return "Отключено";
      default: return "Неизвестно";
    }
  };

  const getIndicatorStyle = () => {
    switch (connectionStatus) {
      case "connected": return styles.indicatorConnected;
      case "reconnecting": return styles.indicatorReconnecting;
      default: return styles.indicatorDisconnected;
    }
  };

  if (loading)
    return (
      <div style={styles.container}>
        <Header />
        <Navigation />
        <div style={{ padding: "20px", textAlign: "center" }}>Загрузка...</div>
      </div>
    );

  if (error && !data)
    return (
      <div style={styles.container}>
        <Header />
        <Navigation />
        <div style={{ padding: "20px", color: "red" }}>{error}</div>
      </div>
    );

  return (
    <div style={styles.container}>
      <Header />
      <Navigation />

      {/* Алерты о критических остатках */}
      {alerts.map((alert, index) => (
        <div key={alert.id} style={{ ...styles.alertBanner, top: `${80 + index * 90}px` }}>
          <button style={styles.alertClose} onClick={() => closeAlert(alert.id)}>
            ×
          </button>
          <div style={{ fontWeight: "bold", marginBottom: "5px" }}>
            ⚠️ Критический остаток!
          </div>
          <div style={{ fontSize: "13px" }}>
            <strong>{alert.product_name}</strong> ({alert.product_id})
          </div>
          <div style={{ fontSize: "12px", marginTop: "5px" }}>
            Зона: {alert.zone} | Остаток: {alert.quantity} шт.
          </div>
        </div>
      ))}

      <main style={styles.main}>
        <section style={styles.mapSection}>
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            <div style={{ flex: "0 0 auto" }}>
              <WarehouseMap
                robots={data?.robots || []}
                recentScans={data?.recent_scans || []}
              />
            </div>

            <div style={{ flex: "1 1 auto", overflowY: "auto", marginTop: "15px" }}>
              <PredictiveAnalytics />
            </div>
          </div>
        </section>

        {/* Статистика */}
        <section style={styles.statsSection}>
          <h3 style={styles.sectionTitle}>Статистика в реальном времени</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Активных роботов</p>
              <p style={{ ...styles.statValue, color: "#1976d2" }}>
                {data?.statistics?.active_robots || 0}/{data?.statistics?.total_robots || 0}
              </p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Проверено сегодня</p>
              <p style={{ ...styles.statValue, color: "#1976d2" }}>
                {data?.statistics?.checked_today || 0}
              </p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Критических остатков</p>
              <p style={{ ...styles.statValue, color: "#dc3545" }}>
                {data?.statistics?.critical_stock || 0}
              </p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Средний заряд батарей</p>
              <p style={{ ...styles.statValue, color: "#ffc107" }}>
                {data?.statistics?.avg_battery || 0}%
              </p>
            </div>
          </div>
          <div style={styles.chartContainer}>
            <RobotActivityChart />
          </div>
        </section>

        {/* Последние сканирования */}
        <section style={styles.scansSection}>
          <h3 style={styles.sectionTitle}>Последние сканирования</h3>
          <div style={styles.tableContainer}>
            <table style={styles.table}>
              <thead style={styles.tableHeader}>
                <tr>
                  <th style={styles.tableHeaderCell}>Время</th>
                  <th style={styles.tableHeaderCell}>ID робота</th>
                  <th style={styles.tableHeaderCell}>Зона склада</th>
                  <th style={styles.tableHeaderCell}>Товар</th>
                  <th style={styles.tableHeaderCell}>Количество</th>
                  <th style={styles.tableHeaderCell}>Статус</th>
                </tr>
              </thead>
              <tbody>
                {data?.recent_scans?.slice(0, 20).map((scan, index) => {
                  const robot = data.robots.find((r) => r.id === scan.robot_id);
                  const scanId = `${scan.robot_id}-${scan.time}`;
                  const isNew = newScanIds.has(scanId);

                  return (
                    <tr
                      key={`${scan.robot_id}-${scan.time}-${index}`}
                      style={isNew ? styles.newScanRow : {}}
                    >
                      <td style={styles.tableCell}>
                        {new Date(scan.time).toLocaleTimeString()}
                      </td>
                      <td style={styles.tableCell}>{scan.robot_id}</td>
                      <td style={styles.tableCell}>
                        {scan.zone || (robot ? `${robot.zone}${robot.row}` : "—")}
                      </td>
                      <td style={styles.tableCell}>{scan.product}</td>
                      <td style={styles.tableCell}>{scan.quantity}</td>
                      <td style={styles.tableCell}>
                        {getStatusBadge(scan.status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div style={styles.controls}>
            <button
              style={styles.pauseButton}
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? "Возобновить" : "Пауза"}
            </button>
            <div style={styles.websocketIndicator}>
              <div style={{ ...styles.indicator, ...getIndicatorStyle() }} />
              {getConnectionStatusText()}
            </div>
            {lastUpdated && (
              <div style={styles.lastUpdated}>Обновлено: {lastUpdated}</div>
            )}
          </div>
        </section>

        {/* Предиктивная аналитика */}
      </main>
    </div>
  );
}