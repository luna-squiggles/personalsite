// Cache DOM elements and constants
const INTERESTS = [
    { text: 'writing good code', emoji: ' 👾' },
    { text: 'knitting', emoji: ' 🧶' },
    { text: 'making music', emoji: ' 🎼' },
    { text: 'photography', emoji: ' 📷' },
    { text: 'writing', emoji: ' 🖊️' },
    { text: 'ice skating', emoji: ' ⛸️' },
    { text: 'guitar', emoji: ' 🎵' },
    { text: 'sailing', emoji: ' ⛵' }
];

const ROLES = [
    { text: 'designer', emoji: ' ✏️', prefix: 'a ' },
    { text: 'filmmaker', emoji: ' 🎬', prefix: 'a ' },
    { text: 'artist', emoji: ' 🎨', prefix: 'an ' },
    { text: 'creative', emoji: ' 💡', prefix: 'a ' }
];

const LOCATIONS = [
    { text: 'The National Gallery', emoji: ' 🖼️', prefix: 'at ' },
    { text: 'drinking a pumpkin spice latte', emoji: ' 🎃', prefix: '' },
    { text: 'Derby Gate Library', emoji: ' 📚', prefix: 'at ' },
    { text: 'Tate Modern', emoji: ' 🎨', prefix: 'at ' },
    { text: 'Double Black in Cole Valley', emoji: ' ☕', prefix: 'at ' }
];

// Cache DOM elements
const wordElement = document.getElementById('word');
const emojiElement = document.getElementById('emoji');
const wordLink = document.querySelector('a[href="."]');
const locationElement = document.getElementById('location');
const locationEmojiElement = document.getElementById('location-emoji');
const locationLink = document.querySelector('a[href="#"]');
const locationPrefixElement = document.getElementById('location-prefix');
const roleElement = document.getElementById('role');
const roleEmojiElement = document.getElementById('role-emoji');
const rolePrefixElement = document.getElementById('role-prefix');
const roleLink = document.querySelector('a[href="#role"]');

// Get or initialise indices from localStorage
let currentIndex = parseInt(localStorage.getItem('interestIndex') || 0) % INTERESTS.length || 0;
let locationIndex = parseInt(localStorage.getItem('locationIndex') || 0) % LOCATIONS.length || 0;
let roleIndex = parseInt(localStorage.getItem('roleIndex') || 0) % ROLES.length || 0;

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

// Update display with current role
const updateRoleDisplay = () => {
    const { text, emoji, prefix } = ROLES[roleIndex];
    rolePrefixElement.textContent = prefix;
    roleElement.textContent = text;
    roleEmojiElement.textContent = emoji;
    localStorage.setItem('roleIndex', roleIndex);
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

// Cycle to next role
const cycleRoles = (event) => {
    if (event) event.preventDefault();
    roleIndex = (roleIndex + 1) % ROLES.length;
    updateRoleDisplay();
};

// Initialise on DOM content loaded
document.addEventListener('DOMContentLoaded', () => {
    // Move to next interest on load
    currentIndex = (currentIndex + 1) % INTERESTS.length;
    locationIndex = (locationIndex + 1) % LOCATIONS.length;
    roleIndex = (roleIndex + 1) % ROLES.length;
    
    // Add click handlers if links exist
    if (wordLink) {
        wordLink.addEventListener('click', cycleInterests);
    }
    if (locationLink) {
        locationLink.addEventListener('click', cycleLocations);
    }
    if (roleLink) {
        roleLink.addEventListener('click', cycleRoles);
    }
    
    // Initial display
    updateDisplay();
    updateLocationDisplay();
    updateRoleDisplay();
});

// Space moves through the choices instead of scrolling: all three at once,
// or just the one whose link has keyboard focus.
document.addEventListener('keydown', (event) => {
    if (event.code !== 'Space' && event.key !== ' ') return;
    if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    if (event.target.closest('input, textarea, select, [contenteditable], button')) return;
    event.preventDefault();
    if (event.repeat) return;
    const focused = document.activeElement;
    if (focused === wordLink) cycleInterests();
    else if (focused === locationLink) cycleLocations();
    else if (focused === roleLink) cycleRoles();
    else {
        cycleRoles();
        cycleInterests();
        cycleLocations();
    }
});
