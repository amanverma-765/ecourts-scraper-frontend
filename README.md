# E-Court Management System - Frontend

A professional web application for managing and searching e-court records, built with React and Vite.

## Features

✅ **Automatic Token Management**
- Token generation on app startup
- Automatic token refresh on 401 responses
- Secure token storage in localStorage

✅ **Search Case Details**
- Search cases by CNR (Case Number Reference)
- View comprehensive case information including:
  - Basic case details (CNR, case number, type, court number)
  - Filing and registration information
  - Petitioner and respondent details with advocates
  - Hearing dates and case status
  - Bilingual support (English and regional languages)

✅ **Cause List Search**
- Search daily cause lists by:
  - State, District, Court Complex
  - Court Name and Date
  - Civil or Criminal case types
- Interactive HTML table display with case details
- Cascading dropdowns for easy navigation

✅ **Professional UI/UX**
- Clean, modern design with gradient accents
- Responsive sidebar navigation
- Loading states and error handling
- Mobile-friendly responsive design

## Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- E-Court API Backend running at `http://localhost:8000`

## Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to:
```
http://localhost:5173
```

## API Integration

The application connects to the E-Court API backend at `http://localhost:8000`. Make sure the backend is running before using the application.

### Implemented API Endpoints:

- `POST /auth/token` - Token generation (automatic)
- `GET /court/states` - Get list of states
- `POST /court/districts` - Get districts for a state
- `POST /court/complex` - Get court complexes
- `POST /court/names` - Get court names
- `POST /court/cause-list` - Get cause list
- `GET /cases/details` - Get case details by CNR

## Project Structure

```
src/
├── components/
│   ├── Layout/
│   │   ├── Dashboard.jsx       # Main dashboard layout
│   │   └── Dashboard.css
│   ├── SearchCase.jsx          # Case search component
│   ├── SearchCase.css
│   ├── CauseList.jsx           # Cause list component
│   └── CauseList.css
├── services/
│   └── api.js                  # API client with token management
├── App.jsx                     # Main app component
├── App.css
├── index.css
└── main.jsx
```

## Key Features Implementation

### 1. Token Management
The application automatically:
- Generates a token on startup
- Stores it in localStorage
- Adds it to all API requests via axios interceptors
- Refreshes the token when receiving 401 responses
- Retries failed requests with new token

### 2. Search Case Details
- Enter CNR number (e.g., MHAH010002332024)
- View comprehensive case information
- Bilingual display (English + Regional language)
- Color-coded status badges

### 3. Cause List Search
- Cascading dropdowns (State → District → Court Complex → Court Name)
- Date picker with default as today
- Toggle between Civil and Criminal cases
- HTML table rendering with professional styling

## Technologies Used

- **React** - UI library
- **Vite** - Build tool and dev server
- **Axios** - HTTP client with interceptors
- **CSS3** - Styling with gradients and animations

## Development

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint code
npm run lint
```

## Environment

The application is configured to connect to:
- **API Backend**: `http://localhost:8000`
- **Frontend Dev Server**: `http://localhost:5173`

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Notes

- Token expiry is approximately 10 minutes
- The app handles token refresh automatically
- All API calls are authenticated except health check
- Case data includes bilingual fields where available

## License

This project is for educational and governmental use.

## React Compiler

The React Compiler is currently not compatible with SWC. See [this issue](https://github.com/vitejs/vite-plugin-react/issues/428) for tracking the progress.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
