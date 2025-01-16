// Initialize Socket.io
const socket = io();

// Get references to DOM elements
const recordButton = document.getElementById('record-button');
const userSpeech = document.getElementById('user-speech');
const assistantResponse = document.getElementById('assistant-response');
const toggleModeButton = document.getElementById("toggle-mode");
const bodyElement = document.body;
const appElement = document.getElementById("app");

// Check for SpeechRecognition API support
let recognition;
if ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();

  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.continuous = false;

  recognition.onstart = () => {
    userSpeech.textContent = 'Listening...';
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    userSpeech.textContent = transcript;

    // Send the transcript to the server via Socket.io
    socket.emit('voiceCommand', transcript);
  };

  recognition.onerror = (event) => {
    userSpeech.textContent = `Error: ${event.error}`;
  };

  recognition.onend = () => {
    // Optionally, provide feedback or re-enable the button
  };
} else {
  userSpeech.textContent = 'SpeechRecognition API not supported in this browser.';
}

// Handle AI response from the server
socket.on('aiResponse', (response) => {
  if (response && response.text) {
    // Show the AI response text in the interface
    assistantResponse.textContent = response.text;

    // Convert the AI response text to speech
    speak(response.text);
  } else {
    assistantResponse.textContent = "No valid response received.";
  }

  // Handle audio playback if any audio URLs are available
  if (response.audioUrls && response.audioUrls.length > 0) {
    const audio = new Audio(response.audioUrls[0]);
    audio.play();
  }
});

// Function to convert text to speech
function speak(text) {
  const synth = window.speechSynthesis;

  if (synth) {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'en-US';
    utterance.pitch = 1;
    utterance.rate = 1;
    utterance.volume = 1;

    synth.speak(utterance);
  } else {
    console.error('SpeechSynthesis API not supported in this browser.');
  }
}

// Add event listener to the record button
recordButton.addEventListener('click', () => {
  if (recognition) {
    recognition.start();
  }
});

// Dark/Light Mode Toggle
if (localStorage.getItem("theme") === "dark") {
  bodyElement.classList.add("dark-mode");
  appElement.classList.add("dark-mode");
  toggleModeButton.classList.add("dark-mode");
  toggleModeButton.innerText = "🌕 Light Mode";
} else {
  bodyElement.classList.add("light-mode");
  appElement.classList.add("light-mode");
  toggleModeButton.classList.add("light-mode");
  toggleModeButton.innerText = "🌙 Dark Mode";
}

toggleModeButton.addEventListener("click", () => {
  if (bodyElement.classList.contains("light-mode")) {
    bodyElement.classList.remove("light-mode");
    appElement.classList.remove("light-mode");
    toggleModeButton.classList.remove("light-mode");

    bodyElement.classList.add("dark-mode");
    appElement.classList.add("dark-mode");
    toggleModeButton.classList.add("dark-mode");
    toggleModeButton.innerText = "🌕 Light Mode";

    localStorage.setItem("theme", "dark"); // Save the user's preference
  } else {
    bodyElement.classList.remove("dark-mode");
    appElement.classList.remove("dark-mode");
    toggleModeButton.classList.remove("dark-mode");

    bodyElement.classList.add("light-mode");
    appElement.classList.add("light-mode");
    toggleModeButton.classList.add("light-mode");
    toggleModeButton.innerText = "🌙 Dark Mode";

    localStorage.setItem("theme", "light"); // Save the user's preference
  }
});
