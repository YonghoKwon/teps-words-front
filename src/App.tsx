// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WordStudyPage } from './pages/WordStudyPage';
import { WordListPage } from './pages/WordListPage';
import NormalPage from './pages/NormalPage'; // Import NormalPage
import { Navigation } from './components/Navigation';
import './App.css';

function App() {
  return (
    <Router>
      <div className="app">
        <Navigation />
        <Routes>
          <Route path="/" element={<WordStudyPage />} />
          <Route path="/words" element={<WordListPage />} />
          <Route path="/normal" element={<NormalPage />} /> {/* Add new route for NormalPage */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;