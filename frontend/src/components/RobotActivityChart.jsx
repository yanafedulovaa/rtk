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

  return (
    <div style={{ width: "100%", height: 300, marginTop: 20 }}>
      <h2>Активность роботов за последний час</h2>
      <Line data={chartData} />
    </div>
  );
}
