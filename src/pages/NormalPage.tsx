import React, { useState } from 'react';
import { CategoryWord, fetchRandomWordByCategory } from '../services/CategoryWordService';
import NormalWordDisplay from '../components/NormalWordDisplay'; // Import NormalWordDisplay
import '../styles/NormalPage.css'; // Import NormalPage CSS

const NormalPage: React.FC = () => {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(0); // Default to category 1
  const [currentWordData, setCurrentWordData] = useState<CategoryWord | null>(null);
  const [displayState, setDisplayState] = useState<'initial' | 'showingWord' | 'showingMeaning'>('initial');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleCategoryChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedCategoryId(Number(event.target.value));
    setCurrentWordData(null);
    setDisplayState('initial');
    setError(null);
  };

  const handleFetchNextWord = async () => {
    if (selectedCategoryId === null) {
      setError("Please select a category first.");
      // Optionally, do not proceed if already loading
      if (loading) return;
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const wordData = await fetchRandomWordByCategory(selectedCategoryId);
      setCurrentWordData(wordData);
      setDisplayState('showingWord'); // Always show word first after fetching
      setError(null);
    } catch (err) {
      if (err instanceof Error) {
        setError(`Failed to fetch word: ${err.message}`);
      } else {
        setError("An unknown error occurred.");
      }
      setCurrentWordData(null);
      setDisplayState('initial'); // Reset to initial on error to allow retry
    } finally {
      setLoading(false);
    }
  };

  const handleWordDisplayNext = () => {
    if (displayState === 'showingWord') {
      setDisplayState('showingMeaning');
    } else if (displayState === 'showingMeaning') {
      handleFetchNextWord(); // Fetch a new word
    }
  };

  const handleStartOrRetryFetch = () => {
    if (selectedCategoryId === null) {
      setError("Please select a category first.");
      return;
    }
    // Reset display state to initial before fetching, ensures "Start Studying" button is shown correctly
    // and NormalWordDisplay is hidden until new word is fetched.
    // If there's an error, this also clears it visually before retry.
    setDisplayState('initial');
    setCurrentWordData(null); // Clear previous word data
    handleFetchNextWord();
  };


  // Determine button text and visibility
  const showStartButton = displayState === 'initial' || error;
  const startButtonText = error ? "Retry" : "Start Studying";

  return (
    <div className="normal-page-container"> {/* className added */}
      <h2>Normal Mode</h2>

      <div className="category-selector"> {/* className added */}
        <label htmlFor="category-select">Select Category: </label>
        <select
          id="category-select"
          value={selectedCategoryId ?? ''}
          onChange={handleCategoryChange}
          disabled={loading && displayState !== 'initial'} // Disable category change while loading a word (but not initial load)
        >
          <option value="" disabled>Select a category</option>
          {[...Array(10)].map((_, i) => (
            <option key={i} value={i}>
              Category {i}
            </option>
          ))}
        </select>
      </div>

      {/* Loading message specifically for the initial fetch */}
      {loading && displayState === 'initial' && <p className="loading-text">Loading category content...</p>}
      {error && <p className="error-message">Error: {error}</p>} {/* className added */}

      <div className="word-display-area">
        {displayState !== 'initial' && !error && currentWordData && (
          <NormalWordDisplay
            wordData={currentWordData}
            // Pass 'showingWord' or 'showingMeaning' directly
            displayState={displayState as 'showingWord' | 'showingMeaning'}
            onNext={handleWordDisplayNext}
            loading={loading} // Pass loading state to NormalWordDisplay for its internal handling
          />
        )}
        {displayState === 'initial' && !loading && !error && (
          <p>Select a category and click "{startButtonText}" to begin.</p>
        )}
      </div>

      {showStartButton && (
        <button
          onClick={handleStartOrRetryFetch}
          disabled={loading || selectedCategoryId === null}
          className="start-button" // className added
        >
          {startButtonText}
        </button>
      )}
    </div>
  );
};

export default NormalPage;
