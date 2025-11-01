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
      const response = await axios.get('http://localhost:8000/api/warehouse/predictions/');
      console.log('Predictions from server:', response.data.predictions);
      setPredictions(response.data.predictions);
      setLastUpdate(response.data.last_update || new Date().toISOString());
    } catch (err) {
      console.error(err);
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
      console.log('Updated predictions:', response.data.predictions);
      setPredictions(response.data.predictions);
      setLastUpdate(new Date().toISOString());
      alert(`Прогнозы обновлены! Рассчитано: ${response.data.total_calculated}`);
    } catch (err) {
      setError('Ошибка обновления прогнозов');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Форматирование даты
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
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
          {predictions.map((pred) => (
            <div
              key={pred.product_id + pred.prediction_date}
              className={`prediction-card ${pred.days_until_stockout <= 2 ? 'critical' : ''}`}
            >
              <div className="prediction-header">
                <span className="product-name">{pred.product_id}</span>
                {pred.days_until_stockout <= 2 && (
                  <span className="critical-badge">Критично</span>
                )}
              </div>

              <div className="prediction-details">
                <div className="detail-item">
                  <span className="label">Текущий остаток:</span>
                  <span className="value">{pred.metrics.current_stock} шт.</span>
                </div>

                <div className="detail-item">
                  <span className="label">Прогноз исчерпания:</span>
                  <span className="value critical-date">
                    {formatDate(pred.prediction_date)} ({pred.days_until_stockout} дней)
                  </span>
                </div>

                <div className="detail-item">
                  <span className="label">Рекомендуемый заказ:</span>
                  <span className="value recommend">{pred.recommended_order_quantity} шт.</span>
                </div>

                <div className="detail-item">
                  <span className="label">Средний расход:</span>
                  <span className="value">{pred.metrics.avg_daily_consumption} шт./день</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PredictiveAnalytics;
