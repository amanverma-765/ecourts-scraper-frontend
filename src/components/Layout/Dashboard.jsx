import { useState, useEffect } from 'react';
import './Dashboard.css';

const Dashboard = ({ children, activeTab, onTabChange }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Automatically close sidebar on mobile screens
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      } else {
        setSidebarOpen(true);
      }
    };

    // Set initial state
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const menuItems = [
    { id: 'search-case', label: 'Search Case Details', icon: '📋' },
    { id: 'cause-list', label: 'Cause List', icon: '📅' },
  ];

  const handleTabChange = (tabId) => {
    onTabChange(tabId);
    // Auto-close sidebar on mobile after selecting a tab
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

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
          {sidebarOpen && (
            <div className="sidebar-brand">
              <span className="brand-icon">⚖️</span>
              <div className="brand-text">
                <div className="brand-title">E-Court</div>
                <div className="brand-subtitle">Management</div>
              </div>
            </div>
          )}
          <nav className="sidebar-nav">
            {menuItems.map((item) => (
              <button
                key={item.id}
                className={`nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => handleTabChange(item.id)}
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
