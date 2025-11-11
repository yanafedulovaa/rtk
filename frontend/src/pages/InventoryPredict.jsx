import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './PredictiveAnalytics.css';

const PredictiveAnalytics = () => {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [error, setError] = useState(null);

  // Загрузка прогнозов при монтировании компонента
  useEffect(() => {
    fetchPredictions();
  }, []);

  // Получить последние прогнозы из БД
  const fetchPredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get('http://185.146.3.192/api/warehouse/predictions/');
      console.log('Predictions from server:', response.data);

      // Обрабатываем данные с проверкой структуры
      const predictionsData = response.data.predictions || [];
      setPredictions(predictionsData);
      setLastUpdate(response.data.last_update || new Date().toISOString());
    } catch (err) {
      console.error('Error fetching predictions:', err);
      setError('Не удалось загрузить прогнозы');
    } finally {
      setLoading(false);
    }
  };

  // Обновить прогнозы (вызов AI)
  const updatePredictions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.post('http://localhost:8000/api/warehouse/predictions/', {
        limit: 20
      });
      console.log('Updated predictions:', response.data);

      const predictionsData = response.data.predictions || [];
      setPredictions(predictionsData);
      setLastUpdate(new Date().toISOString());
      alert(`Прогнозы обновлены! Рассчитано: ${response.data.total_calculated || 0}`);
    } catch (err) {
      setError('Ошибка обновления прогнозов');
      console.error('Error updating predictions:', err);
    } finally {
      setLoading(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Безопасное получение значения metrics
  const getMetricValue = (pred, field, defaultValue = 0) => {
    if (pred.metrics && pred.metrics[field] !== undefined) {
      return pred.metrics[field];
    }
    // Если metrics нет, пробуем получить значение напрямую из pred
    if (pred[field] !== undefined) {
      return pred[field];
    }
    return defaultValue;
  };

  return (
    <div className="predictive-analytics">
      <div className="header">
        <h2>Прогноз ИИ на следующие 7 дней</h2>
        <button
          onClick={updatePredictions}
          disabled={loading}
          className="update-button"
        >
          {loading ? 'Обновление...' : 'Обновить прогноз'}
        </button>
      </div>

      {lastUpdate && (
        <div className="last-update">
          Последнее обновление: {formatDate(lastUpdate)}
        </div>
      )}

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {loading && predictions.length === 0 ? (
        <div className="loading">Загрузка прогнозов...</div>
      ) : predictions.length === 0 ? (
        <div className="no-data">
          <p>Нажмите "Обновить прогноз" для расчета</p>
        </div>
      ) : (
        <div className="predictions-list">
          {predictions.map((pred, index) => {
            // Безопасное извлечение данных
            const productId = pred.product_id || pred.product?.id || `product-${index}`;
            const productName = pred.product_name || pred.product?.name || productId;
            const daysUntilStockout = pred.days_until_stockout || 0;
            const currentStock = getMetricValue(pred, 'current_stock', 0);
            const avgConsumption = getMetricValue(pred, 'avg_daily_consumption', 0);
            const recommendedOrder = pred.recommended_order_quantity || 0;
            const predictionDate = pred.prediction_date || pred.stockout_date || null;

            return (
              <div
                key={`${productId}-${index}`}
                className={`prediction-card ${daysUntilStockout <= 2 ? 'critical' : ''}`}
              >
                <div className="prediction-header">
                  <span className="product-name">{productName}</span>
                  {daysUntilStockout <= 2 && (
                    <span className="critical-badge">Критично</span>
                  )}
                </div>

                <div className="prediction-details">
                  <div className="detail-item">
                    <span className="label">Текущий остаток:</span>
                    <span className="value">{currentStock} шт.</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Прогноз исчерпания:</span>
                    <span className="value critical-date">
                      {formatDate(predictionDate)} ({daysUntilStockout} дней)
                    </span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Рекомендуемый заказ:</span>
                    <span className="value recommend">{recommendedOrder} шт.</span>
                  </div>

                  <div className="detail-item">
                    <span className="label">Средний расход:</span>
                    <span className="value">{Number(avgConsumption).toFixed(1)} шт./день</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;