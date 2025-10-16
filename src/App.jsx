import { useState, useEffect } from 'react';
import Dashboard from './components/Layout/Dashboard';
import SearchCase from './components/SearchCase';
import CauseList from './components/CauseList';
import { initializeToken } from './services/api';
import './App.css';

function App() {
  const [activeTab, setActiveTab] = useState('search-case');
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState(false);

  useEffect(() => {
    // Initialize token on app startup
    const init = async () => {
      try {
        const success = await initializeToken();
        if (!success) {
          setInitError(true);
        }
      } catch (error) {
        console.error('Failed to initialize app:', error);
        setInitError(true);
      } finally {
        setIsInitializing(false);
      }
    };

    init();
  }, []);

  if (isInitializing) {
    return (
      <div className="app-loading">
        <div className="loading-spinner"></div>
        <p>Initializing E-Court Management System...</p>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="app-error">
        <div className="error-icon">⚠️</div>
        <h2>Connection Error</h2>
        <p>Failed to connect to the API server.</p>
        <p>Please make sure the backend server is running at http://localhost:8000</p>
        <button onClick={() => window.location.reload()} className="retry-button">
          Retry
        </button>
      </div>
    );
  }

  return (
    <Dashboard activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'search-case' && <SearchCase />}
      {activeTab === 'cause-list' && <CauseList />}
    </Dashboard>
  );
}

export default App;
