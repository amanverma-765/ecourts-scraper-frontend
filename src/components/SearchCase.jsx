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
          <input
            type="text"
            value={cnr}
            onChange={(e) => setCnr(e.target.value)}
            placeholder="Enter CNR Number (e.g., UPBL060053572018)"
            className="search-input"
            disabled={loading}
          />
          <button type="submit" className="search-button" disabled={loading}>
            {loading ? '🔄 Searching...' : '🔍 Search'}
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
                      <div className="party-card-header">
                        <h4>👤 Petitioner / Plaintiff</h4>
                        {caseData.lpet_name && <span className="local-label">वादी</span>}
                      </div>
                      <div className="party-details">
                        {caseData.petNameAdd ? (
                          <div dangerouslySetInnerHTML={{ __html: caseData.petNameAdd }} className="party-html-content" />
                        ) : (
                          <>
                            <div className="party-name">{caseData.pet_name || caseData.petparty_name}</div>
                            {caseData.pet_adv && (
                              <div className="advocate-info">
                                <span className="advocate-label">Advocate:</span>
                                <span className="advocate-name">{caseData.pet_adv}</span>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    </div>

                    <div className="vs-divider">
                      <span>VS</span>
                    </div>

                    <div className="party-card respondent">
                      <div className="party-card-header">
                        <h4>👤 Respondent / Defendant</h4>
                        {caseData.lres_name && <span className="local-label">प्रतिवादी</span>}
                      </div>
                      <div className="party-details">
                        {caseData.resNameAdd ? (
                          <div dangerouslySetInnerHTML={{ __html: caseData.resNameAdd }} className="party-html-content" />
                        ) : (
                          <>
                            <div className="party-name">{caseData.res_name || caseData.resparty_name}</div>
                            {caseData.res_adv && caseData.res_adv !== '' && (
                              <div className="advocate-info">
                                <span className="advocate-label">Advocate:</span>
                                <span className="advocate-name">{caseData.res_adv}</span>
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
