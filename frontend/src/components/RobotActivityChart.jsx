import React, { useState, useEffect, useContext } from "react";
import { Line } from "react-chartjs-2";
import { AuthContext } from "../context/AuthContext";
import api from "../api";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function RobotActivityChart() {
  const { access } = useContext(AuthContext);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    const fetchActivity = async () => {
      try {
        const res = await api.get("/warehouse/robot-activity/", {
          headers: { Authorization: `Bearer ${access}` },
        });

        // Предположим, API возвращает массив { time, scans }
        const data = res.data.activity;
        setChartData({
          labels: data.map((d) => d.time),
          datasets: [
            {
              label: "Сканы роботов",
              data: data.map((d) => d.scans),
              fill: false,
              borderColor: "rgba(75,192,192,1)",
              tension: 0.3,
            },
          ],
        });
      } catch (err) {
        console.error(err);
      }
    };

    fetchActivity();
    const interval = setInterval(fetchActivity, 60000); // обновление каждую минуту
    return () => clearInterval(interval);
  }, [access]);

  if (!chartData) return <p>Загрузка графика активности...</p>;

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        bottom: 20, // Отступ снизу для легенды
      }
    },
    plugins: {
      legend: {
        display: true,
        position: 'bottom',
        labels: {
          padding: 15,
          boxWidth: 12,
          boxHeight: 12,
          font: {
            size: 12
          }
        },
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div style={{ width: "100%", height: "250px", marginTop: 0, position: "relative" }}>
      <h2 style={{ fontSize: "14px", marginBottom: "8px", fontWeight: "bold", color: "#333", flexShrink: 0 }}>
        Активность роботов за последний час
      </h2>
      <div style={{ height: "220px", width: "100%", position: "relative" }}>
        <Line data={chartData} options={chartOptions} />
      </div>
    </div>
  );
}
