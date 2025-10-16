import { useState } from 'react';
import { getCaseDetails } from '../services/api';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './SearchCase.css';

const SearchCase = () => {
  const [cnr, setCnr] = useState('');
  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [downloadingPDF, setDownloadingPDF] = useState(false);

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

  const generatePDF = () => {
    if (!caseData) return;
    
    setDownloadingPDF(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let yPos = 20;
      
      const checkPageBreak = (requiredSpace = 40) => {
        if (yPos > pageHeight - requiredSpace) {
          doc.addPage();
          yPos = 20;
          return true;
        }
        return false;
      };
      
      const addSection = (title) => {
        checkPageBreak(30);
        doc.setFillColor(241, 245, 249);
        doc.rect(10, yPos, pageWidth - 20, 10, 'F');
        doc.setFontSize(11);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(30, 41, 59);
        doc.text(title, 14, yPos + 7);
        yPos += 15;
      };

      // Beautiful Header
      doc.setFillColor(30, 41, 59);
      doc.rect(0, 0, pageWidth, 40, 'F');
      
      // Decorative top border
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, pageWidth, 3, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont('helvetica', 'bold');
      doc.text('E-COURT CASE DETAILS', pageWidth / 2, 18, { align: 'center' });
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Official Case Information Report', pageWidth / 2, 28, { align: 'center' });
      
      // Decorative line
      doc.setDrawColor(16, 185, 129);
      doc.setLineWidth(0.5);
      doc.line(60, 33, pageWidth - 60, 33);
      
      yPos = 50;
      doc.setTextColor(0, 0, 0);

      // Case Title Banner with gradient effect
      doc.setFillColor(16, 185, 129);
      doc.roundedRect(10, yPos, pageWidth - 20, 14, 2, 2, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text(caseData.type_name || 'Case Details', pageWidth / 2, yPos + 9, { align: 'center' });
      
      yPos += 22;
      doc.setTextColor(0, 0, 0);

      // Quick Info Section with icon
      addSection('CASE IDENTIFICATION');

      const quickInfo = [
        ['CNR Number', String(caseData.cino || 'N/A')],
        ['Case Number', String(caseData.case_no || 'N/A')],
        ['Case Type', String(caseData.type_name || 'N/A')],
        ['Filing Date', formatDate(caseData.date_of_filing)],
        ['Registration Date', formatDate(caseData.dt_regis)],
        ['Next Hearing', formatDate(caseData.date_next_list)],
        ['Status', caseData.archive === 'N' ? 'Active' : 'Archived']
      ];

      if (caseData.ltype_name) {
        quickInfo.push(['Case Type (Local)', String(caseData.ltype_name)]);
      }

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: quickInfo,
        theme: 'grid',
        styles: { fontSize: 10, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [71, 85, 105], cellWidth: 60 },
          1: { textColor: [15, 23, 42], fontStyle: 'bold' }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Parties Section
      checkPageBreak(60);
      addSection('PARTIES INVOLVED');

      // Petitioner with rounded box
      doc.setFillColor(240, 253, 244);
      doc.roundedRect(14, yPos, pageWidth - 28, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(16, 185, 129);
      doc.text('PETITIONER / PLAINTIFF', 18, yPos + 7);
      yPos += 14;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const petitionerText = String(stripHtmlLinks(caseData.petNameAdd || caseData.pet_name || caseData.petparty_name || 'Not Available'));
      const splitPetitioner = doc.splitTextToSize(petitionerText, pageWidth - 40);
      doc.text(splitPetitioner, 18, yPos);
      yPos += (splitPetitioner.length * 6) + 4;

      if (caseData.pet_adv) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Advocate: ' + String(caseData.pet_adv || ''), 18, yPos);
        yPos += 8;
      }

      yPos += 6;

      // Respondent with rounded box
      checkPageBreak(40);
      doc.setFillColor(254, 243, 199);
      doc.roundedRect(14, yPos, pageWidth - 28, 10, 2, 2, 'F');
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(217, 119, 6);
      doc.text('RESPONDENT / DEFENDANT', 18, yPos + 7);
      yPos += 14;

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const respondentText = String(stripHtmlLinks(caseData.resNameAdd || caseData.res_name || caseData.resparty_name || 'Not Available'));
      const splitRespondent = doc.splitTextToSize(respondentText, pageWidth - 40);
      doc.text(splitRespondent, 18, yPos);
      yPos += (splitRespondent.length * 6) + 4;

      if (caseData.res_adv && caseData.res_adv !== '') {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Advocate: ' + caseData.res_adv, 18, yPos);
        yPos += 8;
      }

      yPos += 6;

      // Court Details Section
      checkPageBreak(50);
      addSection('COURT DETAILS');

      const courtDetails = [
        ['State', String(caseData.state_name || 'N/A')],
        ['District', String(caseData.dist_name || 'N/A')],
        ['Court Complex', String(caseData.complex_name || 'N/A')],
        ['Establishment', String(caseData.est_name || 'N/A')],
        ['Court Number', String(caseData.court_no || 'N/A')]
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: courtDetails,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [100, 116, 139], cellWidth: 60 },
          1: { textColor: [15, 23, 42] }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Filing & Registration Details
      checkPageBreak(50);
      addSection('FILING & REGISTRATION DETAILS');
      
      const filingDetails = [
        ['Filing Number', `${caseData.fil_no || 'N/A'}/${caseData.fil_year || 'N/A'}`],
        ['Filing Date', formatDate(caseData.date_of_filing)],
        ['Registration Number', `${caseData.reg_no || 'N/A'}/${caseData.reg_year || 'N/A'}`],
        ['Registration Date', formatDate(caseData.dt_regis)],
        ['First Hearing Date', formatDate(caseData.date_first_list)],
        ['Last Business Date', stripHtmlLinks(caseData.last_business_date) || 'N/A']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: filingDetails,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3.5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [248, 250, 252], textColor: [71, 85, 105], cellWidth: 60 },
          1: { textColor: [15, 23, 42] }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Hearing Schedule
      checkPageBreak(50);
      addSection('HEARING SCHEDULE');
      
      const hearingDetails = [
        ['Purpose of Hearing', String(caseData.purpose_name || 'N/A')],
        ['Next Hearing Date', formatDate(caseData.date_next_list)],
        ['Judge Name', String(caseData.jname || 'N/A')],
        ['Court Room Number', String(caseData.coram || caseData.court_no || 'N/A')]
      ];

      if (caseData.lpurpose_name) {
        hearingDetails.push(['Purpose (Local)', String(caseData.lpurpose_name)]);
      }

      autoTable(doc, {
        startY: yPos,
        head: [],
        body: hearingDetails,
        theme: 'grid',
        styles: { fontSize: 9, cellPadding: 3.5 },
        columnStyles: {
          0: { fontStyle: 'bold', fillColor: [254, 249, 195], textColor: [146, 64, 14], cellWidth: 60 },
          1: { textColor: [15, 23, 42] }
        },
        margin: { left: 14, right: 14 }
      });

      yPos = doc.lastAutoTable.finalY + 12;

      // Acts and Sections
      if (caseData.acts && caseData.acts.length > 0) {
        checkPageBreak(60);
        addSection('ACTS & SECTIONS');

        const actsData = caseData.acts.map((act, index) => [
          String(index + 1),
          String(act.act_name || 'N/A'),
          String(act.section_name || 'N/A')
        ]);

        autoTable(doc, {
          startY: yPos,
          head: [['#', 'Act Name', 'Section']],
          body: actsData,
          theme: 'striped',
          styles: { fontSize: 9, cellPadding: 3.5 },
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 90 },
            2: { cellWidth: 'auto' }
          },
          margin: { left: 14, right: 14 }
        });

        yPos = doc.lastAutoTable.finalY + 12;
      }

      // Hearing History Section
      if (caseData.historyOfCaseHearing) {
        checkPageBreak(60);
        addSection('HEARING HISTORY');
        
        // Parse HTML table and extract hearing history data
        const parser = new DOMParser();
        const htmlDoc = parser.parseFromString(caseData.historyOfCaseHearing, 'text/html');
        const rows = htmlDoc.querySelectorAll('tbody tr');
        
        const hearingHistoryData = [];
        rows.forEach((row) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 4) {
            hearingHistoryData.push([
              String(cells[0].textContent.trim()),  // Judge
              stripHtmlLinks(cells[1].innerHTML.trim()),  // Business Date
              String(cells[2].textContent.trim()),  // Hearing Date
              String(cells[3].textContent.trim())   // Purpose
            ]);
          }
        });

        if (hearingHistoryData.length > 0) {
          autoTable(doc, {
            startY: yPos,
            head: [['Judge', 'Business Date', 'Hearing Date', 'Purpose']],
            body: hearingHistoryData,
            theme: 'striped',
            styles: { fontSize: 8, cellPadding: 3, overflow: 'linebreak' },
            headStyles: { 
              fillColor: [99, 102, 241], 
              textColor: [255, 255, 255], 
              fontStyle: 'bold',
              halign: 'center'
            },
            alternateRowStyles: { fillColor: [248, 250, 252] },
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 30, halign: 'center' },
              2: { cellWidth: 30, halign: 'center' },
              3: { cellWidth: 'auto' }
            },
            margin: { left: 14, right: 14 }
          });

          yPos = doc.lastAutoTable.finalY + 12;
        }
      }

      // Additional Case Information
      checkPageBreak(50);
      addSection('ADDITIONAL INFORMATION');
      
      const additionalInfo = [];
      
      if (caseData.date_of_decision) {
        additionalInfo.push(['Decision Date', formatDate(caseData.date_of_decision)]);
      }
      if (caseData.nature_of_disposal) {
        additionalInfo.push(['Nature of Disposal', String(caseData.nature_of_disposal)]);
      }
      if (caseData.case_status) {
        additionalInfo.push(['Case Status', String(caseData.case_status)]);
      }
      if (caseData.police_station) {
        additionalInfo.push(['Police Station', String(caseData.police_station)]);
      }
      if (caseData.fir_number) {
        additionalInfo.push(['FIR Number', String(caseData.fir_number)]);
      }
      
      additionalInfo.push(['Archive Status', caseData.archive === 'N' ? 'Active' : 'Archived']);

      if (additionalInfo.length > 0) {
        autoTable(doc, {
          startY: yPos,
          head: [],
          body: additionalInfo,
          theme: 'grid',
          styles: { fontSize: 9, cellPadding: 3.5 },
          columnStyles: {
            0: { fontStyle: 'bold', fillColor: [243, 244, 246], textColor: [55, 65, 81], cellWidth: 60 },
            1: { textColor: [15, 23, 42] }
          },
          margin: { left: 14, right: 14 }
        });

        yPos = doc.lastAutoTable.finalY + 12;
      }

      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(
          `Generated on: ${new Date().toLocaleString('en-IN')}`,
          14,
          pageHeight - 10
        );
        doc.text(
          `Page ${i} of ${totalPages}`,
          pageWidth - 14,
          pageHeight - 10,
          { align: 'right' }
        );
      }

      // Save PDF
      const filename = `Case_${(caseData.cino || 'Details').replace(/[^a-zA-Z0-9]/g, '_')}_${new Date().getTime()}.pdf`;
      doc.save(filename);
      
      console.log('PDF generated successfully:', filename);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      console.error('Error details:', error.message, error.stack);
      alert(`Failed to generate PDF: ${error.message || 'Please try again.'}`);
    } finally {
      setDownloadingPDF(false);
    }
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
              <div className="header-actions">
                <button 
                  className="download-pdf-button"
                  onClick={generatePDF}
                  disabled={downloadingPDF}
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
                <span className="status-badge-large">
                  {caseData.archive === 'N' ? 'Active' : 'Archived'}
                </span>
              </div>
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
