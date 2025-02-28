const words = [
    'writing good code',
    'knitting',
    'producing music',
    'photography',
    'writing',
    'figure skating',
    'classical guitar',
    'sailing',
];

const emojis = [
    ' 👾',
    ' 🧶',
    ' 🎼',
    ' 📷',
    ' 🖊️',
    ' ⛸️',
    ' 🎵',
    ' ⛵',
];

let wordIndex = parseInt(localStorage.getItem('wordIndex') || 0);
let emojiIndex = parseInt(localStorage.getItem('emojiIndex') || 0);

function updateDisplay() {
    document.getElementById('word').innerHTML = words[wordIndex];
    document.getElementById('emoji').innerHTML = emojis[emojiIndex];
    
    localStorage.setItem('wordIndex', wordIndex);
    localStorage.setItem('emojiIndex', emojiIndex);
}

function cycleWords() {
    wordIndex = (wordIndex >= (words.length - 1)) ? 0 : wordIndex + 1;
    emojiIndex = (emojiIndex >= (emojis.length - 1)) ? 0 : emojiIndex + 1;
    updateDisplay();
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    wordIndex = (wordIndex >= (words.length - 1)) ? 0 : wordIndex + 1;
    emojiIndex = (emojiIndex >= (emojis.length - 1)) ? 0 : emojiIndex + 1;
    
    const wordLink = document.querySelector('a[href="."]');
    if (wordLink) {
        wordLink.addEventListener('click', function(e) {
            e.preventDefault();
            cycleWords();
        });
    }
    
    updateDisplay();
});
