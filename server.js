const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

let currentDrawer = null; // Aktueller Zeichner (Socket-ID)
let currentWord = '';     // Aktuelles Wort
let scores = {};          // Punktestand { socket.id: punkte }
let usernames = {};       // Benutzername des Spielers

// Statische Dateien aus dem 'public'-Ordner bereitstellen
app.use(express.static('public'));

// Wort-Generator
const wordList = ['Katze', 'Hund', 'Apfel', 'Haus', 'Baum', 'Auto', 'Sonne', 'Mond', 'Blume', 'Pferd'];

function getRandomWord() {
    const randomIndex = Math.floor(Math.random() * wordList.length);
    return wordList[randomIndex];
}

// Funktion zum Starten einer neuen Runde
let roundTimer; // Timer für jede Runde
const roundTime = 100; // Zeit in Sekunden für eine Runde

function startNewRound() {
    const clients = Array.from(io.sockets.sockets.keys());
    if (clients.length === 0) return; // Wenn keiner mehr da ist

    currentDrawer = clients[Math.floor(Math.random() * clients.length)];
    currentWord = getRandomWord(); // Zufälliges Wort wählen
    
    console.log('Zeichner in dieser Runde:', currentDrawer);
    console.log('Das Wort ist:', currentWord); // Debug Log

    // An alle senden, wer der Zeichner ist
    io.emit('currentDrawer', currentDrawer);

    // Der Zeichner bekommt das Wort privat
    io.to(currentDrawer).emit('word', currentWord); // Nur der Zeichner bekommt das Wort

    // Die Rater bekommen nur den Hinweis "Rate das Wort!"
    io.emit('displayWord', 'Rate das Wort!'); // Rater sehen nur den Hinweis

    // Timer starten
    startRoundTimer();
}

// Funktion zum Starten des Runden-Timers
function startRoundTimer() {
    let timeLeft = roundTime; // Sekunden
    io.emit('timer', timeLeft); // Timer an alle Clients senden

    // Den Timer zurücksetzen, falls er noch läuft
    if (roundTimer) {
        clearInterval(roundTimer);
    }

    // Jede Sekunde den Timer runterzählen
    roundTimer = setInterval(() => {
        timeLeft--;
        io.emit('timer', timeLeft); // Timer an alle Clients senden

        if (timeLeft <= 0) {
            clearInterval(roundTimer); // Timer stoppen
            io.emit('timer', 0); // Timer auf null setzen

            // Runde beenden und neue starten
            startNewRound();
        }
    }, 1000); // Timer alle 1000 ms (1 Sekunde) runterzählen
}

// Socket.IO Logik
io.on('connection', (socket) => {
    console.log('Ein Nutzer ist verbunden:', socket.id);

    // Punkte initialisieren
    scores[socket.id] = 0;

    // Empfang des Benutzernamens vom Client
    socket.on('setUsername', (username) => {
    usernames[socket.id] = username; // Speichere den Benutzernamen
    console.log('Benutzername gesetzt:', username);
    });

    // Prüfen, ob der Zeichner schon gesetzt ist
    if (!currentDrawer) {
        startNewRound(); // Neue Runde sofort starten, wenn der Zeichner noch nicht da ist
    }

    // Zeichendaten empfangen und an andere weiterleiten
    socket.on('draw', (data) => {
        socket.broadcast.emit('draw', data);
    });

    // Clear-Canvas (nur Zeichner darf)
    socket.on('clear', () => {
        if (socket.id === currentDrawer) {
            io.emit('clear');
        }
    });

    // Chat-Logik mit Ratesystem
    socket.on('chat message', (msg) => {
    const username = usernames[socket.id] || 'Unbekannt'; // Benutzername holen
        if (socket.id !== currentDrawer && msg.toLowerCase() === currentWord.toLowerCase()) {
            // Richtige Antwort!
            scores[socket.id] += 1;

            io.emit('chat message', `${username} hat richtig geraten! Es war: ${currentWord}`);
            // Punktestand an alle Clients senden
            io.emit('scores', Object.keys(scores).map(id => ({
  username: usernames[id] || 'Unbekannt', // Benutzername holen
  score: scores[id]
            })));

            startNewRound(); // Nächste Runde starten
        } else {
            // Normale Nachricht
            io.emit('chat message', `${username}: ${msg}`);
        }
    });

    // Disconnect-Handling
    socket.on('disconnect', () => {
        console.log('Ein Nutzer hat das Spiel verlassen:', socket.id);
        delete scores[socket.id];

        if (socket.id === currentDrawer) {
            const clients = Array.from(io.sockets.sockets.keys());
            if (clients.length > 0) {
                startNewRound(); // Nächsten Zeichner wählen und neue Runde starten
            } else {
                currentDrawer = null; // Kein Spieler mehr
            }
        }
    });
});

// Server starten
const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server läuft auf Port ${PORT}`);
});
