import { useState, useEffect } from 'react';
import {
  getStates,
  getDistricts,
  getCourtComplex,
  getCourtNames,
  getCauseList,
  parseCourtNames,
} from '../services/api';
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
