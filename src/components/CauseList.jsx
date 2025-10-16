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
  const [selectedCourtCode, setSelectedCourtCode] = useState('');
  const [selectedCourtNumber, setSelectedCourtNumber] = useState('');
  const [causeListType, setCauseListType] = useState('CIVIL');
  const [selectedDate, setSelectedDate] = useState('');

  const [causeListData, setCauseListData] = useState(null);
  const [loading, setLoading] = useState(false);
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
    setSelectedCourtCode('');
    setSelectedCourtNumber('');
    setDistricts([]);
    setCourtComplexes([]);
    setCourtNames([]);
    setCauseListData(null);

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
    setSelectedCourtCode('');
    setSelectedCourtNumber('');
    setCourtComplexes([]);
    setCourtNames([]);
    setCauseListData(null);

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

  const handleCourtComplexChange = async (courtCode) => {
    console.log('Court Complex Selected - Court Code:', courtCode);
    setSelectedCourtCode(courtCode);
    setSelectedCourtNumber(''); // Reset court number when court complex changes
    setCourtNames([]);
    setCauseListData(null);

    if (!courtCode || !selectedDistrict || !selectedState) return;

    try {
      const response = await getCourtNames(selectedState, selectedDistrict, courtCode);
      if (response.status === 'success' && response.data?.courtNames) {
        console.log('Raw court names from API:', response.data.courtNames);
        const parsed = parseCourtNames(response.data.courtNames);
        console.log('Parsed court names:', parsed);
        setCourtNames(parsed);
        // Don't auto-select the first court name
      }
    } catch (err) {
      console.error('Error loading court names:', err);
      setError('Failed to load court names');
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!selectedState || !selectedDistrict || !selectedCourtCode || !selectedCourtNumber || !selectedDate) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');
    setCauseListData(null);

    try {
      console.log('Cause List Request:', {
        stateCode: selectedState,
        districtCode: selectedDistrict,
        courtCode: selectedCourtCode,
        courtNumber: selectedCourtNumber,
        causeListType: causeListType,
        date: formatDateForAPI(selectedDate),
      });

      const response = await getCauseList({
        stateCode: selectedState,
        districtCode: selectedDistrict,
        courtCode: selectedCourtCode,
        courtNumber: selectedCourtNumber,
        causeListType: causeListType,
        date: formatDateForAPI(selectedDate),
      });

      if (response.status === 'success' && response.data) {
        setCauseListData(response.data.cases);
      } else {
        setError('No cause list found for the selected criteria');
      }
    } catch (err) {
      console.error('Error fetching cause list:', err);
      if (err.response?.status === 404) {
        setError('No cause list found for the selected date and court');
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
              value={selectedCourtCode}
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
              value={selectedCourtNumber}
              onChange={(e) => {
                console.log('Court Name Selected - Court Number:', e.target.value);
                setSelectedCourtNumber(e.target.value);
              }}
              className="form-select"
              disabled={!selectedCourtCode || loading}
            >
              <option value="">Select Court Name</option>
              {courtNames.map((court) => (
                <option key={court.id} value={court.id}>
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

      {causeListData && (
        <div className="cause-list-result">
          <div
            className="cause-list-html"
            dangerouslySetInnerHTML={{ __html: causeListData }}
          />
        </div>
      )}

      {!causeListData && !loading && !error && (
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
