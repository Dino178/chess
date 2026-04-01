// ==========================================
// 0. FIREBASE SETUP & AUTHENTICATION
// ==========================================
// TODO: Replace this with your actual Firebase config!
const firebaseConfig = {
    apiKey: "AIzaSyBNeg6-whOIiX4yWWPgffOZY6xm0wrvpu0",
    authDomain: "chess-faac6.firebaseapp.com",
    databaseURL: "https://chess-faac6-default-rtdb.firebaseio.com",
    projectId: "chess-faac6",
    storageBucket: "chess-faac6.firebasestorage.app",
    messagingSenderId: "395409063256",
    appId: "1:395409063256:web:617565e068905312e1f92d"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
let currentUser = null;
let isAdmin = false;

document.getElementById('signup-btn').addEventListener('click', () => {
    auth.createUserWithEmailAndPassword($('#email-input').val(), $('#password-input').val()).catch(e => alert(e.message));
});
document.getElementById('login-btn').addEventListener('click', () => {
    auth.signInWithEmailAndPassword($('#email-input').val(), $('#password-input').val()).catch(e => alert(e.message));
});
document.getElementById('google-login-btn').addEventListener('click', () => {
    auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()).catch(e => alert(e.message));
});

auth.onAuthStateChanged(user => {
    if (user) {
        currentUser = user;
        document.getElementById('auth-modal').style.display = 'none';
        
        // Setup Profile UI
        isAdmin = (user.email === "landon.z.low@gmail.com"); // TODO: Set your actual admin email here
        let badge = isAdmin ? `<span style="background:#ed4245; padding:2px 4px; border-radius:4px; font-size:10px;">ADMIN</span> ` : "";
        document.getElementById('player-name-display').innerHTML = badge + (user.displayName || user.email.split('@')[0]);
        if (isAdmin) document.getElementById('admin-panel').style.display = 'block';

        document.querySelector('#game-mode option[value="online"]').disabled = false;
        db.ref('users/' + user.uid).update({ email: user.email, lastOnline: firebase.database.ServerValue.TIMESTAMP });
    } else {
        document.getElementById('auth-modal').style.display = 'block';
    }
});

// ==========================================
// 1. SOUND EFFECTS & THE MASSIVE BOT FACTORY
// ==========================================
const sfxMove = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
const sfxCapture = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');
const sfxCheck = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3');
const sfxEnd = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3');

function playSound(type) {
    let p = type === 'end' ? sfxEnd.play() : type === 'check' ? sfxCheck.play() : type === 'capture' ? sfxCapture.play() : sfxMove.play();
    if (p !== undefined) p.catch(() => {});
}

const allBots = [];
function addBot(name, elo) { allBots.push({ id: 'bot_' + name.toLowerCase().replace(/[^a-z0-9]/g, ''), name: `${name} (Elo ${elo})`, elo: elo, type: 'ladder' }); }
function addPersonalityBot(name, elo, pieceLetter) { 
    let pieces = { 'q': 'Queen', 'n': 'Knight', 'b': 'Bishop', 'r': 'Rook', 'p': 'Pawn', 'k': 'King' }; 
    allBots.push({ id: 'pers_' + name.toLowerCase().replace(/[^a-z0-9]/g, ''), name: `${name} (${pieces[pieceLetter]} Lover)`, elo: elo, type: 'personality', fav: pieceLetter.toLowerCase() }); 
}
function addBehaviorBot(name, elo, styleType) {
    let styles = { 'berserker': 'Berserker', 'pacifist': 'Pacifist', 'pusher': 'Pawn Pusher', 'turtle': 'Defensive Turtle', 'sniper': 'Long-Range Sniper', 'coward': 'Coward (Retreats)' };
    allBots.push({ id: 'beh_' + name.toLowerCase().replace(/[^a-z0-9]/g, ''), name: `${name} - ${styles[styleType]}`, elo: elo, type: 'behavior', style: styleType }); 
}

// THE 30+ BOT ROSTER
addBot("Timmy", 100); addBot("Tommy", 200); addBot("Sally", 300); addBot("Jimmy", 400); addBot("Bobby", 500); 
addBot("Sarah", 600); addBot("Mike", 700); addBot("Nelson", 800); addBot("Chloe", 900); addBot("David", 1000);
addBot("Emma", 1100); addBot("Maria", 1200); addBot("Lucas", 1300); addBot("Sophia", 1400); addBot("Jack", 1500);
addBot("Elena", 1600); addBot("Oliver", 1700); addBot("Viktor", 1800); addBot("Isabella", 1900); addBot("Liam", 2000);
addBot("Mateo", 2200); addBot("Yuki", 2400); addBot("Hikaru", 2600); addBot("Magnus", 2800); addBot("Stockfish", 3200);

addPersonalityBot("Paul", 600, "p"); addPersonalityBot("Arthur", 200, "k"); addPersonalityBot("Rocky", 1000, "r");
addPersonalityBot("Benedict", 1100, "b"); addPersonalityBot("Victoria", 1200, "q"); addPersonalityBot("Lancelot", 1300, "n");

addBehaviorBot("Grog", 800, "berserker"); addBehaviorBot("Gandhi", 900, "pacifist"); addBehaviorBot("Wallace", 1000, "pusher");
addBehaviorBot("The Turtle", 1100, "turtle"); addBehaviorBot("The Sniper", 1400, "sniper"); addBehaviorBot("Sir Robin", 950, "coward");

// ==========================================
// 2. RANDOM NAME GENERATOR (21x21x21)
// ==========================================
const word1 = ["Sneaky", "Brilliant", "Clumsy", "Rapid", "Silent", "Angry", "Happy", "Cosmic", "Shadow", "Golden", "Iron", "Mystic", "Rogue", "Brave", "Lazy", "Fierce", "Swift", "Toxic", "Crystal", "Phantom", "Cyber"];
const word2 = ["Penguin", "Dragon", "Wizard", "Knight", "Panda", "Tiger", "Goblin", "Ninja", "Robot", "Pirate", "Ghost", "Falcon", "Kraken", "Wolf", "Bear", "Sloth", "Cobra", "Raven", "Shark", "Yeti", "Cyborg"];
const word3 = ["Slayer", "Master", "Crusher", "King", "Queen", "Legend", "Maker", "Hunter", "Breaker", "Walker", "Sniper", "Jumper", "Dasher", "Runner", "Thinker", "Player", "Tactic", "Gambit", "Blunder", "Genius", "Hero"];

function generateBotUsername() {
    return word1[Math.floor(Math.random()*21)] + word2[Math.floor(Math.random()*21)] + word3[Math.floor(Math.random()*21)];
}

// ==========================================
// 3. SYSTEM VARIABLES
// ==========================================
let board = null, game = null;
let currentMode = 'bot', currentBot = null, matchId = null;
let engine = null, analysisEngine = null;
let gameActive = false, botThinking = false;
let gameHistory = []; 
let timeW = 600, timeB = 600, timerInterval = null;
let selectedSquare = null; 
let myPlayerColor = 'w'; 
let currentEngineMoves = []; 
let matchRef = null; 
let playerProfile = JSON.parse(localStorage.getItem('chessProfile')) || { elo: null, placementGames: 0, placementScore: 0 };
const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

const config = {
    draggable: true, position: 'start',
    onDragStart: onDragStart, onDrop: onDrop,
    onSnapEnd: function() { board.position(game.fen()); clearHighlights(); highlightCheck(); },
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

// ==========================================
// 4. INITIALIZATION & UI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateProfileUI(); populateBotDropdown();
    
    loadEngine().then(w => { engine = w; engine.onmessage = handleEngineMessage; }).catch(() => console.error("Engine failed."));
    loadEngine().then(w => { analysisEngine = w; });

    document.getElementById('game-mode').addEventListener('change', (e) => {
        currentMode = e.target.value;
        document.getElementById('bot-settings').style.display = currentMode === 'bot' ? 'block' : 'none';
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        if (currentMode === 'online') findOnlineMatch(); else startGame(false);
    });

    document.getElementById('resign-btn').addEventListener('click', () => { if(gameActive) endGame('loss', "Resignation"); });
    
    document.getElementById('draw-btn').addEventListener('click', async () => { 
        if(!gameActive || currentMode === 'pvp') return;
        botChat("Let me evaluate the board...");
        let score = await evaluatePositionAsync(game.fen());
        let botScore = game.turn() === 'b' ? score : -score; 
        
        if (botScore > 100) { botChat("No way! I am winning this."); } 
        else if (botScore < -150) { endGame('draw', "Okay, you drive a hard bargain. Draw accepted."); } 
        else { endGame('draw', "It's a dead draw anyway. I accept."); }
    });

    document.getElementById('undo-btn').addEventListener('click', () => {
        if (!gameActive || botThinking || gameHistory.length <= 1) return;
        game.undo(); let slice = -1;
        if (currentMode !== 'pvp') { game.undo(); slice = -2; }
        board.position(game.fen());
        gameHistory = gameHistory.slice(0, slice);
        rebuildMoveTable(); calculateMaterial(); updateEvalBar();
        clearHighlights(); highlightCheck(); updateStatus();
    });

    // ADMIN BOT SPAWNER LOGIC
    document.getElementById('admin-spawn-btn').addEventListener('click', () => {
        if (!isAdmin) return;
        
        let selectedBot = allBots.find(b => b.id === document.getElementById('bot-select').value);
        let customEloInput = parseInt(document.getElementById('admin-custom-elo').value);
        let finalElo = isNaN(customEloInput) ? selectedBot.elo : customEloInput;
        let randomName = generateBotUsername();
        
        db.ref('matchmaking').push({ 
            uid: "BOT_" + Date.now(), 
            displayName: randomName, 
            elo: finalElo, 
            isBot: true, 
            botId: selectedBot.id, 
            waiting: true 
        });
        
        botChat(`Admin: Spawned hidden bot ${randomName} (${finalElo} Elo) into the global queue.`);
        document.getElementById('admin-custom-elo').value = ''; // clear input
    });

    game = new Chess(); board = Chessboard('myBoard', config);
    setupClickToMove(); updateLeaderboardUI();
});

function populateBotDropdown() {
    let select = document.getElementById('bot-select');
    allBots.forEach(b => { let opt = document.createElement('option'); opt.value = b.id; opt.textContent = b.name; select.appendChild(opt); });
}
function loadEngine() { return fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js').then(res => res.text()).then(code => new Worker(URL.createObjectURL(new Blob([code], {type: 'application/javascript'})))); }

// ==========================================
// 5. MULTIPLAYER MATCHMAKING LOGIC
// ==========================================
function findOnlineMatch() {
    if (!currentUser) return alert("You must be logged in to play online!");
    updateStatus("Searching for an opponent...");
    botChat("Looking for a match...");
    
    let queueRef = db.ref('matchmaking');
    
    queueRef.orderByChild('waiting').equalTo(true).once('value', snapshot => {
        let players = snapshot.val();
        if (players) {
            let opponentKey = Object.keys(players)[0];
            let opponent = players[opponentKey];
            
            if(opponent.uid === currentUser.uid) return waitForMatch(queueRef);
            
            matchId = "match_" + Date.now();
            myPlayerColor = 'b';
            
            db.ref('matches/' + matchId).set({
                white: opponent.uid,
                whiteName: opponent.displayName,
                black: currentUser.uid,
                blackName: currentUser.displayName || currentUser.email.split('@')[0],
                fen: "start",
                lastMove: "",
                turn: 'w',
                isBotMatch: opponent.isBot || false,
                botId: opponent.botId || null,
                botElo: opponent.elo || 1200
            });
            
            queueRef.child(opponentKey).update({ waiting: false, matchId: matchId });
            startOnlineGame(opponent.displayName || "Opponent", opponent);
        } else {
            waitForMatch(queueRef);
        }
    });
}

function waitForMatch(queueRef) {
    let myQueueRef = queueRef.push({
        uid: currentUser.uid,
        displayName: currentUser.displayName || currentUser.email.split('@')[0],
        waiting: true
    });
    
    myQueueRef.on('value', snapshot => {
        let data = snapshot.val();
        if (data && data.matchId) {
            matchId = data.matchId;
            myPlayerColor = 'w';
            myQueueRef.remove(); 
            startOnlineGame("Opponent", { isBot: false }); 
        }
    });
    
    myQueueRef.onDisconnect().remove();
}

function startOnlineGame(opponentName, opponentData) {
    game.reset(); board.start(); board.orientation(myPlayerColor === 'w' ? 'white' : 'black');
    gameActive = true; botThinking = false; selectedSquare = null;
    
    document.getElementById('black-name').innerText = opponentName;
    document.getElementById('white-name').innerText = currentUser.displayName || currentUser.email.split('@')[0];
    botChat("Match found! You are playing as " + (myPlayerColor === 'w' ? "White" : "Black") + ".");
    
    // Setup Bot logic if matched against a spawned bot
    if (opponentData && opponentData.isBot) {
        currentBot = allBots.find(b => b.id === opponentData.botId) || allBots[0];
        currentBot.elo = opponentData.elo || currentBot.elo; // Override with custom elo if provided
        
        // If bot is white, make the first move
        if (myPlayerColor === 'b') { botThinking = true; setTimeout(triggerBot, 500); }
    }
    
    matchRef = db.ref('matches/' + matchId);
    matchRef.on('value', snapshot => {
        let data = snapshot.val();
        if (data && data.fen !== game.fen() && data.fen !== "start") {
            game.load(data.fen);
            board.position(game.fen());
            handleMoveVisuals({ san: data.lastMove }, true);
        }
    });
    updateStatus();
}

// ==========================================
// 6. GAME FLOW & CLICK-TO-MOVE
// ==========================================
function startGame(isCustomFen = false) {
    if(!isCustomFen) { game.reset(); board.start(); } else { board.position(game.fen()); }
    board.orientation('white');
    gameActive = true; botThinking = false; selectedSquare = null;
    gameHistory = [{fen: game.fen(), move: 'start', color: null}];
    myPlayerColor = 'w'; 
    
    ['resign-btn', 'draw-btn', 'undo-btn'].forEach(id => document.getElementById(id).disabled = false);
    document.getElementById('chat-messages').innerHTML = '';
    
    if (currentMode === 'bot') {
        currentBot = allBots.find(b => b.id === document.getElementById('bot-select').value);
        botChat(`Good luck! I play at ${currentBot.elo} strength.`);
        document.getElementById('black-name').innerText = currentBot.name;
    } else {
        document.getElementById('black-name').innerText = "Player 2";
    }
    
    updateStatus();
    if(game.turn() === 'b' && currentMode !== 'pvp') { botThinking = true; setTimeout(triggerBot, 500); }
}

function setupClickToMove() {
    $(document).on('click', '.square-55d63', function() {
        if (!gameActive || botThinking) return;
        
        let square = $(this).attr('data-square');
        if (!square) return;

        let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
        if (!isMyTurn && currentMode === 'online') return;

        if (selectedSquare) {
            let move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move) {
                board.position(game.fen());
                clearHighlights(); selectedSquare = null;
                handleMoveVisuals(move, false);
                
                if (currentMode === 'online' && matchRef) matchRef.update({ fen: game.fen(), lastMove: move.san, turn: game.turn() });
                
                // Trigger local bot logic for offline or admin bot matches
                if ((currentMode === 'bot' || matchId) && gameActive && game.turn() !== myPlayerColor) { 
                    botThinking = true; window.setTimeout(triggerBot, 250); 
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

function highlightLegalMoves(square) {
    clearHighlights(); selectedSquare = square;
    $('#myBoard .square-' + square).addClass('selected-square');
    game.moves({ square: square, verbose: true }).forEach(m => $('#myBoard .square-' + m.to).addClass('legal-move'));
}

function onDragStart(source, piece) {
    if (!gameActive || game.game_over() || botThinking) return false;
    let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
    if (!isMyTurn) return false; 
    let moves = game.moves({ square: source, verbose: true });
    if (moves.length === 0) return false; 
    highlightLegalMoves(source);
}

function onDrop(source, target) {
    clearHighlights(); selectedSquare = null;
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback'; 
    handleMoveVisuals(move, false);
    
    if (currentMode === 'online' && matchRef) matchRef.update({ fen: game.fen(), lastMove: move.san, turn: game.turn() });
    
    if ((currentMode === 'bot' || matchId) && gameActive && game.turn() !== myPlayerColor) { 
        botThinking = true; window.setTimeout(triggerBot, 250); 
    }
}

function makeMoveOnBoard(moveStr) {
    let move = game.move(moveStr, { sloppy: true }); board.position(game.fen());
    botThinking = false;
    handleMoveVisuals(move, false); 
    if (currentMode === 'online' && matchRef) matchRef.update({ fen: game.fen(), lastMove: move.san, turn: game.turn() });
}

function handleMoveVisuals(move, isSync) {
    if (game.in_checkmate() || game.game_over()) playSound('end'); else if (game.in_check()) playSound('check'); else if (move.captured) playSound('capture'); else playSound('move');
    if(!isSync) gameHistory.push({ fen: game.fen(), move: move.san, color: game.turn() === 'w' ? 'b' : 'w' });
    calculateMaterial(); updateStatus(); updateEvalBar(); checkGameOver();
}

function clearHighlights() { $('#myBoard .square-55d63').removeClass('legal-move in-check selected-square'); }
function highlightCheck() {
    if (game.in_check()) {
        let b = game.board(), col = game.turn();
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(b[r][c] && b[r][c].type === 'k' && b[r][c].color === col) $('#myBoard .square-' + ('abcdefgh'[c] + (8-r))).addClass('in-check');
    }
}
function rebuildMoveTable() {
    let tbody = document.getElementById('move-tbody'); tbody.innerHTML = '';
    for(let i=1; i<gameHistory.length; i+=2) {
        tbody.innerHTML += `<tr><td>${Math.ceil(i / 2)}.</td><td>${gameHistory[i].move}</td><td>${gameHistory[i+1] ? gameHistory[i+1].move : '...'}</td></tr>`;
    }
    document.getElementById('move-history-panel').scrollTop = document.getElementById('move-history-panel').scrollHeight;
}

// ==========================================
// 7. BOT ENGINE
// ==========================================
function triggerBot() {
    if (!gameActive || !engine) return; 
    let possibleMoves = game.moves({ verbose: true });
    
    // Handle Custom Styles
    if (currentBot && currentBot.type === 'behavior') {
        if (currentBot.style === 'berserker') {
            let caps = possibleMoves.filter(m => m.captured);
            if (caps.length > 0 && Math.random() < 0.9) return executeBotMove(caps[Math.floor(Math.random() * caps.length)].san);
        }
        if (currentBot.style === 'turtle') {
            let def = possibleMoves.filter(m => (game.turn() === 'w' ? m.to[1] <= '4' : m.to[1] >= '5'));
            if (def.length > 0 && Math.random() < 0.8) return executeBotMove(def[Math.floor(Math.random() * def.length)].san);
        }
        if (currentBot.style === 'sniper') {
            let snipes = possibleMoves.filter(m => (m.piece === 'b' || m.piece === 'r') && Math.abs(m.to.charCodeAt(0) - m.from.charCodeAt(0)) > 2);
            if (snipes.length > 0 && Math.random() < 0.8) return executeBotMove(snipes[Math.floor(Math.random() * snipes.length)].san);
        }
    }

    if (currentBot && currentBot.type === 'personality') {
        let favMoves = possibleMoves.filter(m => m.piece === currentBot.fav);
        if (favMoves.length > 0 && Math.random() < 0.75) return executeBotMove(favMoves[Math.floor(Math.random() * favMoves.length)].san);
    }

    let elo = currentBot ? currentBot.elo : 1200;
    let depth = Math.max(1, Math.min(20, Math.floor(elo / 150))); 
    let skillLevel = Math.max(0, Math.min(20, Math.floor((elo - 500) / 100)));
    let moveTime = Math.max(100, Math.min(3000, Math.floor(elo / 1.5)));
    let multiPvCount = elo < 1000 ? 5 : 1;
    
    currentEngineMoves = []; 
    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    engine.postMessage(`setoption name MultiPV value ${multiPvCount}`);
    engine.postMessage('position fen ' + game.fen());
    engine.postMessage(`go depth ${depth} movetime ${moveTime}`);
}

function handleEngineMessage(event) {
    let line = event.data;
    if (line.includes('info depth') && line.includes('multipv')) {
        let pvMatch = line.match(/multipv (\d+).* pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (pvMatch) currentEngineMoves[parseInt(pvMatch[1]) - 1] = pvMatch[2];
    }
    
    if (line.startsWith('bestmove')) {
        let bestMove = line.split(' ')[1];
        let moveToPlay = bestMove;
        let elo = currentBot ? currentBot.elo : 1200;
        
        if (elo < 1000 && currentEngineMoves.length > 1) {
            let targetIndex = Math.floor((1000 - elo) / 200); 
            targetIndex = Math.min(targetIndex, currentEngineMoves.length - 1);
            if (currentEngineMoves[targetIndex]) moveToPlay = currentEngineMoves[targetIndex];
        }
        executeBotMove(moveToPlay);
    }
}

function executeBotMove(san) {
    let delay = Math.floor(Math.random() * 1000) + 500; 
    setTimeout(() => makeMoveOnBoard(san), delay);
}

// ==========================================
// 8. UTILITIES, END GAME & ANALYSIS
// ==========================================
function calculateMaterial() {
    let counts = { w: {p:0,n:0,b:0,r:0,q:0}, b: {p:0,n:0,b:0,r:0,q:0} };
    let boardState = game.board();
    for(let r=0; r<8; r++) for(let c=0; c<8; c++) { let piece = boardState[r][c]; if(piece && piece.type !== 'k') counts[piece.color][piece.type]++; }
    let start = {p:8, n:2, b:2, r:2, q:1};
    let deadW = '', deadB = '', scoreW = 0, scoreB = 0;
    for (let p in start) {
        let missingW = start[p] - counts.w[p]; let missingB = start[p] - counts.b[p];
        for(let i=0; i<missingW; i++) { deadW += `<div class="grave-piece" style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/w${p.toUpperCase()}.png')"></div>`; scoreB += PIECE_VALUES[p]; }
        for(let i=0; i<missingB; i++) { deadB += `<div class="grave-piece" style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/b${p.toUpperCase()}.png')"></div>`; scoreW += PIECE_VALUES[p]; }
    }
    document.getElementById('grave-w').innerHTML = deadB; document.getElementById('grave-b').innerHTML = deadW;
    let diff = scoreW - scoreB;
    document.getElementById('mat-w').innerText = diff > 0 ? `+${diff}` : ''; document.getElementById('mat-b').innerText = diff < 0 ? `+${Math.abs(diff)}` : '';
}

async function updateEvalBar() {
    if (!analysisEngine || !gameActive) return;
    let score = await evaluatePositionAsync(game.fen());
    let cappedScore = Math.max(-1000, Math.min(1000, score));
    let percentage = 50 + (cappedScore / 20); 
    if (game.turn() === 'b') percentage = 100 - percentage; 
    document.getElementById('eval-bar-fill').style.height = percentage + '%';
}

function tickTimer() {
    if(!gameActive) return;
    game.turn() === 'w' ? timeW-- : timeB--; updateClocks();
    if(timeW <= 0) endGame('loss', "Black wins on time");
    if(timeB <= 0) endGame('win', "White wins on time");
}

function updateClocks() {
    if(parseInt(document.getElementById('time-control').value) === 0) return;
    let fmt = (s) => `${Math.floor(s/60)}:${(s%60).toString().padStart(2,'0')}`;
    document.getElementById('timer-w').innerText = fmt(timeW); document.getElementById('timer-b').innerText = fmt(timeB);
    document.getElementById('timer-w').classList.toggle('active', game.turn() === 'w'); document.getElementById('timer-b').classList.toggle('active', game.turn() === 'b');
}

function checkGameOver() {
    if (!game.game_over()) return;
    let result = 'draw', msg = "Game drawn.";
    if (game.in_checkmate()) { result = game.turn() === 'w' ? 'loss' : 'win'; msg = result === 'win' ? "You win! Checkmate." : "Checkmate."; }
    endGame(result, msg);
}

function endGame(result, msg) {
    gameActive = false; botThinking = false; clearInterval(timerInterval);
    ['resign-btn', 'draw-btn', 'undo-btn', 'remove-timer-btn'].forEach(id => document.getElementById(id).disabled = true);
    updateStatus(msg); botChat(msg);
    if(analysisEngine) runGameAnalysis();
}

function updateStatus(override) { document.getElementById('status').innerText = override || `${game.turn() === 'w' ? 'White' : 'Black'} to move`; }
function botChat(msg) { document.getElementById('chat-messages').innerHTML += `<p><strong style="color:#5865f2;">System:</strong> ${msg}</p>`; document.getElementById('chat-box').scrollTop = 9999; }
function updateProfileUI() { document.getElementById('player-elo-display').innerText = playerProfile.elo || "Unranked"; document.getElementById('placement-warning').style.display = playerProfile.elo ? 'none' : 'block'; }
function updateLeaderboardUI() { 
    let lb = document.getElementById('leaderboard-stats'); lb.innerHTML = ''; 
    let d = JSON.parse(localStorage.getItem('chessLeaderboard')) || {}; 
    for (let [id, s] of Object.entries(d)) lb.innerHTML += `<div class="stat-row"><span class="stat-name">${s.name}</span><span class="stat-score">${s.wins}W - ${s.losses}L - ${s.draws || 0}D</span></div>`; 
}

function evaluatePositionAsync(fen) {
    return new Promise(res => {
        if(!analysisEngine) return res(0);
        let score = 0, listener = e => {
            if (e.data.includes('score cp')) { let m = e.data.match(/score cp (-?\d+)/); if(m) score = parseInt(m[1]); }
            if (e.data.includes('bestmove')) { analysisEngine.removeEventListener('message', listener); res(score); }
        };
        analysisEngine.addEventListener('message', listener);
        analysisEngine.postMessage('position fen ' + fen); analysisEngine.postMessage('go depth 12'); 
    });
}

async function runGameAnalysis() {
    document.getElementById('analysis-panel').style.display = 'block';
    let bEl = document.getElementById('move-breakdown'), pEl = document.getElementById('analysis-progress');
    bEl.innerHTML = ''; let stats = { brilliant: 0, great: 0, mistake: 0, blunder: 0 }, prev = 0;
    
    for (let i = 1; i < gameHistory.length; i++) {
        pEl.innerText = `(${i}/${gameHistory.length - 1})`;
        let move = gameHistory[i];
        let raw = await evaluatePositionAsync(move.fen);
        let isWhiteNext = move.fen.includes(' w ');
        let evalForWhite = isWhiteNext ? raw : -raw; 
        let diff = evalForWhite - prev;
        
        if (move.color === 'w') {
            let tag = "", col = "";
            if (diff < -300) { tag = "Blunder ??"; col = "#e74c3c"; stats.blunder++; }
            else if (diff < -100) { tag = "Mistake ?"; col = "#f1c40f"; stats.mistake++; }
            else if (diff > 150 && evalForWhite > 0) { tag = "Brilliant !!"; col = "#1abc9c"; stats.brilliant++; }
            else if (diff > 50) { tag = "Great !"; col = "#3498db"; stats.great++; }
            if (tag) bEl.innerHTML += `<p><strong style="color:${col}">${tag}</strong> on move ${move.move}</p>`;
        }
        prev = evalForWhite;
    }
    document.getElementById('analysis-status').innerHTML = "<strong>Complete!</strong>";
    document.getElementById('stat-brilliant').innerText = stats.brilliant; document.getElementById('stat-great').innerText = stats.great;
    document.getElementById('stat-mistake').innerText = stats.mistake; document.getElementById('stat-blunder').innerText = stats.blunder;
}
