import React, { useContext } from "react";
import { AuthContext } from "../context/AuthContext";

const styles = {
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "15px 20px",
    backgroundColor: "#fff",
    borderBottom: "1px solid #e0e0e0",
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  logoSection: {
    display: "flex",
    alignItems: "center",
    gap: "20px",
  },
  logo: {
    height: "40px",
  },
  title: {
    fontSize: "20px",
    fontWeight: "bold",
    color: "#333",
    margin: 0,
  },
  userSection: {
    display: "flex",
    alignItems: "center",
    gap: "15px",
  },
  userInfo: {
    textAlign: "right",
  },
  userName: {
    fontWeight: "bold",
    color: "#333",
    margin: 0,
  },
  userRole: {
    color: "#666",
    fontSize: "12px",
    margin: 0,
  },
  logoutButton: {
    backgroundColor: "#dc3545",
    color: "white",
    border: "none",
    padding: "8px 16px",
    borderRadius: "4px",
    cursor: "pointer",
    fontSize: "14px",
  },
};

export default function Header() {
  const { user, logout } = useContext(AuthContext);

  return (
    <header style={styles.header}>
      <div style={styles.logoSection}>
        <img
          src="rtk_logo.png"
          alt="Ростелеком"
          style={styles.logo}
          onError={(e) => {
            e.target.style.display = "none";
            e.target.nextSibling.style.display = "block";
          }}
        />
        <div
          style={{
            display: "none",
            fontSize: "20px",
            fontWeight: "bold",
            color: "#1976d2",
          }}
        >
          Ростелеком
        </div>
        <h1 style={styles.title}>Умный склад</h1>
      </div>

      <div style={styles.userSection}>
        <div style={styles.userInfo}>
          <p style={styles.userName}>{user?.name || "Администратор"}</p>
          <p style={styles.userRole}>{user?.role || "Оператор"}</p>
        </div>
        <button style={styles.logoutButton} onClick={logout}>
          Выход
        </button>
      </div>
    </header>
  );
}
