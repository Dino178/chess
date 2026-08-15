// =================================================================
// 0. FIREBASE & LOCAL GUEST STATE
// =================================================================
const firebaseConfig = {
  apiKey: "AIzaSyBNeg6-whOIiX4yWWPgffOZY6xm0wrvpu0",
  authDomain: "chess-faac6.firebaseapp.com",
  databaseURL: "https://chess-faac6-default-rtdb.firebaseio.com",
  projectId: "chess-faac6",
  storageBucket: "chess-faac6.firebasestorage.app",
  messagingSenderId: "395409063256",
  appId: "1:395409063256:web:617565e068905312e1f92d",
  measurementId: "G-TC0TJ2GV5P"
};

let auth = null, db = null;
if (typeof firebase !== 'undefined') {
    try {
        if (firebase.apps.length === 0 && firebaseConfig.apiKey) firebase.initializeApp(firebaseConfig);
        if (firebase.apps.length > 0) {
            auth = firebase.auth();
            db = firebase.database();
        }
    } catch(e) { console.warn("Firebase not configured; offline guest mode active.", e); }
}

let currentUser = null;
let guestProfile = JSON.parse(localStorage.getItem('chessGuestProfile')) || {
    username: "Guest_" + Math.floor(1000 + Math.random() * 9000),
    isGuest: true,
    friends: ["ChessMaster99", "GrandmasterAlex"]
};

// =================================================================
// 1. SOUND EFFECTS
// =================================================================
const sfxMove = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
const sfxCapture = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');
const sfxCheck = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3');
const sfxEnd = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3');

function playSound(type) {
    let p = type === 'end' ? sfxEnd.play() : type === 'check' ? sfxCheck.play() : type === 'capture' ? sfxCapture.play() : sfxMove.play();
    if (p !== undefined) p.catch(() => {});
}

// =================================================================
// 2. MASSIVE RESTORED & EXTENDED BOT ROSTER (35+ BOTS)
// =================================================================
const allBots = [];
function addBot(id, name, elo, type, category, handler = null) {
    allBots.push({ id, name, elo, type, category, handler });
}

// 1. Standard Ladder Tier
const ladderNames = [
    ["Zach", 100], ["Martin", 200], ["Sally", 300], ["Jimmy", 400], ["Bobby", 500],
    ["Sarah", 600], ["Mike", 700], ["Nelson", 800], ["Chloe", 900], ["David", 1000],
    ["Emma", 1100], ["Maria", 1200], ["Lucas", 1300], ["Sophia", 1400], ["Jack", 1500],
    ["Elena", 1600], ["Oliver", 1700], ["Viktor", 1800], ["Isabella", 1900], ["Liam", 2000],
    ["Mateo", 2200], ["Yuki", 2400], ["Hikaru", 2600], ["Magnus", 2800], ["Stockfish Max", 3200]
];
ladderNames.forEach(([n, elo]) => addBot(`bot_${n.toLowerCase()}`, `${n}`, elo, 'ladder', 'Standard Ladder'));

// 2. Personality Piece Lovers
const pieceLovers = [
    ["Pam", 100, "p", "Pawn"], ["Arthur", 250, "k", "King"], ["Rocky", 1000, "r", "Rook"],
    ["Benedict", 1150, "b", "Bishop"], ["Victoria", 1250, "q", "Queen"], ["Lancelot", 1350, "n", "Knight"]
];
pieceLovers.forEach(([n, elo, p, name]) => {
    addBot(`pers_${n.toLowerCase()}`, `${n} (${name} Lover)`, elo, 'personality', 'Personality', moves => {
        let favs = moves.filter(m => m.piece === p);
        return (favs.length > 0 && Math.random() < 0.75) ? favs[Math.floor(Math.random() * favs.length)] : null;
    });
});

// 3. Behavioral & Strategic Archetypes
addBot('beh_grog', 'Grog (Berserker)', 800, 'behavior', 'Aggressive', moves => {
    let caps = moves.filter(m => m.captured);
    return (caps.length && Math.random() < 0.85) ? caps[Math.floor(Math.random() * caps.length)] : null;
});
addBot('beh_gandhi', 'Gandhi (Pacifist)', 900, 'behavior', 'Positional', moves => {
    let nonCaps = moves.filter(m => !m.captured);
    return (nonCaps.length && Math.random() < 0.8) ? nonCaps[Math.floor(Math.random() * nonCaps.length)] : null;
});
addBot('beh_turtle', 'The Turtle', 1100, 'behavior', 'Solid', moves => {
    let def = moves.filter(m => (m.color === 'w' ? m.to[1] <= '4' : m.to[1] >= '5'));
    return (def.length && Math.random() < 0.75) ? def[Math.floor(Math.random() * def.length)] : null;
});
addBot('beh_sniper', 'The Sniper', 1400, 'behavior', 'Positional', moves => {
    let snipes = moves.filter(m => (m.piece === 'b' || m.piece === 'r') && Math.abs(m.to.charCodeAt(0) - m.from.charCodeAt(0)) >= 2);
    return (snipes.length && Math.random() < 0.8) ? snipes[Math.floor(Math.random() * snipes.length)] : null;
});
addBot('beh_robin', 'Sir Robin (Coward)', 950, 'behavior', 'Quirky', moves => {
    let retreats = moves.filter(m => (m.color === 'w' ? m.to[1] < m.from[1] : m.to[1] > m.from[1]));
    return (retreats.length && Math.random() < 0.6) ? retreats[Math.floor(Math.random() * retreats.length)] : null;
});
addBot('beh_fianchetto', 'Fianchetto King', 1650, 'behavior', 'Positional', moves => {
    let fian = moves.filter(m => ['g3','b3','g6','b6','bg2','bb2','bg7','bb7'].some(s => m.san.toLowerCase().includes(s)));
    return (fian.length && Math.random() < 0.7) ? fian[Math.floor(Math.random() * fian.length)] : null;
});

const PLACEMENT_BENCHMARKS = [600, 900, 1200, 1500, 1800];

// =================================================================
// 3. PLAYER DNA & LOCAL COMPUTER SYNC
// =================================================================
const DEFAULT_DNA = {
    gamesPlayed: 0, wins: 0, losses: 0, draws: 0,
    acpl: 45, aggression: 50, tactics: 50, positional: 50,
    endgame: 50, resilience: 50, blunderTendencies: { hangingPiece: 0 },
    calculatedElo: 1200
};

let playerDNA = Object.assign({}, DEFAULT_DNA, JSON.parse(localStorage.getItem('chessPlayerDNA')) || {});
let activeCloneDNA = null;

function saveGuestAndDNA() {
    localStorage.setItem('chessGuestProfile', JSON.stringify(guestProfile));
    localStorage.setItem('chessPlayerDNA', JSON.stringify(playerDNA));
    updateProfileUI();
}

function analyzeGameForDNA(history, playerColor) {
    let userMoves = history.filter(h => h.color === playerColor);
    if (userMoves.length === 0) return;

    let captures = 0, checks = 0, cpLossTotal = 0;
    userMoves.forEach(m => {
        if (m.move.includes('x')) captures++;
        if (m.move.includes('+')) checks++;
        if (m.cpLoss) cpLossTotal += Math.min(400, Math.max(0, m.cpLoss));
    });

    let currentACPL = userMoves.length > 0 ? (cpLossTotal / userMoves.length) : 50;
    playerDNA.gamesPlayed++;
    playerDNA.acpl = Math.round((playerDNA.acpl * 0.8) + (currentACPL * 0.2));
    playerDNA.aggression = Math.min(100, Math.max(10, Math.round((playerDNA.aggression * 0.8) + (((captures + checks) / userMoves.length) * 100 * 1.5) * 0.2)));
    playerDNA.tactics = Math.min(100, Math.max(10, Math.round(100 - (playerDNA.acpl * 0.8))));
    
    let estElo = Math.max(300, Math.min(2900, Math.round(3000 - (playerDNA.acpl * 28))));
    playerDNA.calculatedElo = Math.round((playerDNA.calculatedElo * 0.7) + (estElo * 0.3));

    saveGuestAndDNA();
}

function getCloneBotMove(possibleMoves) {
    let target = activeCloneDNA || playerDNA;
    if (Math.random() * 100 < target.aggression) {
        let agg = possibleMoves.filter(m => m.captured || m.san.includes('+'));
        if (agg.length > 0) return agg[Math.floor(Math.random() * agg.length)].san;
    }
    if (Math.random() * 100 < (target.acpl / 2)) {
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)].san;
    }
    return null;
}

// =================================================================
// 4. CHESS.COM REVIEW ENGINE & STOCKFISH POLARITY FIX
// =================================================================
function cpToWinProb(cp) { return 1 / (1 + Math.pow(10, -cp / 400)); }
function calculateMoveAccuracy(winProbBefore, winProbAfter) {
    let winDiff = Math.max(0, (winProbBefore - winProbAfter) * 100);
    return Math.max(0, Math.min(100, 103.1668 * Math.exp(-0.04354 * winDiff) - 3.1669));
}

function classifyMove(diffCp, winDiff, isSacrifice = false) {
    if (diffCp >= 0 && isSacrifice) return { tag: "Brilliant", sym: "!!", key: "brilliant", color: "#1ba599" };
    if (diffCp >= -10) return { tag: "Great", sym: "!", key: "great", color: "#5c8bb0" };
    if (diffCp >= -20) return { tag: "Best", sym: "★", key: "best", color: "#95b645" };
    if (diffCp >= -50) return { tag: "Excellent", sym: "✓", key: "excellent", color: "#96bc4b" };
    if (diffCp >= -90) return { tag: "Good", sym: "✓", key: "good", color: "#8bb158" };
    if (diffCp >= -160) return { tag: "Inaccuracy", sym: "?!", key: "inaccuracy", color: "#f0c15c" };
    if (diffCp >= -300) return { tag: "Mistake", sym: "?", key: "mistake", color: "#e69d41" };
    if (winDiff > 0.35 && diffCp < -400) return { tag: "Miss", sym: "✖", key: "miss", color: "#ea5b5b" };
    return { tag: "Blunder", sym: "??", key: "blunder", color: "#fa412d" };
}

function evaluatePositionAsync(fen, depth = 10, timeoutMs = 2500) {
    return new Promise(resolve => {
        if (!analysisEngine) return resolve(0);
        let score = 0, timer = null;
        const listener = e => {
            let line = e.data;
            if (line.includes('score cp')) {
                let m = line.match(/score cp (-?\d+)/);
                if (m) score = parseInt(m[1]);
            } else if (line.includes('score mate')) {
                let m = line.match(/score mate (-?\d+)/);
                if (m) score = parseInt(m[1]) > 0 ? 10000 : -10000;
            }
            if (line.includes('bestmove')) {
                cleanup();
                let isWhiteToMove = fen.split(' ')[1] === 'w';
                resolve(isWhiteToMove ? score : -score);
            }
        };
        const cleanup = () => {
            clearTimeout(timer);
            analysisEngine.removeEventListener('message', listener);
        };
        timer = setTimeout(() => { cleanup(); resolve(score); }, timeoutMs);
        analysisEngine.addEventListener('message', listener);
        analysisEngine.postMessage('stop');
        analysisEngine.postMessage('position fen ' + fen);
        analysisEngine.postMessage('go depth ' + depth);
    });
}

// =================================================================
// 5. APPLICATION INITIALIZATION & GLOBAL CONTROLS
// =================================================================
let board = null, game = null;
let currentMode = 'bot', currentBot = null, matchId = null;
let engine = null, analysisEngine = null;
let gameActive = false, botThinking = false;
let gameHistory = []; 
let timeW = 600, timeB = 600, timerInterval = null;
let selectedSquare = null, myPlayerColor = 'w';
let placementStep = 0, matchRoomRef = null;

const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

const config = {
    draggable: true, position: 'start',
    onDragStart: onDragStart, onDrop: onDrop,
    onSnapEnd: function() { board.position(game.fen()); clearHighlights(); highlightCheck(); },
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

document.addEventListener('DOMContentLoaded', () => {
    updateProfileUI();
    populateBotDropdown();
    renderFriendsList();

    loadEngine().then(w => { engine = w; engine.onmessage = handleEngineMessage; });
    loadEngine().then(w => { analysisEngine = w; });

    // Classroom Stealth Buttons
    document.getElementById('toggle-schoolwork-btn').addEventListener('click', () => {
        document.getElementById('schoolwork-overlay').style.display = 'block';
    });
    document.getElementById('exit-schoolwork-btn').addEventListener('click', () => {
        document.getElementById('schoolwork-overlay').style.display = 'none';
    });

    // Auth & Guest Wireup
    document.getElementById('guest-btn').addEventListener('click', () => {
        let name = document.getElementById('username-input').value.trim();
        if (name) guestProfile.username = name;
        saveGuestAndDNA();
        document.getElementById('auth-modal').style.display = 'none';
    });

    document.getElementById('edit-username-btn').addEventListener('click', () => {
        let newName = prompt("Enter new username:", guestProfile.username);
        if (newName && newName.trim()) {
            guestProfile.username = newName.trim();
            saveGuestAndDNA();
        }
    });

    if (auth) {
        document.getElementById('signup-btn').addEventListener('click', () => {
            auth.createUserWithEmailAndPassword($('#email-input').val(), $('#password-input').val())
                .then(res => { guestProfile.username = res.user.email.split('@')[0]; saveGuestAndDNA(); document.getElementById('auth-modal').style.display = 'none'; })
                .catch(e => alert(e.message));
        });
        document.getElementById('login-btn').addEventListener('click', () => {
            auth.signInWithEmailAndPassword($('#email-input').val(), $('#password-input').val())
                .then(res => { guestProfile.username = res.user.email.split('@')[0]; saveGuestAndDNA(); document.getElementById('auth-modal').style.display = 'none'; })
                .catch(e => alert(e.message));
        });
        document.getElementById('google-login-btn').addEventListener('click', () => {
            auth.signInWithPopup(new firebase.auth.GoogleAuthProvider())
                .then(res => { guestProfile.username = res.user.displayName || res.user.email.split('@')[0]; saveGuestAndDNA(); document.getElementById('auth-modal').style.display = 'none'; })
                .catch(e => alert(e.message));
        });
        auth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                guestProfile.username = user.displayName || user.email.split('@')[0];
                document.getElementById('auth-modal').style.display = 'none';
                updateProfileUI();
            }
        });
    }

    // Custom Room Code Hosting & Joining
    document.getElementById('game-mode').addEventListener('change', e => {
        currentMode = e.target.value;
        document.getElementById('bot-settings').style.display = (currentMode === 'bot') ? 'block' : 'none';
        document.getElementById('placement-panel').style.display = (currentMode === 'placement') ? 'block' : 'none';
        if (currentMode === 'custom_code') document.getElementById('custom-room-modal').style.display = 'block';
    });

    document.getElementById('create-room-btn').addEventListener('click', hostCustomRoom);
    document.getElementById('join-room-btn').addEventListener('click', joinCustomRoom);

    // Friends System
    document.getElementById('add-friend-btn').addEventListener('click', () => {
        let fInput = document.getElementById('friend-name-input');
        let fName = fInput.value.trim();
        if (fName && !guestProfile.friends.includes(fName)) {
            guestProfile.friends.push(fName);
            fInput.value = '';
            saveGuestAndDNA();
            renderFriendsList();
        }
    });

    // Game Control Buttons
    document.getElementById('start-btn').addEventListener('click', () => {
        if (currentMode === 'online') findOnlineMatch();
        else startGame(false);
    });
    document.getElementById('resign-btn').addEventListener('click', () => { if(gameActive) endGame('loss', "Resigned"); });
    document.getElementById('draw-btn').addEventListener('click', handleDrawOffer);
    document.getElementById('undo-btn').addEventListener('click', handleUndo);

    // DNA & Import/Export Handlers
    document.getElementById('open-dna-btn').addEventListener('click', openDNAModal);
    document.getElementById('export-dna-btn').addEventListener('click', exportDNAFile);
    document.getElementById('import-dna-file').addEventListener('change', importDNAFile);
    document.getElementById('clear-data-btn').addEventListener('click', () => {
        if (confirm("Reset local profile, DNA, and friends?")) {
            localStorage.clear();
            location.reload();
        }
    });

    game = new Chess();
    board = Chessboard('myBoard', config);
    setupClickToMove();
});

function populateBotDropdown() {
    let select = document.getElementById('bot-select');
    select.innerHTML = '';
    allBots.forEach(b => {
        let opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = `${b.name} (${b.elo}) - [${b.category}]`;
        select.appendChild(opt);
    });
}

function loadEngine() {
    return fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(res => res.text())
        .then(code => new Worker(URL.createObjectURL(new Blob([code], { type: 'application/javascript' }))));
}

function renderFriendsList() {
    let el = document.getElementById('friends-list-container');
    el.innerHTML = '';
    guestProfile.friends.forEach(f => {
        el.innerHTML += `<div class="friend-row"><span>🟢 <strong>${f}</strong></span><button onclick="challengeFriend('${f}')" style="font-size:10px; padding:2px 5px; background:#5865f2;">Challenge</button></div>`;
    });
}

function challengeFriend(name) {
    document.getElementById('game-mode').value = 'custom_code';
    currentMode = 'custom_code';
    document.getElementById('custom-room-modal').style.display = 'block';
    hostCustomRoom();
    botChat(`Hosting room code. Share the code with ${name}!`);
}

// =================================================================
// 6. ROOM CODE HOSTING & JOINING
// =================================================================
function generateRoomCode() {
    let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length));
    return code;
}

function hostCustomRoom() {
    let code = generateRoomCode();
    let display = document.getElementById('room-code-display');
    display.style.display = 'block';
    display.innerText = `CODE: ${code}`;
    myPlayerColor = 'w';

    if (db) {
        matchRoomRef = db.ref('rooms/' + code);
        matchRoomRef.set({
            host: guestProfile.username,
            hostElo: playerDNA.calculatedElo,
            fen: 'start',
            status: 'waiting',
            lastMove: ''
        });
        matchRoomRef.on('value', snap => {
            let val = snap.val();
            if (val && val.status === 'playing' && !gameActive) {
                document.getElementById('custom-room-modal').style.display = 'none';
                startRoomGame(val.guest, val.guestElo, 'w');
            }
        });
    } else {
        botChat(`Simulated Host Code: ${code}. (Connect Firebase for real-time multiplayer).`);
    }
}

function joinCustomRoom() {
    let code = document.getElementById('join-room-code').value.trim().toUpperCase();
    if (!code) return alert("Please enter a valid room code.");
    myPlayerColor = 'b';

    if (db) {
        let rRef = db.ref('rooms/' + code);
        rRef.once('value', snap => {
            let val = snap.val();
            if (val && val.status === 'waiting') {
                rRef.update({ guest: guestProfile.username, guestElo: playerDNA.calculatedElo, status: 'playing' });
                matchRoomRef = rRef;
                document.getElementById('custom-room-modal').style.display = 'none';
                startRoomGame(val.host, val.hostElo, 'b');
            } else {
                alert("Room not found or game already active.");
            }
        });
    } else {
        alert("Simulated join: Firebase credentials required for live sync.");
    }
}

function startRoomGame(opponentName, opponentElo, myCol) {
    myPlayerColor = myCol;
    startGame(false);
    document.getElementById('black-name').innerText = opponentName;
    document.getElementById('black-elo').innerText = `(Elo ${opponentElo})`;
    board.orientation(myCol === 'w' ? 'white' : 'black');
    botChat(`Connected with ${opponentName} (Elo ${opponentElo})!`);
}

// =================================================================
// 7. GAME LOOP & ENGINE HANDLERS
// =================================================================
function startGame(isCustomFen = false) {
    if (!isCustomFen) { game.reset(); board.start(); } else { board.position(game.fen()); }
    board.orientation('white');
    gameActive = true; botThinking = false; selectedSquare = null;
    gameHistory = [{ fen: game.fen(), move: 'start', color: null }];

    let timeChoice = parseInt(document.getElementById('time-control').value);
    timeW = timeChoice || 600; timeB = timeChoice || 600;
    clearInterval(timerInterval);
    if (timeChoice > 0) timerInterval = setInterval(tickTimer, 1000);
    updateClocks();

    ['resign-btn', 'draw-btn', 'undo-btn'].forEach(id => document.getElementById(id).disabled = false);
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('analysis-panel').style.display = 'none';

    document.getElementById('white-name').innerText = guestProfile.username;
    document.getElementById('white-elo').innerText = `(Elo ${playerDNA.calculatedElo})`;

    if (currentMode === 'bot') {
        currentBot = allBots.find(b => b.id === document.getElementById('bot-select').value) || allBots[0];
        document.getElementById('black-name').innerText = currentBot.name;
        document.getElementById('black-elo').innerText = `(Elo ${currentBot.elo})`;
        botChat(`Match started against ${currentBot.name}.`);
    } else if (currentMode === 'clone') {
        document.getElementById('black-name').innerText = "Player DNA Clone";
        document.getElementById('black-elo').innerText = `(Elo ${playerDNA.calculatedElo})`;
        botChat("Facing your playstyle clone.");
    } else if (currentMode === 'placement') {
        let testElo = PLACEMENT_BENCHMARKS[placementStep] || 1200;
        currentBot = { id: 'placement_bot', name: `RLI Evaluator`, elo: testElo, category: 'benchmark', handler: null };
        document.getElementById('black-name').innerText = currentBot.name;
        document.getElementById('black-elo').innerText = `(Elo ${testElo})`;
        document.getElementById('placement-progress').innerText = `Match ${placementStep + 1} of 5`;
    }

    updateStatus();
}

function handleUndo() {
    if (!gameActive || botThinking || gameHistory.length <= 1) return;
    game.undo();
    let slice = -1;
    if (currentMode !== 'pvp') { game.undo(); slice = -2; }
    board.position(game.fen());
    gameHistory = gameHistory.slice(0, slice);
    rebuildMoveTable(); calculateMaterial(); updateEvalBar();
    clearHighlights(); highlightCheck(); updateStatus();
}

async function handleDrawOffer() {
    if (!gameActive || currentMode === 'pvp') return;
    botChat("Evaluating draw offer...");
    let score = await evaluatePositionAsync(game.fen());
    let botScore = game.turn() === 'b' ? score : -score;
    if (botScore > 120) botChat("I have a winning advantage. Draw declined!");
    else endGame('draw', "Draw accepted.");
}

function triggerBot() {
    if (!gameActive || !engine) return;
    let moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    if (currentMode === 'clone') {
        let cloneMove = getCloneBotMove(moves);
        if (cloneMove) return executeBotMove(cloneMove);
    }

    if (currentBot && typeof currentBot.handler === 'function') {
        let custom = currentBot.handler(moves);
        if (custom) return executeBotMove(custom.san || custom);
    }

    let elo = currentBot ? currentBot.elo : (playerDNA.calculatedElo || 1200);
    let depth = Math.max(1, Math.min(20, Math.floor(elo / 150)));
    let skillLevel = Math.max(0, Math.min(20, Math.floor((elo - 400) / 100)));
    let moveTime = Math.max(100, Math.min(2500, Math.floor(elo / 1.5)));

    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    engine.postMessage('position fen ' + game.fen());
    engine.postMessage(`go depth ${depth} movetime ${moveTime}`);
}

function handleEngineMessage(event) {
    let line = event.data;
    if (line.startsWith('bestmove')) {
        let best = line.split(' ')[1];
        executeBotMove(best);
    }
}

function executeBotMove(moveStr) {
    let delay = Math.floor(Math.random() * 300) + 200;
    setTimeout(() => {
        let move = game.move(moveStr, { sloppy: true });
        if (move) {
            board.position(game.fen());
            botThinking = false;
            handleMoveVisuals(move, false);
        }
    }, delay);
}

// =================================================================
// 8. BOARD CONTROLS & CHESS.COM REVIEW
// =================================================================
function setupClickToMove() {
    $(document).on('click', '.square-55d63', function() {
        if (!gameActive || botThinking) return;
        let square = $(this).attr('data-square');
        if (!square) return;

        let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
        if (!isMyTurn) return;

        if (selectedSquare) {
            let move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move) {
                board.position(game.fen());
                clearHighlights(); selectedSquare = null;
                handleMoveVisuals(move, false);
                if (gameActive && game.turn() !== myPlayerColor && currentMode !== 'pvp') {
                    botThinking = true; setTimeout(triggerBot, 250);
                }
            } else {
                let piece = game.get(square);
                if (piece && (piece.color === game.turn() || currentMode === 'pvp')) highlightLegalMoves(square);
                else { clearHighlights(); selectedSquare = null; }
            }
        } else {
            let piece = game.get(square);
            if (piece && (piece.color === game.turn() || currentMode === 'pvp')) highlightLegalMoves(square);
        }
    });
}

function onDragStart(source, piece) {
    if (!gameActive || game.game_over() || botThinking) return false;
    let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
    return isMyTurn && game.moves({ square: source }).length > 0;
}

function onDrop(source, target) {
    clearHighlights(); selectedSquare = null;
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    handleMoveVisuals(move, false);
    if (gameActive && game.turn() !== myPlayerColor && currentMode !== 'pvp') {
        botThinking = true; setTimeout(triggerBot, 250);
    }
}

function handleMoveVisuals(move, isSync) {
    if (game.in_checkmate() || game.game_over()) playSound('end');
    else if (game.in_check()) playSound('check');
    else if (move.captured) playSound('capture');
    else playSound('move');

    if (!isSync) gameHistory.push({ fen: game.fen(), move: move.san, piece: move.piece, color: game.turn() === 'w' ? 'b' : 'w' });
    rebuildMoveTable(); calculateMaterial(); updateStatus(); updateEvalBar(); checkGameOver();
}

function highlightLegalMoves(square) {
    clearHighlights(); selectedSquare = square;
    $('#myBoard .square-' + square).addClass('selected-square');
    game.moves({ square: square, verbose: true }).forEach(m => $('#myBoard .square-' + m.to).addClass('legal-move'));
}

function clearHighlights() { $('#myBoard .square-55d63').removeClass('legal-move in-check selected-square'); }
function highlightCheck() {
    if (game.in_check()) {
        let b = game.board(), col = game.turn();
        for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (b[r][c] && b[r][c].type === 'k' && b[r][c].color === col) $('#myBoard .square-' + ('abcdefgh'[c] + (8-r))).addClass('in-check');
    }
}

function rebuildMoveTable() {
    let tbody = document.getElementById('move-tbody'); tbody.innerHTML = '';
    for (let i = 1; i < gameHistory.length; i += 2) {
        tbody.innerHTML += `<tr><td>${Math.ceil(i / 2)}.</td><td>${gameHistory[i].move}</td><td>${gameHistory[i+1] ? gameHistory[i+1].move : '...'}</td></tr>`;
    }
    document.getElementById('move-history-panel').scrollTop = document.getElementById('move-history-panel').scrollHeight;
}

function tickTimer() {
    if (!gameActive) return;
    game.turn() === 'w' ? timeW-- : timeB--; updateClocks();
    if (timeW <= 0) endGame('loss', "Black wins on time.");
    if (timeB <= 0) endGame('win', "White wins on time.");
}

function updateClocks() {
    let fmt = s => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
    document.getElementById('timer-w').innerText = fmt(timeW);
    document.getElementById('timer-b').innerText = fmt(timeB);
    document.getElementById('timer-w').classList.toggle('active', game.turn() === 'w');
    document.getElementById('timer-b').classList.toggle('active', game.turn() === 'b');
}

function checkGameOver() {
    if (!game.game_over()) return;
    let res = 'draw', msg = "Game drawn.";
    if (game.in_checkmate()) { res = game.turn() === 'w' ? 'loss' : 'win'; msg = res === 'win' ? "Checkmate! Victory!" : "Checkmate! Defeat."; }
    endGame(res, msg);
}

function endGame(result, msg) {
    gameActive = false; botThinking = false; clearInterval(timerInterval);
    ['resign-btn', 'draw-btn', 'undo-btn'].forEach(id => document.getElementById(id).disabled = true);
    updateStatus(msg); botChat(msg);

    if (currentMode === 'placement') {
        if (result === 'win') placementStep = Math.min(PLACEMENT_BENCHMARKS.length - 1, placementStep + 1);
        else if (result === 'loss') placementStep = Math.max(0, placementStep - 1);
        playerDNA.calculatedElo = PLACEMENT_BENCHMARKS[placementStep];
        saveGuestAndDNA();
    }
    if (analysisEngine) runChessComAnalysis();
}

function updateStatus(override) { document.getElementById('status').innerText = override || `${game.turn() === 'w' ? 'White' : 'Black'} to move`; }
function botChat(msg) { document.getElementById('chat-messages').innerHTML += `<p><strong style="color:#5865f2;">System:</strong> ${msg}</p>`; document.getElementById('chat-box').scrollTop = 9999; }
function updateProfileUI() {
    document.getElementById('player-name-display').innerText = guestProfile.username;
    document.getElementById('player-elo-display').innerText = `${playerDNA.calculatedElo} Elo`;
}

async function updateEvalBar() {
    if (!analysisEngine || !gameActive) return;
    let score = await evaluatePositionAsync(game.fen());
    let capped = Math.max(-1000, Math.min(1000, score));
    let pct = 50 + (capped / 20);
    document.getElementById('eval-bar-fill').style.height = pct + '%';
}

function calculateMaterial() {
    let counts = { w: {p:0,n:0,b:0,r:0,q:0}, b: {p:0,n:0,b:0,r:0,q:0} };
    let boardState = game.board();
    for (let r=0; r<8; r++) for (let c=0; c<8; c++) if (boardState[r][c] && boardState[r][c].type !== 'k') counts[boardState[r][c].color][boardState[r][c].type]++;
    let start = {p:8, n:2, b:2, r:2, q:1}, deadW = '', deadB = '', scoreW = 0, scoreB = 0;
    for (let p in start) {
        for (let i=0; i < start[p] - counts.w[p]; i++) { deadW += `<div class="grave-piece" style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/w${p.toUpperCase()}.png')"></div>`; scoreB += PIECE_VALUES[p]; }
        for (let i=0; i < start[p] - counts.b[p]; i++) { deadB += `<div class="grave-piece" style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/b${p.toUpperCase()}.png')"></div>`; scoreW += PIECE_VALUES[p]; }
    }
    document.getElementById('grave-w').innerHTML = deadB; document.getElementById('grave-b').innerHTML = deadW;
    let diff = scoreW - scoreB;
    document.getElementById('mat-w').innerText = diff > 0 ? `+${diff}` : '';
    document.getElementById('mat-b').innerText = diff < 0 ? `+${Math.abs(diff)}` : '';
}

async function runChessComAnalysis() {
    document.getElementById('analysis-panel').style.display = 'block';
    let bEl = document.getElementById('move-breakdown'); bEl.innerHTML = '';
    let counts = { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 };
    let accuracyTotals = { w: [], b: [] }, prevEval = 0;

    for (let i = 1; i < gameHistory.length; i++) {
        let item = gameHistory[i];
        let evalForMove = await evaluatePositionAsync(item.fen, 8, 1200);
        let diffCp = item.color === 'w' ? (evalForMove - prevEval) : (prevEval - evalForMove);
        item.cpLoss = Math.max(0, -diffCp);

        let winBefore = cpToWinProb(item.color === 'w' ? prevEval : -prevEval);
        let winAfter = cpToWinProb(item.color === 'w' ? evalForMove : -evalForMove);
        accuracyTotals[item.color].push(calculateMoveAccuracy(winBefore, winAfter));

        let cls = classifyMove(diffCp, Math.abs(winBefore - winAfter));
        if (item.color === 'w') counts[cls.key]++;
        bEl.innerHTML += `<div class="move-breakdown-row"><span><strong>${Math.ceil(i/2)}. ${item.color === 'w' ? '' : '...'}${item.move}</strong></span><span style="color:${cls.color}; font-weight:bold;">${cls.sym} ${cls.tag}</span></div>`;
        prevEval = evalForMove;
    }

    let accW = accuracyTotals.w.length ? Math.round(accuracyTotals.w.reduce((a,b)=>a+b,0) / accuracyTotals.w.length) : 80;
    let accB = accuracyTotals.b.length ? Math.round(accuracyTotals.b.reduce((a,b)=>a+b,0) / accuracyTotals.b.length) : 80;

    document.getElementById('accuracy-score-w').innerText = `${accW}%`;
    document.getElementById('accuracy-score-b').innerText = `${accB}%`;
    document.getElementById('caps-w').innerText = `Est. Elo: ${Math.round(accW * 26)}`;
    document.getElementById('caps-b').innerText = `Est. Elo: ${Math.round(accB * 26)}`;

    for (let k in counts) if (document.getElementById(`stat-${k}`)) document.getElementById(`stat-${k}`).innerText = counts[k];
    document.getElementById('analysis-status').innerText = "Game Review Complete";
    analyzeGameForDNA(gameHistory, myPlayerColor);
}

// =================================================================
// 9. DNA MODAL & IMPORT/EXPORT
// =================================================================
function openDNAModal() {
    document.getElementById('dna-modal').style.display = 'block';
    document.getElementById('bar-aggression').style.width = playerDNA.aggression + '%';
    document.getElementById('val-aggression').innerText = playerDNA.aggression + '%';
    document.getElementById('bar-tactics').style.width = playerDNA.tactics + '%';
    document.getElementById('val-tactics').innerText = playerDNA.tactics + '%';
    document.getElementById('bar-positional').style.width = playerDNA.positional + '%';
    document.getElementById('val-positional').innerText = playerDNA.positional + '%';
    document.getElementById('bar-endgame').style.width = playerDNA.endgame + '%';
    document.getElementById('val-endgame').innerText = playerDNA.endgame + '%';
    document.getElementById('bar-resilience').style.width = playerDNA.resilience + '%';
    document.getElementById('val-resilience').innerText = playerDNA.resilience + '%';

    let list = document.getElementById('dna-insights-list'); list.innerHTML = '';
    list.innerHTML += `<li>⚔️ Aggression Index: ${playerDNA.aggression}%</li>`;
    list.innerHTML += `<li>🎯 Average Centipawn Loss (ACPL): ${playerDNA.acpl}</li>`;
    list.innerHTML += `<li>📊 Estimated Performance Elo: ${playerDNA.calculatedElo}</li>`;
}

function exportDNAFile() {
    let blob = new Blob([JSON.stringify(playerDNA, null, 2)], { type: "application/json" });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${guestProfile.username}_chess_dna.json`;
    a.click();
}

function importDNAFile(e) {
    let file = e.target.files[0];
    if (!file) return;
    let r = new FileReader();
    r.onload = ev => {
        try {
            activeCloneDNA = JSON.parse(ev.target.result);
            alert("Clone DNA loaded! Switch mode to 'Play vs My Player Clone' to test against it.");
            document.getElementById('game-mode').value = 'clone';
            currentMode = 'clone';
            document.getElementById('dna-modal').style.display = 'none';
        } catch(err) { alert("Invalid DNA JSON."); }
    };
    r.readAsText(file);
}
