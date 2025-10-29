import React, { useState, useEffect, useContext } from "react";
import api from "../api";
import { AuthContext } from "../context/AuthContext";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import WarehouseMap from "./WarehouseMap";
import InventoryPredict from "./InventoryPredict";
import RobotActivityChart from "../components/RobotActivityChart";

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
  },
  indicatorOnline: { backgroundColor: "#28a745" },
  indicatorOffline: { backgroundColor: "#dc3545" },
  indicatorReconnecting: { backgroundColor: "#6c757d" },
  lastUpdated: {
    fontSize: "11px",
    color: "#666",
    fontStyle: "italic",
  },
};


export default function Dashboard() {
  const { access } = useContext(AuthContext);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isPaused, setIsPaused] = useState(false);
  const [websocketStatus, setWebsocketStatus] = useState("online");

  useEffect(() => {
    if (isPaused) return;

    const fetchDashboard = async () => {
      try {
        const res = await api.get("/dashboard/current/", {
          headers: { Authorization: `Bearer ${access}` },
        });
        setData(res.data);
        setError(null);
        setLastUpdated(new Date().toLocaleTimeString());
        setWebsocketStatus("online");
      } catch (err) {
        console.error(err);
        setError("Не удалось загрузить данные");
        setWebsocketStatus("offline");
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
    const interval = setInterval(fetchDashboard, 5000);
    return () => clearInterval(interval);
  }, [access, isPaused]);

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

  if (loading)
    return (
      <div style={styles.container}>
        <Header />
        <Navigation />
        <div style={{ padding: "20px", textAlign: "center" }}>Загрузка...</div>
      </div>
    );

  if (error)
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
      <main style={styles.main}>
        {/* Карта склада */}
        <section style={styles.mapSection}>
          <h3 style={styles.sectionTitle}>Карта склада</h3>
          <WarehouseMap robots={data?.robots || []} />
        </section>

        {/* Статистика */}
        <section style={styles.statsSection}>
          <h3 style={styles.sectionTitle}>Статистика в реальном времени</h3>
          <div style={styles.statsGrid}>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Активных роботов</p>
              <p style={{ ...styles.statValue, color: "#1976d2" }}>
                {data.statistics.active_robots}/{data.statistics.total_robots}
              </p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Проверено сегодня</p>
              <p style={{ ...styles.statValue, color: "#1976d2" }}>
                {data.statistics.checked_today}
              </p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Критических остатков</p>
              <p style={{ ...styles.statValue, color: "#dc3545" }}>
                {data.statistics.critical_stock}
              </p>
            </div>
            <div style={styles.statCard}>
              <p style={styles.statLabel}>Средний заряд батарей</p>
              <p style={{ ...styles.statValue, color: "#ffc107" }}>
                {data.statistics.avg_battery}%
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
                {data.recent_scans.slice(0, 20).map((scan, index) => {
                  const robot = data.robots.find((r) => r.id === scan.robot_id);
                  return (
                    <tr key={index}>
                      <td style={styles.tableCell}>{scan.time}</td>
                      <td style={styles.tableCell}>{scan.robot_id}</td>
                      <td style={styles.tableCell}>
                        {robot ? `${robot.zone}${robot.row}` : "—"}
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
              <div
                style={{
                  ...styles.indicator,
                  ...(websocketStatus === "online"
                    ? styles.indicatorOnline
                    : websocketStatus === "offline"
                    ? styles.indicatorOffline
                    : styles.indicatorReconnecting),
                }}
              />
              WebSocket
            </div>
            {lastUpdated && (
              <div style={styles.lastUpdated}>Обновлено: {lastUpdated}</div>
            )}
          </div>
        </section>

        {/* Предиктивная аналитика */}
        <InventoryPredict />
      </main>
    </div>
  );
}
