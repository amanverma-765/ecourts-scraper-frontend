import { useState } from 'react';
import { getCaseDetails } from '../services/api';
import './SearchCase.css';

const SearchCase = () => {
  const [cnr, setCnr] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');

  const handleSearch = async (e) => {
    e.preventDefault();
    
    if (!cnr.trim()) {
      setError('Please enter a CNR number');
      return;
    }

    setLoading(true);
    setError('');
    setCaseData(null);

    try {
      const response = await getCaseDetails(cnr.trim());
      
      if (response.status === 'success' && response.data) {
        setCaseData(response.data.history);
        setActiveTab('overview'); // Reset to overview tab
      } else {
        setError('No case found for the given CNR');
      }
    } catch (err) {
      console.error('Error fetching case details:', err);
      if (err.response?.status === 404) {
        setError('Case not found. Please check the CNR number.');
      } else if (err.response?.status === 400) {
        setError('Invalid CNR format. Please enter a valid CNR.');
      } else {
        setError('Failed to fetch case details. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const stripHtmlLinks = (htmlString) => {
    if (!htmlString) return 'N/A';
    // Remove HTML tags but keep the content
    return htmlString.replace(/<[^>]*>/g, '').trim();
  };

  return (
    <div className="search-case">
      <div className="page-header">
        <h2>Search Case Details</h2>
        <p>Enter the CNR (Case Number Reference) to view comprehensive case information</p>
      </div>

      <form onSubmit={handleSearch} className="search-form">
        <div className="search-input-group">
          <div className="search-input-wrapper">
            <svg className="search-input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <input
              type="text"
              value={cnr}
              onChange={(e) => setCnr(e.target.value)}
              placeholder="Enter CNR Number (e.g., UPBL060053572018)"
              className="search-input"
              disabled={loading}
            />
            {cnr && !loading && (
              <button
                type="button"
                className="clear-button"
                onClick={() => {
                  setCnr('');
                  setCaseData(null);
                  setError('');
                }}
                aria-label="Clear search"
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
          </div>
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? (
              <>
                <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                <span>Searching...</span>
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M9 17C13.4183 17 17 13.4183 17 9C17 4.58172 13.4183 1 9 1C4.58172 1 1 4.58172 1 9C1 13.4183 4.58172 17 9 17Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M19 19L14.65 14.65" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span>Search Case</span>
              </>
            )}
          </button>
        </div>
      </form>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {caseData && (
        <div className="case-details-container">
          {/* Case Header with Key Info */}
          <div className="case-header-card">
            <div className="case-header-main">
              <div className="case-title-section">
                <h3>{caseData.type_name || 'Case Details'}</h3>
                {caseData.ltype_name && <p className="case-title-local">{caseData.ltype_name}</p>}
              </div>
              <span className="status-badge-large">
                {caseData.archive === 'N' ? 'Active' : 'Archived'}
              </span>
            </div>
            
            <div className="case-quick-info">
              <div className="quick-info-item">
                <span className="info-label">CNR</span>
                <span className="info-value">{caseData.cino}</span>
              </div>
              <div className="quick-info-item">
                <span className="info-label">Case No</span>
                <span className="info-value">{caseData.case_no}</span>
              </div>
              <div className="quick-info-item">
                <span className="info-label">Filing Date</span>
                <span className="info-value">{formatDate(caseData.date_of_filing)}</span>
              </div>
              <div className="quick-info-item">
                <span className="info-label">Next Hearing</span>
                <span className="info-value highlight">{formatDate(caseData.date_next_list)}</span>
              </div>
            </div>
          </div>

          {/* Tabbed Interface */}
          <div className="case-tabs">
            <div className="tab-buttons">
              <button
                className={`tab-button ${activeTab === 'overview' ? 'active' : ''}`}
                onClick={() => setActiveTab('overview')}
              >
                📋 Overview
              </button>
              <button
                className={`tab-button ${activeTab === 'parties' ? 'active' : ''}`}
                onClick={() => setActiveTab('parties')}
              >
                👥 Parties
              </button>
              <button
                className={`tab-button ${activeTab === 'court' ? 'active' : ''}`}
                onClick={() => setActiveTab('court')}
              >
                ⚖️ Court Details
              </button>
              <button
                className={`tab-button ${activeTab === 'acts' ? 'active' : ''}`}
                onClick={() => setActiveTab('acts')}
              >
                📜 Acts & Sections
              </button>
              <button
                className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
                onClick={() => setActiveTab('history')}
              >
                📅 Hearing History
              </button>
            </div>

            <div className="tab-content">
              {/* Overview Tab */}
              {activeTab === 'overview' && (
                <div className="tab-panel">
                  <div className="info-grid">
                    <div className="info-card">
                      <h4>Case Information</h4>
                      <div className="info-row">
                        <span className="label">CNR Number:</span>
                        <span className="value">{caseData.cino}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Case Number:</span>
                        <span className="value">{caseData.case_no}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Case Type:</span>
                        <span className="value">{caseData.type_name}</span>
                      </div>
                      {caseData.ltype_name && (
                        <div className="info-row">
                          <span className="label">केस प्रकार:</span>
                          <span className="value">{caseData.ltype_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="info-card">
                      <h4>Filing Details</h4>
                      <div className="info-row">
                        <span className="label">Filing Date:</span>
                        <span className="value">{formatDate(caseData.date_of_filing)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Registration Date:</span>
                        <span className="value">{formatDate(caseData.dt_regis)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Filing Number:</span>
                        <span className="value">{caseData.fil_no}/{caseData.fil_year}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Registration Number:</span>
                        <span className="value">{caseData.reg_no}/{caseData.reg_year}</span>
                      </div>
                    </div>

                    <div className="info-card">
                      <h4>Hearing Schedule</h4>
                      <div className="info-row">
                        <span className="label">First Listing:</span>
                        <span className="value">{formatDate(caseData.date_first_list)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Last Listing:</span>
                        <span className="value">{stripHtmlLinks(caseData.last_business_date)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Next Hearing:</span>
                        <span className="value highlight">{formatDate(caseData.date_next_list)}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Purpose:</span>
                        <span className="value">{caseData.purpose_name}</span>
                      </div>
                      {caseData.lpurpose_name && (
                        <div className="info-row">
                          <span className="label">उद्देश्य:</span>
                          <span className="value">{caseData.lpurpose_name}</span>
                        </div>
                      )}
                    </div>

                    <div className="info-card">
                      <h4>Status</h4>
                      <div className="info-row">
                        <span className="label">Archive Status:</span>
                        <span className="value">{caseData.archive === 'N' ? 'Active' : 'Archived'}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Court Number:</span>
                        <span className="value">{caseData.court_no}</span>
                      </div>
                      {caseData.date_of_decision && (
                        <div className="info-row">
                          <span className="label">Decision Date:</span>
                          <span className="value">{formatDate(caseData.date_of_decision)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Parties Tab */}
              {activeTab === 'parties' && (
                <div className="tab-panel">
                  <div className="parties-container">
                    <div className="party-card petitioner">
                      <div className="party-side-badge petitioner-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="party-card-header">
                        <div>
                          <h4>Petitioner / Plaintiff</h4>
                          {caseData.lpet_name && <span className="local-label">वादी</span>}
                        </div>
                      </div>
                      <div className="party-details">
                        {caseData.petNameAdd ? (
                          <div dangerouslySetInnerHTML={{ __html: caseData.petNameAdd }} className="party-html-content" />
                        ) : (
                          <>
                            <div className="party-name">{caseData.pet_name || caseData.petparty_name || 'Not Available'}</div>
                            {caseData.pet_adv && (
                              <div className="advocate-info">
                                <div className="advocate-icon">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                <div>
                                  <span className="advocate-label">Legal Representative</span>
                                  <span className="advocate-name">{caseData.pet_adv}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="vs-divider">
                      <div className="vs-circle">
                        <span>VS</span>
                      </div>
                      <div className="vs-line"></div>
                    </div>

                    <div className="party-card respondent">
                      <div className="party-side-badge respondent-badge">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <path d="M20 21V19C20 17.9391 19.5786 16.9217 18.8284 16.1716C18.0783 15.4214 17.0609 15 16 15H8C6.93913 15 5.92172 15.4214 5.17157 16.1716C4.42143 16.9217 4 17.9391 4 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          <path d="M12 11C14.2091 11 16 9.20914 16 7C16 4.79086 14.2091 3 12 3C9.79086 3 8 4.79086 8 7C8 9.20914 9.79086 11 12 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </div>
                      <div className="party-card-header">
                        <div>
                          <h4>Respondent / Defendant</h4>
                          {caseData.lres_name && <span className="local-label">प्रतिवादी</span>}
                        </div>
                      </div>
                      <div className="party-details">
                        {caseData.resNameAdd ? (
                          <div dangerouslySetInnerHTML={{ __html: caseData.resNameAdd }} className="party-html-content" />
                        ) : (
                          <>
                            <div className="party-name">{caseData.res_name || caseData.resparty_name || 'Not Available'}</div>
                            {caseData.res_adv && caseData.res_adv !== '' && (
                              <div className="advocate-info">
                                <div className="advocate-icon">
                                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M17 21V19C17 17.9391 16.5786 16.9217 15.8284 16.1716C15.0783 15.4214 14.0609 15 13 15H5C3.93913 15 2.92172 15.4214 2.17157 16.1716C1.42143 16.9217 1 17.9391 1 19V21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M9 11C11.2091 11 13 9.20914 13 7C13 4.79086 11.2091 3 9 3C6.79086 3 5 4.79086 5 7C5 9.20914 6.79086 11 9 11Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M23 21V19C22.9993 18.1137 22.7044 17.2528 22.1614 16.5523C21.6184 15.8519 20.8581 15.3516 20 15.13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                    <path d="M16 3.13C16.8604 3.35031 17.623 3.85071 18.1676 4.55232C18.7122 5.25392 19.0078 6.11683 19.0078 7.005C19.0078 7.89318 18.7122 8.75608 18.1676 9.45769C17.623 10.1593 16.8604 10.6597 16 10.88" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                                  </svg>
                                </div>
                                <div>
                                  <span className="advocate-label">Legal Representative</span>
                                  <span className="advocate-name">{caseData.res_adv}</span>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Court Details Tab */}
              {activeTab === 'court' && (
                <div className="tab-panel">
                  <div className="info-grid">
                    <div className="info-card">
                      <h4>Court Information</h4>
                      <div className="info-row">
                        <span className="label">Court Name:</span>
                        <span className="value">{caseData.court_name}</span>
                      </div>
                      {caseData.lcourt_name && (
                        <div className="info-row">
                          <span className="label">न्यायालय नाम:</span>
                          <span className="value">{caseData.lcourt_name}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">Establishment Code:</span>
                        <span className="value">{caseData.est_code}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Court Code:</span>
                        <span className="value">{caseData.court_code}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Complex Code:</span>
                        <span className="value">{caseData.complex_code}</span>
                      </div>
                    </div>

                    <div className="info-card">
                      <h4>Judge/Designation</h4>
                      <div className="info-row">
                        <span className="label">Designation:</span>
                        <span className="value">{caseData.desgname}</span>
                      </div>
                      {caseData.ldesgname && (
                        <div className="info-row">
                          <span className="label">पदनाम:</span>
                          <span className="value">{caseData.ldesgname}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">Court Number:</span>
                        <span className="value">{caseData.courtno}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Designation Code:</span>
                        <span className="value">{caseData.desgcode}</span>
                      </div>
                    </div>

                    <div className="info-card">
                      <h4>Location</h4>
                      <div className="info-row">
                        <span className="label">State:</span>
                        <span className="value">{caseData.state_name}</span>
                      </div>
                      {caseData.lstate_name && (
                        <div className="info-row">
                          <span className="label">राज्य:</span>
                          <span className="value">{caseData.lstate_name}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">District:</span>
                        <span className="value">{caseData.district_name}</span>
                      </div>
                      {caseData.ldistrict_name && (
                        <div className="info-row">
                          <span className="label">जिला:</span>
                          <span className="value">{caseData.ldistrict_name}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">State Code:</span>
                        <span className="value">{caseData.state_code}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">District Code:</span>
                        <span className="value">{caseData.district_code}</span>
                      </div>
                    </div>

                    <div className="info-card">
                      <h4>System Information</h4>
                      <div className="info-row">
                        <span className="label">Version:</span>
                        <span className="value">{caseData.version}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Case Type Code:</span>
                        <span className="value">{caseData.regcase_type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Acts & Sections Tab */}
              {activeTab === 'acts' && (
                <div className="tab-panel">
                  {caseData.act ? (
                    <div className="acts-section">
                      <h4>Acts and Sections Applied</h4>
                      <div
                        className="acts-table-container"
                        dangerouslySetInnerHTML={{ __html: caseData.act }}
                      />
                    </div>
                  ) : (
                    <div className="empty-tab-state">
                      <div className="empty-icon">📜</div>
                      <p>No act or section information available for this case</p>
                    </div>
                  )}
                </div>
              )}

              {/* Hearing History Tab */}
              {activeTab === 'history' && (
                <div className="tab-panel">
                  {caseData.historyOfCaseHearing ? (
                    <div className="hearing-history-section">
                      <h4>Complete Hearing History</h4>
                      <div
                        className="hearing-table-container"
                        dangerouslySetInnerHTML={{ __html: caseData.historyOfCaseHearing }}
                      />
                    </div>
                  ) : (
                    <div className="empty-tab-state">
                      <div className="empty-icon">📅</div>
                      <p>No hearing history available for this case</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {!caseData && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">📋</div>
          <h3>No Case Details</h3>
          <p>Enter a CNR number above to search for case details</p>
        </div>
      )}
    </div>
  );
};

export default SearchCase;
