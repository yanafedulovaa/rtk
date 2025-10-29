import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import CsvUploadModal from './CsvUploadModal';
import { useState } from 'react';



const styles = {
  nav: {
    backgroundColor: '#f8f9fa',
    padding: '0 20px',
    borderBottom: '1px solid #e0e0e0'
  },
  navContainer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  navTabs: {
    display: 'flex',
    listStyle: 'none',
    margin: 0,
    padding: 0
  },
  navItem: {
    padding: '15px 20px',
    cursor: 'pointer',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s'
  },
  navItemActive: {
    borderBottomColor: '#1976d2',
    color: '#1976d2',
    fontWeight: 'bold'
  },
  navLink: {
    textDecoration: 'none',
    color: 'inherit'
  },
  csvButton: {
    backgroundColor: '#28a745',
    color: 'white',
    border: 'none',
    padding: '8px 16px',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px'
  }
};

export default function Navigation() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const tabs = [
    { path: '/dashboard', label: 'Текущий мониторинг' },
    { path: '/history', label: 'Исторические данные' }
  ];

  const handleCSVUpload = () => {
  setIsModalOpen(true); // открываем модальное окно
  };

  return (
    <nav style={styles.nav}>
      <div style={styles.navContainer}>
        <ul style={styles.navTabs}>
          {tabs.map(tab => (
            <li
              key={tab.path}
              style={{
                ...styles.navItem,
                ...(location.pathname === tab.path && styles.navItemActive)
              }}
              onClick={() => navigate(tab.path)}
            >
              {tab.label}
            </li>
          ))}
        </ul>

        <button style={styles.csvButton} onClick={handleCSVUpload}>
          Загрузить CSV
        </button>
        <CsvUploadModal
          open={isModalOpen}
          onClose={() => setIsModalOpen(false)}
        />
      </div>
    </nav>
  );
}