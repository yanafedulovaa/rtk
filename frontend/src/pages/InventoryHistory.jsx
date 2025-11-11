import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Navigation from "../components/Navigation";
import InventoryTrendModal from "../components/InventoryTrendModal";

export default function InventoryHistoryPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    zone: "",
    status: "all",
    search: "",
  });
  const [sort, setSort] = useState({ field: "scanned_at", direction: "desc" });
  const [selected, setSelected] = useState([]);
  const [selectAll, setSelectAll] = useState(false);

  // Новые состояния для графика
  const [showTrendModal, setShowTrendModal] = useState(false);

  // Функция для получения токена
  const getAuthToken = () => {
    return localStorage.getItem('access')
  };

    useEffect(() => {
      fetchData();
    }, [page, filters, sort, pageSize]);

  const fetchData = async () => {
    try {
      const token = getAuthToken();

      const params = {
        page,
        page_size: pageSize,
        ...filters,
        ordering: sort.direction === "asc" ? sort.field : `-${sort.field}`,
      };

      const config = token ? {
        params,
        headers: {
          'Authorization': `Bearer ${token}`
        }
      } : { params };

      const res = await axios.get("http://185.146.3.192/api/inventory/history/", config);

      setItems(res.data.items.map((i) => ({
        ...i,
        uniqueId: `${i.product_id}_${i.scanned_at}_${i.source}`,
        id: i.id,
      })));

      setSummary(res.data.summary);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
      if (err.response?.status === 401) {
        alert("Ошибка авторизации. Пожалуйста, войдите в систему.");
      }
    }
  };

  const handleInputChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
    setPage(1);
  };

  const handleSort = (field) => {
    setSort((prev) => {
      const direction = prev.field === field && prev.direction === "asc" ? "desc" : "asc";
      return { field, direction };
    });
  };

  const getSortSymbol = (field) => {
    if (sort.field !== field) return "";
    return sort.direction === "asc" ? "▲" : "▼";
  };

  const handleSelect = (item) => {
    setSelected((prev) => {
      const exists = prev.includes(item.uniqueId);
      if (exists) {
        return prev.filter(id => id !== item.uniqueId);
      } else {
        return [...prev, item.uniqueId];
      }
    });
  };

  const handleSelectAllPage = () => {
    const pageIds = items.map(item => item.uniqueId);
    const allSelected = pageIds.every(id => selected.includes(id));

    if (allSelected) {
      setSelected(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelected(prev => [
        ...prev,
        ...pageIds.filter(id => !prev.includes(id))
      ]);
    }
  };

  const handleSelectAllTable = () => {
    const newSelectAll = !selectAll;
    setSelectAll(newSelectAll);

    if (newSelectAll) {
      setSelected([]);
    } else {
      setSelected([]);
    }
  };

  const handleResetSelection = () => {
    setSelected([]);
    setSelectAll(false);
  };

  const isItemSelected = (item) => {
    if (selectAll) return true;
    return selected.includes(item.uniqueId);
  };

  const isAllPageSelected = () => {
    if (selectAll) return true;
    const pageIds = items.map(item => item.uniqueId);
    return pageIds.length > 0 && pageIds.every(id => selected.includes(id));
  };

  const exportData = async (format) => {
    try {
      const token = getAuthToken();
      const isAll = selectAll;

      if (!selected.length && !isAll) {
        alert("Выберите хотя бы одну запись для экспорта!");
        return;
      }

      const payload = isAll
        ? { all: true, filters }
        : {
            selected: selected.map(uniqueId => {
              const item = items.find(i => i.uniqueId === uniqueId);
              return item ? { id: item.id, source: item.source } : null;
            }).filter(Boolean)
          };

      const config = {
        responseType: "blob"
      };

      if (token) {
        config.headers = {
          'Authorization': `Bearer ${token}`
        };
      }

      const res = await axios.post(
        `http://185.146.3.192/api/inventory/export/${format}/`,
        payload,
        config
      );

      const blob = new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `inventory_export.${format === "excel" ? "xlsx" : "pdf"}`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Ошибка экспорта:", err);
      if (err.response?.status === 401) {
        alert("Ошибка авторизации. Пожалуйста, войдите в систему.");
      } else {
        alert("Ошибка при экспорте данных!");
      }
    }
  };

  const handleShowTrend = () => {
    const selectedProductIds = selectAll
      ? []
      : [...new Set(selected.map(uniqueId => {
          const item = items.find(i => i.uniqueId === uniqueId);
          return item ? item.product_id : null;
        }).filter(Boolean))];

    setShowTrendModal(true);
  };

  const getSelectedProductIds = () => {
    if (selectAll) return [];
    return [...new Set(selected.map(uniqueId => {
      const item = items.find(i => i.uniqueId === uniqueId);
      return item ? item.product_id : null;
    }).filter(Boolean))];
  };

  return (
    <>
      <Header />
      <Navigation />

      <div className="container my-4">
        <h1 className="mb-4">История инвентаризации</h1>

        {/* ФИЛЬТРЫ */}
        <div className="row g-3 mb-4">
          <div className="col-md-2">
            <input type="date" name="from" value={filters.from} onChange={handleInputChange} className="form-control" placeholder="С"/>
          </div>
          <div className="col-md-2">
            <input type="date" name="to" value={filters.to} onChange={handleInputChange} className="form-control" placeholder="По"/>
          </div>
          <div className="col-md-2">
            <input type="text" name="zone" value={filters.zone} onChange={handleInputChange} className="form-control" placeholder="Зона"/>
          </div>
          <div className="col-md-2">
            <select name="status" value={filters.status} onChange={handleInputChange} className="form-select">
              <option value="all">Все</option>
              <option value="OK">OK</option>
              <option value="LOW_STOCK">LOW_STOCK</option>
              <option value="CRITICAL">CRITICAL</option>
            </select>
          </div>
          <div className="col-md-3">
            <input type="text" name="search" value={filters.search} onChange={handleInputChange} className="form-control" placeholder="Поиск..."/>
          </div>
        </div>

        {/* ТАБЛИЦА */}
        <div className="table-responsive">
          <table className="table table-bordered table-hover">
            <thead className="table-light">
              <tr>
                <th style={{ width: "40px" }}>
                  <input
                    type="checkbox"
                    checked={isAllPageSelected()}
                    onChange={handleSelectAllPage}
                    title="Выбрать все записи на странице"
                  />
                </th>
                <th onClick={() => handleSort("product_id")} style={{ cursor: "pointer" }}>
                  ID {getSortSymbol("product_id")}
                </th>
                <th onClick={() => handleSort("scanned_at")} style={{ cursor: "pointer" }}>
                  Дата {getSortSymbol("scanned_at")}
                </th>
                <th onClick={() => handleSort("zone")} style={{ cursor: "pointer" }}>
                  Зона {getSortSymbol("zone")}
                </th>
                <th onClick={() => handleSort("product_name")} style={{ cursor: "pointer" }}>
                  Товар {getSortSymbol("product_name")}
                </th>
                <th onClick={() => handleSort("expected_quantity")} style={{ cursor: "pointer" }}>
                  Ожидаемое {getSortSymbol("expected_quantity")}
                </th>
                <th onClick={() => handleSort("quantity")} style={{ cursor: "pointer" }}>
                  Фактическое {getSortSymbol("quantity")}
                </th>
                <th onClick={() => handleSort("discrepancy")} style={{ cursor: "pointer" }}>
                  Расхождение {getSortSymbol("discrepancy")}
                </th>
                <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>
                  Статус {getSortSymbol("status")}
                </th>
                <th>Источник</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={`${item.source}_${item.id}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={isItemSelected(item)}
                        onChange={() => handleSelect(item)}
                        disabled={selectAll}
                      />
                    </td>
                    <td>{item.product_id}</td>
                    <td>{new Date(item.scanned_at).toLocaleString()}</td>
                    <td>{item.zone}</td>
                    <td>{item.product_name}</td>
                    <td>{item.expected_quantity ?? '-'}</td>
                    <td>{item.quantity ?? '-'}</td>
                    <td>
                      {item.discrepancy !== null && item.discrepancy !== undefined
                        ? `${item.discrepancy > 0 ? '+' : ''}${item.discrepancy}`
                        : '-'
                      }
                    </td>
                    <td>
                        {item.status}
                    </td>
                    <td>
                        {item.source}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="text-center">Нет данных</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ПАНЕЛЬ ДЕЙСТВИЙ */}
        <div className="d-flex justify-content-between align-items-center my-3">
          <div className="mt-2">
            <button className="btn btn-outline-primary me-2" onClick={handleSelectAllTable}>
              {selectAll ? "Снять выделение со всех записей" : "Выбрать все записи в таблице"}
            </button>
            <button className="btn btn-outline-secondary" onClick={handleResetSelection}>
              Сбросить выбор
            </button>
          </div>
              <div>
            <label className="me-2">Записей на странице:</label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1); // сбрасываем на первую страницу при изменении лимита
              }}
              className="form-select d-inline-block"
              style={{ width: "auto" }}
            >
              <option value="5">5</option>
              <option value="10">10</option>
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
            </select>
          </div>
          <p className="mb-0">
            Выбрано: <strong>{selectAll ? summary.total_checks : selected.length}</strong>
          </p>

          <div>
            <button
              onClick={handleShowTrend}
              className="btn btn-info me-2"
              disabled={!selected.length && !selectAll}
            >
             Построить график
            </button>
            <button
              onClick={() => exportData("excel")}
              className="btn btn-success me-2"
              disabled={!selected.length && !selectAll}
            >
              Экспорт в Excel
            </button>
            <button
              onClick={() => exportData("pdf")}
              className="btn btn-danger"
              disabled={!selected.length && !selectAll}
            >
              Экспорт в PDF
            </button>
          </div>
        </div>

        {/* ПАГИНАЦИЯ */}
        {pagination && (
          <nav aria-label="Page navigation">
            <ul className="pagination justify-content-center">
              <li className={`page-item ${!pagination.has_previous ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setPage(page - 1)}>← Назад</button>
              </li>
              <li className="page-item disabled">
                <span className="page-link">
                  Страница {pagination.page} из {pagination.total_pages}
                </span>
              </li>
              <li className={`page-item ${!pagination.has_next ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setPage(page + 1)}>Вперёд →</button>
              </li>
            </ul>
          </nav>
        )}

        {/* СВОДКА */}
        <div className="card mt-4">
          <div className="card-header">Сводка</div>
          <div className="card-body">
            <div className="row">
              <div className="col-md-3">
                <p className="mb-2">Всего проверок: <strong>{summary.total_checks}</strong></p>
              </div>
              <div className="col-md-3">
                <p className="mb-2">Уникальных товаров: <strong>{summary.unique_products}</strong></p>
              </div>
              <div className="col-md-3">
                <p className="mb-2">
                  Несоответствий:
                  <strong className={summary.discrepancies > 0 ? "text-danger ms-1" : "ms-1"}>
                    {summary.discrepancies}
                  </strong>
                </p>
              </div>
              <div className="col-md-3">
                <p className="mb-2">Среднее время на зону: <strong>{summary.avg_time_per_zone} мин</strong></p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* МОДАЛЬНОЕ ОКНО С ГРАФИКОМ */}
      <InventoryTrendModal
        show={showTrendModal}
        onClose={() => setShowTrendModal(false)}
        selectedProducts={getSelectedProductIds()}
        access={getAuthToken()}
      />
    </>
  );
}