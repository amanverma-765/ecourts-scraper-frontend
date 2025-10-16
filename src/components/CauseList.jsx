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
import './CauseList.css';

const CauseList = () => {
  const [states, setStates] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [courtComplexes, setCourtComplexes] = useState([]);
  const [courtNames, setCourtNames] = useState([]);

  const [selectedState, setSelectedState] = useState('');
  const [selectedDistrict, setSelectedDistrict] = useState('');
  const [selectedCourtComplexCode, setSelectedCourtComplexCode] = useState(''); // "1,2,3"
  const [selectedCourt, setSelectedCourt] = useState(null); // Full court object with courtCode, courtNumber, name
  const [causeListType, setCauseListType] = useState('CIVIL');
  const [selectedDate, setSelectedDate] = useState('');

  const [causeListData, setCauseListData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notFound, setNotFound] = useState(false);
  const [downloadingPDF, setDownloadingPDF] = useState(false);

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

  const hasTableData = () => {
    if (!causeListData) return false;
    
    try {
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(causeListData, 'text/html');
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
    setSelectedCourt(null);
    setDistricts([]);
    setCourtComplexes([]);
    setCourtNames([]);
    setCauseListData(null);
    setNotFound(false);

    if (!stateCode) return;

    try {
      const response = await getDistricts(stateCode);
      if (response.status === 'success' && response.data?.districts) {
        setDistricts(response.data.districts);
      }
    } catch (err) {
      console.error('Error loading districts:', err);
      setError('Failed to load districts');
    }
  };

  const handleDistrictChange = async (districtCode) => {
    setSelectedDistrict(districtCode);
    setSelectedCourtComplexCode('');
    setSelectedCourt(null);
    setCourtComplexes([]);
    setCourtNames([]);
    setCauseListData(null);
    setNotFound(false);

    if (!districtCode || !selectedState) return;

    try {
      const response = await getCourtComplex(selectedState, districtCode);
      if (response.status === 'success' && response.data?.courtComplex) {
        setCourtComplexes(response.data.courtComplex);
      }
    } catch (err) {
      console.error('Error loading court complex:', err);
      setError('Failed to load court complexes');
    }
  };

  const handleCourtComplexChange = async (courtComplexCode) => {
    console.log('Court Complex Selected - Complex Code:', courtComplexCode);
    setSelectedCourtComplexCode(courtComplexCode);
    setSelectedCourt(null);
    setCourtNames([]);
    setCauseListData(null);
    setNotFound(false);

    if (!courtComplexCode || !selectedDistrict || !selectedState) return;

    try {
      const response = await getCourtNames(selectedState, selectedDistrict, courtComplexCode);
      if (response.status === 'success' && response.data?.courtNames) {
        console.log('Raw court names from API:', response.data.courtNames);
        const parsed = parseCourtNames(response.data.courtNames);
        console.log('Parsed court names with codes:', parsed);
        setCourtNames(parsed);
      }
    } catch (err) {
      console.error('Error loading court names:', err);
      setError('Failed to load court names');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!selectedState || !selectedDistrict || !selectedCourtComplexCode || !selectedCourt || !selectedDate) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setCauseListData(null);
    setNotFound(false);

    try {
      console.log('Cause List Request:', {
        stateCode: selectedState,
        districtCode: selectedDistrict,
        courtCode: selectedCourt.courtCode,
        courtNumber: selectedCourt.courtNumber,
        causeListType: causeListType,
        date: formatDateForAPI(selectedDate),
      });

      const response = await getCauseList({
        stateCode: selectedState,
        districtCode: selectedDistrict,
        courtCode: selectedCourt.courtCode,
        courtNumber: selectedCourt.courtNumber,
        causeListType: causeListType,
        date: formatDateForAPI(selectedDate),
      });

      if (response.status === 'success' && response.data) {
        setCauseListData(response.data.cases);
        setNotFound(false);
      } else {
        setNotFound(true);
      }
    } catch (err) {
      console.error('Error fetching cause list:', err);
      if (err.response?.status === 404) {
        setNotFound(true);
      } else if (err.response?.status === 400) {
        setError('Invalid parameters. Please check your selections.');
      } else {
        setError('Failed to fetch cause list. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const generatePDF = () => {
    if (!causeListData || !selectedCourt) return;
    
    setDownloadingPDF(true);
    
    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();

      // Header with professional styling
      pdf.setFillColor(15, 23, 42); // slate-900
      pdf.rect(0, 0, pageWidth, 35, 'F');
      
      // Top accent border
      pdf.setFillColor(16, 185, 129); // emerald-500
      pdf.rect(0, 0, pageWidth, 2, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(20);
      pdf.setFont('helvetica', 'bold');
      pdf.text('DAILY CAUSE LIST', pageWidth / 2, 15, { align: 'center' });
      
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Official Court Document', pageWidth / 2, 23, { align: 'center' });
      
      pdf.setTextColor(0, 0, 0);

      // Court details section
      let yPos = 45;
      
      const courtInfo = [
        ['Court Name', String(selectedCourt.name || 'N/A')],
        ['Court Code', String(selectedCourt.code || 'N/A')],
        ['Date', selectedDate || 'N/A'],
        ['List Type', causeListType || 'N/A']
      ];

      autoTable(pdf, {
        startY: yPos,
        head: [],
        body: courtInfo,
        theme: 'grid',
        styles: { 
          fontSize: 9, 
          cellPadding: 3,
          lineColor: [226, 232, 240],
          lineWidth: 0.5
        },
        columnStyles: {
          0: { 
            fontStyle: 'bold', 
            fillColor: [241, 245, 249], 
            textColor: [71, 85, 105],
            cellWidth: 50
          },
          1: { 
            textColor: [15, 23, 42],
            fontStyle: 'bold'
          }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = pdf.lastAutoTable.finalY + 10;

      // Section header for cases
      pdf.setFillColor(241, 245, 249);
      pdf.rect(10, yPos, pageWidth - 20, 8, 'F');
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.setTextColor(30, 41, 59);
      pdf.text('CASES SCHEDULED', 14, yPos + 6);
      
      yPos += 12;
      pdf.setTextColor(0, 0, 0);

      // Parse HTML table
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = causeListData;
      const table = tempDiv.querySelector('table');

      if (table) {
        autoTable(pdf, {
          html: table,
          startY: yPos,
          theme: 'striped',
          styles: { 
            fontSize: 8, 
            cellPadding: 3,
            overflow: 'linebreak',
            lineColor: [226, 232, 240],
            lineWidth: 0.5
          },
          headStyles: { 
            fillColor: [16, 185, 129],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 9
          },
          alternateRowStyles: { 
            fillColor: [248, 250, 252]
          },
          margin: { left: 14, right: 14 }
        });
      }

      // Footer with page numbers
      const totalPages = pdf.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text(
          `Generated on: ${new Date().toLocaleString('en-IN')}`,
          14,
          pageHeight - 10
        );
        pdf.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save PDF
      const fileName = `CauseList_${selectedCourt.name.replace(
        /[^a-zA-Z0-9]/g,
        '_'
      )}_${selectedDate}.pdf`;
      pdf.save(fileName);
      
      console.log('PDF generated successfully:', fileName);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert(`Failed to generate PDF: ${error.message || 'Please try again.'}`);
    } finally {
      setDownloadingPDF(false);
    }
  };

  return (
    <div className="cause-list">
      <div className="page-header">
        <h2>Cause List Search</h2>
        <p>Search for daily cause lists by selecting court and date</p>
      </div>

      <form onSubmit={handleSearch} className="cause-list-form">
        <div className="form-grid">
          {/* State */}
          <div className="form-group">
            <label>State *</label>
            <select
              value={selectedState}
              onChange={(e) => handleStateChange(e.target.value)}
              className="form-select"
              disabled={loading}
            >
              <option value="">Select State</option>
              {states.map((state) => (
                <option key={state.state_code} value={state.state_code}>
                  {state.state_name}
                </option>
              ))}
            </select>
          </div>

          {/* District */}
          <div className="form-group">
            <label>District *</label>
            <select
              value={selectedDistrict}
              onChange={(e) => handleDistrictChange(e.target.value)}
              className="form-select"
              disabled={!selectedState || loading}
            >
              <option value="">Select District</option>
              {districts.map((district) => (
                <option key={district.dist_code} value={district.dist_code}>
                  {district.dist_name}
                </option>
              ))}
            </select>
          </div>

          {/* Court Complex */}
          <div className="form-group">
            <label>Court Complex *</label>
            <select
              value={selectedCourtComplexCode}
              onChange={(e) => handleCourtComplexChange(e.target.value)}
              className="form-select"
              disabled={!selectedDistrict || loading}
            >
              <option value="">Select Court Complex</option>
              {courtComplexes.map((complex) => (
                <option key={complex.complex_code} value={complex.njdg_est_code}>
                  {complex.court_complex_name}
                </option>
              ))}
            </select>
          </div>

          {/* Court Name */}
          <div className="form-group">
            <label>Court Name *</label>
            <select
              value={selectedCourt?.courtNumber || ''}
              onChange={(e) => {
                const courtNumber = e.target.value;
                const court = courtNames.find(c => c.courtNumber === courtNumber);
                console.log('Court Name Selected:', court);
                setSelectedCourt(court || null);
              }}
              className="form-select"
              disabled={!selectedCourtComplexCode || loading}
            >
              <option value="">Select Court Name</option>
              {courtNames.map((court) => (
                <option key={court.courtNumber} value={court.courtNumber}>
                  {court.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cause List Type */}
          <div className="form-group">
            <label>Cause List Type *</label>
            <select
              value={causeListType}
              onChange={(e) => setCauseListType(e.target.value)}
              className="form-select"
              disabled={loading}
            >
              <option value="CIVIL">Civil</option>
              <option value="CRIMINAL">Criminal</option>
            </select>
          </div>

          {/* Date */}
          <div className="form-group">
            <label>Date *</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="form-input"
              disabled={loading}
            />
          </div>
        </div>

        <button type="submit" className="search-button" disabled={loading}>
          {loading ? '🔄 Loading...' : '📅 Get Cause List'}
        </button>
      </form>

      {error && (
        <div className="alert alert-error">
          <span className="alert-icon">⚠️</span>
          {error}
        </div>
      )}

      {notFound && selectedCourt && (
        <div className="cause-list-result">
          <div className="court-header">
            <h3>{selectedCourt.name}</h3>
            <p className="court-date">
              {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { 
                day: '2-digit', 
                month: 'short', 
                year: 'numeric' 
              }) : ''}
            </p>
          </div>
          <div className="no-causes-found">
            <div className="no-causes-icon">📋</div>
            <h4>No Causes Found</h4>
            <p>There are no causes scheduled for this court on the selected date.</p>
          </div>
        </div>
      )}

      {causeListData && (
        <div className="cause-list-result">
          <div className="cause-list-header-actions">
            <div className="cause-list-info">
              <h3>{selectedCourt?.name}</h3>
              <p className="cause-list-date">
                {selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { 
                  day: '2-digit', 
                  month: 'long', 
                  year: 'numeric' 
                }) : ''} • {causeListType}
              </p>
            </div>
            <button 
              className="download-pdf-button"
              onClick={generatePDF}
              disabled={downloadingPDF || !hasTableData()}
              title={!hasTableData() ? 'No data available to download' : 'Download cause list as PDF'}
            >
              {downloadingPDF ? (
                <>
                  <svg className="spinner" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M10 2C5.58172 2 2 5.58172 2 10C2 14.4183 5.58172 18 10 18C14.4183 18 18 14.4183 18 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M21 15V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M7 10L12 15L17 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M12 15V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <span>Download PDF</span>
                </>
              )}
            </button>
          </div>
          <div
            className="cause-list-html"
            dangerouslySetInnerHTML={{ __html: causeListData }}
          />
        </div>
      )}

      {!causeListData && !loading && !error && !notFound && (
        <div className="empty-state">
          <div className="empty-icon">📅</div>
          <h3>No Cause List</h3>
          <p>Select court details and date above to view the cause list</p>
        </div>
      )}
    </div>
  );
};

export default CauseList;
