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
      // Use landscape orientation for better table display
      const doc = new jsPDF('landscape', 'mm', 'a4');
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      
      // Beautiful Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 45, 'F');
      
      // Decorative top border
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('DAILY CAUSE LIST', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Court Proceedings Schedule', pageWidth / 2, 28, { align: 'center' });
      
      // Decorative line
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(60, 33, pageWidth - 60, 33);
      
      let yPos = 55;
      
      // Court Information Banner
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(10, yPos, pageWidth - 20, 18, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      const courtNameText = doc.splitTextToSize(selectedCourt.name, pageWidth - 30);
      doc.text(courtNameText, pageWidth / 2, yPos + 7, { align: 'center' });
      
      yPos += 25;
      
      // Date and Type Information
      doc.setFillColor(241, 245, 249);
      doc.rect(10, yPos, pageWidth - 20, 12, 'F');
      
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      
      const formattedDate = selectedDate ? new Date(selectedDate).toLocaleDateString('en-IN', { 
        day: '2-digit', 
        month: 'long', 
        year: 'numeric' 
      }) : '';
      
      doc.text(`Date: ${formattedDate}`, 14, yPos + 8);
      doc.text(`Type: ${causeListType}`, pageWidth - 14, yPos + 8, { align: 'right' });
      
      yPos += 18;
      
      // Parse HTML table to extract data
      const parser = new DOMParser();
      const htmlDoc = parser.parseFromString(causeListData, 'text/html');
      const tables = htmlDoc.querySelectorAll('table');
      
      if (tables.length > 0) {
        const table = tables[0];
        const headers = [];
        const rows = [];
        
        // Extract headers
        const headerCells = table.querySelectorAll('thead tr th, tr:first-child th');
        if (headerCells.length > 0) {
          headerCells.forEach(th => {
            headers.push(th.textContent.trim());
          });
        }
        
        // Extract rows (skip header row if it was in tbody)
        const bodyRows = table.querySelectorAll('tbody tr, tr');
        bodyRows.forEach((tr, index) => {
          // Skip if this is the header row
          const isHeaderRow = tr.querySelectorAll('th').length > 0 && index === 0;
          if (isHeaderRow && headers.length > 0) return;
          
          // Skip section headers (rows with colspan)
          const hasColspan = tr.querySelector('td[colspan]');
          if (hasColspan) return;
          
          const cells = tr.querySelectorAll('td');
          if (cells.length > 0) {
            const rowData = [];
            cells.forEach(td => {
              // Remove HTML tags and get clean text
              let text = td.textContent.trim();
              // Remove excessive whitespace
              text = text.replace(/\s+/g, ' ');
              rowData.push(text);
            });
            if (rowData.length > 0) {
              rows.push(rowData);
            }
          }
        });
        
        // Generate table with autoTable
        if (headers.length > 0 && rows.length > 0) {
          // Calculate available width for columns
          const marginLeft = 10;
          const marginRight = 10;
          const availableWidth = pageWidth - marginLeft - marginRight;
          const numColumns = headers.length;
          
          autoTable(doc, {
            startY: yPos,
            head: [headers],
            body: rows,
            theme: 'grid',
            tableWidth: availableWidth,
            styles: { 
              fontSize: 6.5, 
              cellPadding: 2,
              lineColor: [226, 232, 240],
              lineWidth: 0.3,
              overflow: 'linebreak',
              cellWidth: 'auto',
              minCellHeight: 6,
              valign: 'middle',
              halign: 'left'
            },
            headStyles: {
              fillColor: [16, 185, 129],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7,
              cellPadding: 2.5,
              halign: 'center',
              valign: 'middle'
            },
            alternateRowStyles: {
              fillColor: [249, 250, 251]
            },
            margin: { left: marginLeft, right: marginRight, top: 20, bottom: 20 },
            tableLineColor: [226, 232, 240],
            tableLineWidth: 0.3,
            didDrawPage: function (data) {
              // Footer on each page
              doc.setFontSize(8);
              doc.setTextColor(100, 116, 139);
              doc.text(
                `Page ${doc.internal.getCurrentPageInfo().pageNumber}`,
                pageWidth / 2,
                pageHeight - 10,
                { align: 'center' }
              );
              
              doc.text(
                `Generated on: ${new Date().toLocaleString('en-IN')}`,
                pageWidth - 14,
                pageHeight - 10,
                { align: 'right' }
              );
            }
          });
        } else {
          // Fallback if no structured data found
          doc.setFontSize(10);
          doc.setTextColor(100, 116, 139);
          doc.text('No structured cause list data available.', pageWidth / 2, yPos + 20, { align: 'center' });
        }
      }
      
      // Save PDF
      const dateStr = selectedDate.replace(/-/g, '');
      const courtNameShort = selectedCourt.name.substring(0, 30).replace(/[^a-zA-Z0-9]/g, '_');
      const filename = `CauseList_${courtNameShort}_${dateStr}_${causeListType}.pdf`;
      doc.save(filename);
      
      console.log('PDF generated successfully:', filename);
      
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
