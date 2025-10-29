import { useEffect, useState } from "react";
import axios from "axios";
import Header from "../components/Header";
import Navigation from "../components/Navigation";


export default function InventoryHistoryPage() {
  const [items, setItems] = useState([]);
  const [summary, setSummary] = useState({});
  const [pagination, setPagination] = useState({});
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [filters, setFilters] = useState({
    from: "",
    to: "",
    zone: "",
    status: "all",
    search: "",
  });
  const [sort, setSort] = useState({ field: "scanned_at", direction: "desc" });
  const [selected, setSelected] = useState([]); // массив объектов {id, source}
  const [selectAll, setSelectAll] = useState(false);
  const [showTrendModal, setShowTrendModal] = useState(false);
  const selectedProductIds = selected.map(s => items.find(i => i.id === s.id && i.source === s.source)?.product_id).filter(Boolean);


  useEffect(() => {
    fetchData();
  }, [page, filters, sort]);

  const fetchData = async () => {
    try {
      const params = {
        page,
        page_size: pageSize,
        ...filters,
        ordering: sort.direction === "asc" ? sort.field : `-${sort.field}`,
      };
      const res = await axios.get("http://localhost:8000/api/inventory/history/", { params });
      // добавляем уникальный локальный id для каждой строки
      setItems(res.data.items.map((i, idx) => ({ ...i, id: idx + 1 })));
      setSummary(res.data.summary);
      setPagination(res.data.pagination);
    } catch (err) {
      console.error("Ошибка загрузки данных:", err);
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
      const exists = prev.some(s => s.id === item.id && s.source === item.source);
      if (exists) {
        return prev.filter(s => !(s.id === item.id && s.source === item.source));
      } else {
        return [...prev, { id: item.id, source: item.source }];
      }
    });
  };

  const handleSelectAllPage = () => {
    const pageItems = items.map(item => ({ id: item.id, source: item.source }));
    const allSelected = pageItems.every(pi => selected.some(s => s.id === pi.id && s.source === pi.source));
    if (allSelected) {
      setSelected(prev => prev.filter(s => !pageItems.some(pi => pi.id === s.id && pi.source === s.source)));
    } else {
      setSelected(prev => [
        ...prev,
        ...pageItems.filter(pi => !prev.some(s => s.id === pi.id && s.source === pi.source))
      ]);
    }
  };

  const handleSelectAllTable = () => {
    setSelectAll(prev => !prev);
    if (!selectAll) {
      setSelected([]); // при выборе всех очищаем локальный selected
    }
  };

  const handleResetSelection = () => {
    setSelected([]);
    setSelectAll(false);
  };

  const exportData = async (format) => {
    try {
      if (!selected.length && !selectAll) {
        alert("Выберите хотя бы одну запись для экспорта!");
        return;
      }

      const payload = selectAll
        ? { all: true, filters }
        : { selected };

      const res = await axios.post(
        `http://localhost:8000/api/inventory/export/${format}/`,
        payload,
        { responseType: "blob" }
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
      alert("Ошибка при экспорте данных!");
    }
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
                    checked={selectAll}
                    onChange={handleSelectAllTable}
                    title={selectAll ? "Снять выделение со всех записей" : "Выбрать все записи в таблице"}
                  />
                </th>
                <th onClick={() => handleSort("product_id")} style={{ cursor: "pointer" }}>ID {getSortSymbol("product_id")}</th>
                <th onClick={() => handleSort("scanned_at")} style={{ cursor: "pointer" }}>Дата {getSortSymbol("scanned_at")}</th>
                <th onClick={() => handleSort("zone")} style={{ cursor: "pointer" }}>Зона {getSortSymbol("zone")}</th>
                <th onClick={() => handleSort("product_name")} style={{ cursor: "pointer" }}>Товар {getSortSymbol("product_name")}</th>
                <th onClick={() => handleSort("quantity")} style={{ cursor: "pointer" }}>Кол-во {getSortSymbol("quantity")}</th>
                <th onClick={() => handleSort("status")} style={{ cursor: "pointer" }}>Статус {getSortSymbol("status")}</th>
                <th>Источник</th>
              </tr>
            </thead>
            <tbody>
              {items.length ? (
                items.map((item) => (
                  <tr key={`${item.id}_${item.source}`}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectAll || selected.some(s => s.id === item.id && s.source === item.source)}
                        onChange={() => handleSelect(item)}
                      />
                    </td>
                    <td>{item.product_id}</td>
                    <td>{new Date(item.scanned_at).toLocaleString()}</td>
                    <td>{item.zone}</td>
                    <td>{item.product_name}</td>
                    <td>{item.quantity}</td>
                    <td>{item.status}</td>
                    <td>{item.source}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center">Нет данных</td>
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

          <p className="mb-0">
            Выбрано: <strong>{selectAll ? summary.total_checks : selected.length}</strong>
          </p>

          <div>
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
            <p>Всего проверок: <strong>{summary.total_checks}</strong></p>
            <p>Уникальных товаров: <strong>{summary.unique_products}</strong></p>
            <p>Несоответствий: <strong>{summary.discrepancies}</strong></p>
            <p>Среднее время на зону: <strong>{summary.avg_time_per_zone}</strong></p>
          </div>
        </div>
      </div>
    </>
  );
}
