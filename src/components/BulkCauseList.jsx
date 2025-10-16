import { useState, useEffect } from 'react';
import {
  getStates,
  getDistricts,
  getCourtComplex,
  getCourtNames,
  getCauseList,
  parseCourtNames,
} from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './BulkCauseList.css';

const BulkCauseList = () => {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [courtComplexes, setCourtComplexes] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCourtComplexCode, setSelectedCourtComplexCode] = useState('');
  const [causeListType, setCauseListType] = useState('CIVIL');
  const [selectedDate, setSelectedDate] = useState('');

  const [courtCards, setCourtCards] = useState([]); // Array of court cards with data
  const [loading, setLoading] = useState(false);
  const [fetchingCauseLists, setFetchingCauseLists] = useState(false);
  const [error, setError] = useState('');

  // Load states on mount
  useEffect(() => {
    loadStates();
    // Set today's date as default
    const today = new Date();
    const formattedDate = formatDateForInput(today);
    setSelectedDate(formattedDate);
  }, []);

  const formatDateForInput = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const formatDateForAPI = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const hasTableData = (htmlContent) => {
    if (!htmlContent) return false;
    
    try {
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(htmlContent, 'text/html');
      const tables = htmlDoc.querySelectorAll('table');
      
      if (tables.length === 0) return false;
      
      const table = tables[0];
      const bodyRows = table.querySelectorAll('tbody tr, tr');
      
      // Check if there are any data rows (excluding header rows and colspan rows)
      let dataRowCount = 0;
      bodyRows.forEach((tr, index) => {
        const isHeaderRow = tr.querySelectorAll('th').length > 0 && index === 0;
        const hasColspan = tr.querySelector('td[colspan]');
        const cells = tr.querySelectorAll('td');
        
        if (!isHeaderRow && !hasColspan && cells.length > 0) {
          dataRowCount++;
        }
      });
      
      return dataRowCount > 0;
    } catch (error) {
      console.error('Error checking table data:', error);
      return false;
    }
  };

  const loadStates = async () => {
    try {
      const response = await getStates();
      if (response.status === 'success' && response.data?.states) {
        setStates(response.data.states);
      }
    } catch (err) {
      console.error('Error loading states:', err);
      setError('Failed to load states');
    }
  };

  const handleStateChange = async (stateCode) => {
    setSelectedState(stateCode);
    setSelectedDistrict('');
    setSelectedCourtComplexCode('');
    setDistricts([]);
    setCourtComplexes([]);
    setCourtCards([]);
    setError('');

    if (stateCode) {
      try {
        const response = await getDistricts(stateCode);
        if (response.status === 'success' && response.data?.districts) {
          setDistricts(response.data.districts);
        }
      } catch (err) {
        console.error('Error loading districts:', err);
        setError('Failed to load districts');
      }
    }
  };

  const handleDistrictChange = async (districtCode) => {
    setSelectedDistrict(districtCode);
    setSelectedCourtComplexCode('');
    setCourtComplexes([]);
    setCourtCards([]);
    setError('');

    if (districtCode) {
      try {
        const response = await getCourtComplex(selectedState, districtCode);
        if (response.status === 'success' && response.data?.courtComplex) {
          setCourtComplexes(response.data.courtComplex);
        }
      } catch (err) {
        console.error('Error loading court complexes:', err);
        setError('Failed to load court complexes');
      }
    }
  };

  const handleCourtComplexChange = (complexCodes) => {
    setSelectedCourtComplexCode(complexCodes);
    setCourtCards([]);
    setError('');
  };

  const fetchAllCauseLists = async () => {
    if (!selectedState || !selectedDistrict || !selectedCourtComplexCode) {
      setError('Please select state, district, and court complex');
      return;
    }

    if (!selectedDate) {
      setError('Please select a date');
      return;
    }

    setLoading(true);
    setFetchingCauseLists(true);
    setError('');
    setCourtCards([]);

    try {
      // First, get all court names
      const response = await getCourtNames(
        selectedState,
        selectedDistrict,
        selectedCourtComplexCode
      );

      if (response.status === 'success' && response.data?.courtNames) {
        const parsedCourts = parseCourtNames(response.data.courtNames);
        
        // Initialize cards with loading state
        const initialCards = parsedCourts.map((court) => ({
          court,
          status: 'loading', // 'loading', 'success', 'error', 'no-data'
          causeListHtml: null,
          error: null,
        }));
        
        setCourtCards(initialCards);
        setLoading(false);

        // Fetch cause lists for each court in background
        const dateForAPI = formatDateForAPI(selectedDate);
        
        for (let i = 0; i < parsedCourts.length; i++) {
          const court = parsedCourts[i];
          
          try {
            const causeListResponse = await getCauseList({
              stateCode: selectedState,
              districtCode: selectedDistrict,
              courtCode: court.courtCode,
              courtNumber: court.courtNumber,
              causeListType: causeListType,
              date: dateForAPI,
            });

            if (
              causeListResponse.status === 'success' &&
              causeListResponse.data?.cases
            ) {
              const htmlContent = causeListResponse.data.cases;
              const hasData = hasTableData(htmlContent);

              setCourtCards((prev) =>
                prev.map((card, index) =>
                  index === i
                    ? {
                        ...card,
                        status: hasData ? 'success' : 'no-data',
                        causeListHtml: hasData ? htmlContent : null,
                      }
                    : card
                )
              );
            } else {
              setCourtCards((prev) =>
                prev.map((card, index) =>
                  index === i
                    ? { ...card, status: 'no-data', causeListHtml: null }
                    : card
                )
              );
            }
          } catch (err) {
            console.error(`Error fetching cause list for ${court.name}:`, err);
            setCourtCards((prev) =>
              prev.map((card, index) =>
                index === i
                  ? {
                      ...card,
                      status: 'error',
                      error: err.message || 'Failed to fetch cause list',
                    }
                  : card
              )
            );
          }

          // Add small delay between requests
          if (i < parsedCourts.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        }

        setFetchingCauseLists(false);
      } else {
        setError('No courts found for the selected complex');
        setLoading(false);
        setFetchingCauseLists(false);
      }
    } catch (err) {
      console.error('Error fetching court names:', err);
      setError('Failed to load courts');
      setLoading(false);
      setFetchingCauseLists(false);
    }
  };

  const downloadPDF = (card) => {
    if (!card.causeListHtml || card.status !== 'success') return;

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();

      // Add header
      pdf.setFontSize(16);
      pdf.text('Cause List', pageWidth / 2, 15, { align: 'center' });
      pdf.setFontSize(10);
      pdf.text(`${card.court.name}`, pageWidth / 2, 22, { align: 'center' });
      pdf.text(`Date: ${selectedDate}`, pageWidth / 2, 28, { align: 'center' });
      pdf.text(`Type: ${causeListType}`, pageWidth / 2, 34, { align: 'center' });

      // Parse HTML table
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = card.causeListHtml;
      const table = tempDiv.querySelector('table');

      if (table) {
        autoTable(pdf, {
          html: table,
          startY: 40,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          margin: { top: 40, left: 10, right: 10 },
        });
      }

      // Save PDF
      const fileName = `CauseList_${card.court.name.replace(
        /[^a-zA-Z0-9]/g,
        '_'
      )}_${selectedDate}.pdf`;
      pdf.save(fileName);
    } catch (err) {
      console.error('Error generating PDF:', err);
      alert('Failed to generate PDF');
    }
  };

  return (
    <div className="bulk-cause-list">
      <div className="page-header">
        <h2>📦 Bulk Cause List Download</h2>
        <p className="page-description">
          Fetch cause lists for all courts in a complex at once
        </p>
      </div>

      <div className="form-container">
        <div className="form-card">
          <div className="form-grid">
            <div className="form-group">
              <label>State *</label>
              <select
                value={selectedState}
                onChange={(e) => handleStateChange(e.target.value)}
                className="form-control"
                disabled={loading || fetchingCauseLists}
              >
                <option value="">Select State</option>
                {states.map((state) => (
                  <option key={state.state_code} value={state.state_code}>
                    {state.state_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>District *</label>
              <select
                value={selectedDistrict}
                onChange={(e) => handleDistrictChange(e.target.value)}
                className="form-control"
                disabled={!selectedState || loading || fetchingCauseLists}
              >
                <option value="">Select District</option>
                {districts.map((district) => (
                  <option
                    key={district.dist_code}
                    value={district.dist_code}
                  >
                    {district.dist_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Court Complex *</label>
              <select
                value={selectedCourtComplexCode}
                onChange={(e) => handleCourtComplexChange(e.target.value)}
                className="form-control"
                disabled={!selectedDistrict || loading || fetchingCauseLists}
              >
                <option value="">Select Court Complex</option>
                {courtComplexes.map((complex) => (
                  <option key={complex.complex_code} value={complex.njdg_est_code}>
                    {complex.court_complex_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Cause List Type *</label>
              <select
                value={causeListType}
                onChange={(e) => setCauseListType(e.target.value)}
                className="form-control"
                disabled={loading || fetchingCauseLists}
              >
                <option value="CIVIL">Civil</option>
                <option value="CRIMINAL">Criminal</option>
              </select>
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="form-control"
                disabled={loading || fetchingCauseLists}
              />
            </div>

            <div className="form-group action-group">
              <button
                onClick={fetchAllCauseLists}
                className="btn-primary btn-fetch"
                disabled={
                  !selectedState ||
                  !selectedDistrict ||
                  !selectedCourtComplexCode ||
                  !selectedDate ||
                  loading ||
                  fetchingCauseLists
                }
              >
                {loading || fetchingCauseLists ? '⏳ Fetching...' : '🔍 Get Cause Lists'}
              </button>
            </div>
          </div>

          {error && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {error}
            </div>
          )}
        </div>
      </div>

      {/* Court Cards */}
      {courtCards.length > 0 && (
        <div className="cards-container">
          <div className="cards-header">
            <h3>
              📋 Courts ({courtCards.filter((c) => c.status === 'success').length}/
              {courtCards.length} with data)
            </h3>
            {fetchingCauseLists && (
              <span className="fetching-indicator">⏳ Fetching cause lists...</span>
            )}
          </div>

          <div className="cards-grid">
            {courtCards.map((card, index) => (
              <div key={index} className={`court-card card-${card.status}`}>
                <div className="card-header">
                  <h4 className="court-name">{card.court.name}</h4>
                  <span className={`status-badge badge-${card.status}`}>
                    {card.status === 'loading' && '⏳ Loading...'}
                    {card.status === 'success' && '✅ Ready'}
                    {card.status === 'no-data' && '📭 No Data'}
                    {card.status === 'error' && '❌ Error'}
                  </span>
                </div>

                <div className="card-details">
                  <p className="detail-item">
                    <span className="detail-label">Court Code:</span>
                    <span className="detail-value">{card.court.courtCode}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">Court Number:</span>
                    <span className="detail-value">{card.court.courtNumber}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">Type:</span>
                    <span className="detail-value">{causeListType}</span>
                  </p>
                  <p className="detail-item">
                    <span className="detail-label">Date:</span>
                    <span className="detail-value">{selectedDate}</span>
                  </p>
                </div>

                {card.status === 'error' && (
                  <div className="card-error">
                    <p>{card.error || 'Failed to fetch cause list'}</p>
                  </div>
                )}

                {card.status === 'no-data' && (
                  <div className="card-info">
                    <p>No cause list data available for this date</p>
                  </div>
                )}

                <div className="card-actions">
                  <button
                    onClick={() => downloadPDF(card)}
                    className="btn-download"
                    disabled={card.status !== 'success'}
                  >
                    {card.status === 'success' ? '📥 Download PDF' : '📥 Download'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {courtCards.length === 0 && !loading && !error && (
        <div className="empty-state">
          <div className="empty-icon">📂</div>
          <h3>No Courts Loaded</h3>
          <p>Select state, district, court complex, and date, then click "Get Cause Lists"</p>
        </div>
      )}
    </div>
  );
};

export default BulkCauseList;
