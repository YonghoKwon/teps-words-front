// src/App.tsx
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WordStudyPage } from './pages/WordStudyPage';
import { WordListPage } from './pages/WordListPage';
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
        </Routes>
      </div>
    </Router>
  );
}

export default App;