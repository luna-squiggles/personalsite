// Cache DOM elements and constants
const INTERESTS = [
    { text: 'writing good code', emoji: ' 👾' },
    { text: 'knitting', emoji: ' 🧶' },
    { text: 'producing music', emoji: ' 🎼' },
    { text: 'photography', emoji: ' 📷' },
    { text: 'writing', emoji: ' 🖊️' },
    { text: 'figure skating', emoji: ' ⛸️' },
    { text: 'classical guitar', emoji: ' 🎵' },
    { text: 'sailing', emoji: ' ⛵' }
];

const LOCATIONS = [
    { text: 'GAIL\'s Blackfriars', emoji: ' 🍞', prefix: 'at ' },
    { text: 'The National Gallery', emoji: ' 🖼️', prefix: 'at ' },
    { text: 'drinking a mocha', emoji: ' 🍫', prefix: '' },
    { text: 'Derby Gate Library', emoji: ' 📚', prefix: 'at ' },
    { text: 'Tate Modern', emoji: ' 🎨', prefix: 'at ' }
];

// Cache DOM elements
const wordElement = document.getElementById('word');
const emojiElement = document.getElementById('emoji');
const wordLink = document.querySelector('a[href="."]');
const locationElement = document.getElementById('location');
const locationEmojiElement = document.getElementById('location-emoji');
const locationLink = document.querySelector('a[href="#"]');
const locationPrefixElement = document.getElementById('location-prefix');

// Get or initialise indices from localStorage
let currentIndex = parseInt(localStorage.getItem('interestIndex') || 0);
let locationIndex = parseInt(localStorage.getItem('locationIndex') || 0);

// Update display with current interest
const updateDisplay = () => {
    const { text, emoji } = INTERESTS[currentIndex];
    wordElement.textContent = text;
    emojiElement.textContent = emoji;
    localStorage.setItem('interestIndex', currentIndex);
};

// Update display with current location
const updateLocationDisplay = () => {
    const { text, emoji, prefix } = LOCATIONS[locationIndex];
    locationPrefixElement.textContent = prefix;
    locationElement.textContent = text;
    locationEmojiElement.textContent = emoji;
    localStorage.setItem('locationIndex', locationIndex);
};

// Cycle to next interest
const cycleInterests = (event) => {
    if (event) event.preventDefault();
    currentIndex = (currentIndex + 1) % INTERESTS.length;
    updateDisplay();
};

// Cycle to next location
const cycleLocations = (event) => {
    if (event) event.preventDefault();
    locationIndex = (locationIndex + 1) % LOCATIONS.length;
    updateLocationDisplay();
};

// Initialise on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // Move to next interest on load
    currentIndex = (currentIndex + 1) % INTERESTS.length;
    locationIndex = (locationIndex + 1) % LOCATIONS.length;
    
    // Add click handlers if links exist
    if (wordLink) {
        wordLink.addEventListener('click', cycleInterests);
    }
    if (locationLink) {
        locationLink.addEventListener('click', cycleLocations);
    }
    
    // Initial display
    updateDisplay();
    updateLocationDisplay();
});
