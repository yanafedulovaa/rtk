import { useEffect, useState } from "react";
import axios from "axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function InventoryTrendModal({ show, onClose, selectedProducts, access }) {
  const [trendData, setTrendData] = useState([]);
  const [products, setProducts] = useState([]);
  const [visibleLines, setVisibleLines] = useState({});
  const [loading, setLoading] = useState(false);
  const [granularity, setGranularity] = useState('hour');

  const COLORS = [
    '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#a28bdb',
    '#f48fb1', '#4dd0e1', '#aed581', '#ffb74d', '#e57373'
  ];

  useEffect(() => {
    if (show) {
      fetchTrendData();
    }
  }, [show, selectedProducts]);

  const fetchTrendData = async () => {
    setLoading(true);

    console.log('=== DEBUG INFO ===');
    console.log('Auth token:', access);
    console.log('Selected products:', selectedProducts);

    try {
      const params = {};
      if (selectedProducts.length > 0) {
        params.products = selectedProducts.join(',');
      }

      const url = 'http://localhost:8000/api/inventory/trend/';
      console.log('Request URL:', url);
      console.log('Request params:', params);

      // Используем axios вместо fetch для лучшей совместимости
      const res = await axios.get(url, {
        params,
        headers: {
          'Authorization': `Bearer ${access}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('Response received:', res.data);

      const { products: productList, data } = res.data;
      setProducts(productList);

      // Инициализируем видимость всех линий
      const initialVisible = {};
      productList.forEach(p => {
        initialVisible[p] = true;
      });
      setVisibleLines(initialVisible);

      // Преобразуем данные для recharts
      const allTimestamps = new Set();
      Object.values(data).forEach(records => {
        records.forEach(r => {
          allTimestamps.add(new Date(r.scanned_at).getTime());
        });
      });

      const sortedTimestamps = Array.from(allTimestamps).sort((a, b) => a - b);

      const chartData = sortedTimestamps.map(timestamp => {
        const point = { timestamp };

        productList.forEach(productId => {
          const productRecords = data[productId] || [];
          // Находим ближайшую запись для этого времени
          const record = productRecords.find(r =>
            new Date(r.scanned_at).getTime() === timestamp
          );

          if (record) {
            point[`product_${productId}`] = record.quantity;
          }
        });

        return point;
      });

      console.log('Chart data prepared:', chartData.length, 'points');
      setTrendData(chartData);
    } catch (err) {
      console.error("=== ERROR ===");
      console.error("Full error:", err);
      console.error("Response:", err.response?.data);
      console.error("Status:", err.response?.status);

      if (err.response?.status === 401) {
        alert("Ошибка авторизации. Токен недействителен или истек. Пожалуйста, войдите в систему заново.");
      } else {
        alert(`Не удалось загрузить данные для графика: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const toggleLine = (productId) => {
    setVisibleLines(prev => ({
      ...prev,
      [productId]: !prev[productId]
    }));
  };

  const formatDate = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!show) return null;

  return (
    <div
      className="modal d-block"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
      onClick={onClose}
    >
      <div
        className="modal-dialog modal-xl modal-dialog-centered"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">График трендов остатков</h5>
            <button
              type="button"
              className="btn-close"
              onClick={onClose}
            ></button>
          </div>

          <div className="modal-body">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Загрузка...</span>
                </div>
              </div>
            ) : trendData.length === 0 ? (
              <div className="alert alert-info">
                Нет данных для отображения. Выберите товары с историей изменений.
              </div>
            ) : (
              <>
                {/* График */}
                                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="timestamp"
                      tickFormatter={formatDate}
                      angle={-45}
                      textAnchor="end"
                      height={80}
                    />
                    <YAxis
                      label={{ value: 'Количество единиц', angle: -90, position: 'insideLeft' }}
                    />
                    <Tooltip
                      labelFormatter={formatDate}
                      formatter={(value, name) => [
                        value,
                        `Товар ${name.replace('product_', '')}`
                      ]}
                    />
                    {/* <Legend /> Убираем эту строку */}

                    {products.map((productId, index) => (
                      visibleLines[productId] && (
                        <Line
                          key={productId}
                          type="monotone"
                          dataKey={`product_${productId}`}
                          name={`Товар ${productId}`}
                          stroke={COLORS[index % COLORS.length]}
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                          connectNulls
                        />
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>

                {/* Управление видимостью линий */}
                <div className="mt-4">
                  <h6>Управление отображением товаров:</h6>
                  <div className="d-flex flex-wrap gap-2">
                    {products.map((productId, index) => (
                      <button
                        key={productId}
                        className={`btn btn-sm ${visibleLines[productId] ? 'btn-primary' : 'btn-outline-secondary'}`}
                        onClick={() => toggleLine(productId)}
                      >
                        <span
                          className="d-inline-block me-2"
                          style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: COLORS[index % COLORS.length],
                            borderRadius: '2px'
                          }}
                        ></span>
                        Товар {productId}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Статистика */}
                <div className="mt-4">
                  <h6>Статистика:</h6>
                  <div className="row">
                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <small className="text-muted">Товаров на графике</small>
                          <h4>{products.length}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <small className="text-muted">Точек данных</small>
                          <h4>{trendData.length}</h4>
                        </div>
                      </div>
                    </div>
                    <div className="col-md-4">
                      <div className="card">
                        <div className="card-body">
                          <small className="text-muted">Видимых линий</small>
                          <h4>{Object.values(visibleLines).filter(v => v).length}</h4>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}