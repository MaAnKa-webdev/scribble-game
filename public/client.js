const socket = io(); // Socket.IO initialisieren

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');

// Farbauswahl & Strichstärke holen
const colorPicker = document.getElementById('color');
const thicknessSlider = document.getElementById('thickness');

let myId = null;
let currentDrawer = null;

socket.on('connect', () => {
  myId = socket.id;
});

// Info vom Server: Wer ist der Zeichner?
socket.on('currentDrawer', (drawerId) => {
  currentDrawer = drawerId;
  console.log('Zeichner ist:', currentDrawer); // Log für den Zeichner
  checkDrawerStatus();
  const status = document.getElementById('status');
  if (myId === currentDrawer) {
    status.textContent = 'Du bist der Zeichner!';
  } else {
    status.textContent = 'Du bist ein Rater!';
  }
  checkDrawerStatus(); // Status der Zeichenfunktion je nach Rolle prüfen
});


// Prüfen: Bin ich der Zeichner?
function checkDrawerStatus() {
    const clearButton = document.getElementById('clear');
    if (myId === currentDrawer) {
      enableDrawing();
      clearButton.disabled = false;
    } else {
      disableDrawing();
      clearButton.disabled = true;
    }
  }
  

let drawing = false;

let lastX = 0;
let lastY = 0;

function enableDrawing() {
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
  }
  
  function disableDrawing() {
    canvas.removeEventListener('mousedown', startDrawing);
    canvas.removeEventListener('mousemove', draw);
    canvas.removeEventListener('mouseup', stopDrawing);
    canvas.removeEventListener('mouseleave', stopDrawing);
  }


// Zeichnen starten
function startDrawing(e) {
    drawing = true;
    lastX = e.offsetX;
    lastY = e.offsetY;
  }
  
  function draw(e) {
    if (!drawing) return;
  
    const x = e.offsetX;
    const y = e.offsetY;
    const color = colorPicker.value;
    const thickness = thicknessSlider.value;
  
    ctx.strokeStyle = color;
    ctx.lineWidth = thickness;
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(x, y);
    ctx.stroke();
  
    socket.emit('draw', { lastX, lastY, x, y, color, thickness });
  
    lastX = x;
    lastY = y;
  }
  
  function stopDrawing() {
    drawing = false;
  }
  
  
// Zeichendaten von anderen empfangen und darstellen
socket.on('draw', (data) => {
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.thickness;
    ctx.beginPath();
    ctx.moveTo(data.lastX, data.lastY);
    ctx.lineTo(data.x, data.y);
    ctx.stroke();
  });

  const clearButton = document.getElementById('clear');

// Lokales Canvas leeren und Nachricht an Server senden
clearButton.addEventListener('click', () => {
    socket.emit('clear'); // Nur Event senden!
  });
  
  // Wenn vom Server "clear" kommt → Canvas leeren
  socket.on('clear', () => {
    ctx.clearRect(0, 0, canvas.width, canvas.height); // ← Leeren erst NACH Freigabe ✅
  });
  
  const form = document.getElementById('form');
const input = document.getElementById('input');
const messages = document.getElementById('messages');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  if (input.value) {
    socket.emit('chat message', input.value);
    input.value = '';
  }
});

// Nachricht vom Server empfangen
socket.on('chat message', (msg) => {
  const item = document.createElement('li');
  item.textContent = msg;  // Die Nachricht wird zusammen mit dem Benutzernamen angezeigt
  messages.appendChild(item);
  messages.scrollTop = messages.scrollHeight; // Auto-Scroll
});


socket.on('scores', (scores) => {
  const scoreBoard = document.getElementById('scores');
  scoreBoard.innerHTML = '<h3>Punkte:</h3>';
  scores.forEach((score) => {
      scoreBoard.innerHTML += `<p>${score.username}: ${score.score}</p>`;
  });
});

  

// Empfang des Wortes durch den Zeichner
socket.on('word', (word) => {
  const wordElement = document.getElementById('currentWord');
  if (myId === currentDrawer) {
      wordElement.textContent = `Das Wort zum Zeichnen: ${word}`; // Nur der Zeichner sieht das Wort
  }
});

// Empfang des Hinweises für die Rater
socket.on('displayWord', (message) => {
  const wordElement = document.getElementById('currentWord');
  if (myId !== currentDrawer) {
      wordElement.textContent = message; // Rater sehen nur den Hinweis
  }
});

// Timer vom Server empfangen und anzeigen
socket.on('timer', (timeLeft) => {
  const timeLeftElement = document.getElementById('time-left');
  timeLeftElement.textContent = timeLeft; // Zeigt die verbleibende Zeit an
});






  
  
  
  