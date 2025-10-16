import { useState } from 'react';
import './Dashboard.css';

const Dashboard = ({ children, activeTab, onTabChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const menuItems = [
    { id: 'search-case', label: 'Search Case Details', icon: '📋' },
    { id: 'cause-list', label: 'Cause List', icon: '📅' },
  ];

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-content">
          <button
            className="menu-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <h1 className="header-title">E-Court Management System</h1>
          <div className="header-info">
            <span className="status-indicator"></span>
            <span>Connected</span>
          </div>
        </div>
      </header>

      <div className="dashboard-body">
        {/* Sidebar */}
        <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => onTabChange(item.id)}
              >
                <span className="nav-icon">{item.icon}</span>
                {sidebarOpen && <span className="nav-label">{item.label}</span>}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="main-content">
          <div className="content-wrapper">{children}</div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;
