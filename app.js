// ==========================================
// 0. SYSTEM ERROR LOGGER
// ==========================================
window.onerror = function(msg, url, line) {
    const dbg = document.getElementById('debug-log');
    if (dbg) {
        dbg.style.display = 'block';
        document.getElementById('error-list').innerHTML += `<li>${msg} (Line: ${line})</li>`;
    }
    console.error("Error: " + msg + "\nLine: " + line);
    return false;
};

// ==========================================
// 1. SOUND EFFECTS & BOT FACTORY
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
    let pieces = { 'q': 'Queen', 'n': 'Knight', 'b': 'Bishop' }; 
    allBots.push({ id: 'pers_' + name.toLowerCase().replace(/[^a-z0-9]/g, ''), name: `${name} (${pieces[pieceLetter]} Lover)`, elo: elo, type: 'personality', fav: pieceLetter.toLowerCase() }); 
}

addBot("Timmy The Terrible", 100);
addBot("Jimmy", 550);
addBot("Nelson", 800);
addBot("Maria", 1200);
addBot("Viktor", 1800);
addBot("Magnus", 2800);

// ==========================================
// 2. SYSTEM VARIABLES
// ==========================================
let board = null, game = null;
let currentMode = 'bot', currentBot = null;
let engine = null, analysisEngine = null;
let gameActive = false, botThinking = false;
let gameHistory = []; 
let timeW = 600, timeB = 600, timerInterval = null;
let selectedSquare = null; 
let playerProfile = JSON.parse(localStorage.getItem('chessProfile')) || { elo: null, placementGames: 0, placementScore: 0 };

const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

const config = {
    draggable: true, position: 'start',
    onDragStart: onDragStart, onDrop: onDrop,
    onSnapEnd: function() { board.position(game.fen()); clearHighlights(); highlightCheck(); },
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

// ==========================================
// 3. INITIALIZATION & UI
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
    updateProfileUI(); populateBotDropdown();
    
    loadEngine().then(w => { engine = w; engine.onmessage = handleEngineMessage; }).catch(() => console.error("Engine failed."));
    loadEngine().then(w => { analysisEngine = w; });

    document.getElementById('game-mode').addEventListener('change', (e) => {
        currentMode = e.target.value;
        document.getElementById('bot-settings').style.display = currentMode === 'bot' ? 'block' : 'none';
    });
    
    document.getElementById('board-theme').addEventListener('change', (e) => { document.body.className = e.target.value; });

    document.getElementById('load-fen-btn').addEventListener('click', () => {
        let fen = document.getElementById('fen-input').value.trim();
        if (game.load(fen)) { startGame(true); document.getElementById('fen-input').value = ''; } 
        else { alert("Invalid FEN string."); }
    });

    document.getElementById('start-btn').addEventListener('click', () => startGame(false));
    document.getElementById('resign-btn').addEventListener('click', () => { if(gameActive) endGame('loss', "Black wins by resignation"); });
    
    document.getElementById('draw-btn').addEventListener('click', async () => { 
        if(!gameActive || currentMode === 'pvp') return;
        botChat("Let me evaluate the board...");
        
        let score = await evaluatePositionAsync(game.fen());
        let botScore = game.turn() === 'b' ? score : -score; 
        
        if (botScore > 100) { botChat("No way! I am winning this."); } 
        else if (botScore < -150) { endGame('draw', "Okay, you drive a hard bargain. Draw accepted."); } 
        else { endGame('draw', "It's a dead draw anyway. I accept."); }
    });
    
    document.getElementById('remove-timer-btn').addEventListener('click', () => {
        if (!gameActive) return;
        clearInterval(timerInterval);
        document.querySelectorAll('.clock').forEach(c => c.style.display = 'none');
        document.getElementById('remove-timer-btn').disabled = true;
        botChat("Timer removed. Take your time!");
    });

    document.getElementById('undo-btn').addEventListener('click', () => {
        if (!gameActive || botThinking || gameHistory.length <= 1) return;
        game.undo(); let slice = -1;
        if (currentMode !== 'pvp') { game.undo(); slice = -2; }
        
        board.position(game.fen());
        gameHistory = gameHistory.slice(0, slice);
        rebuildMoveTable(); calculateMaterial();
        clearHighlights(); highlightCheck(); updateStatus();
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => { localStorage.clear(); location.reload(); });
    document.getElementById('download-pgn').addEventListener('click', () => {
        const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([game.pgn()], {type: 'text/plain'}));
        a.download = `game_${Date.now()}.pgn`; a.click();
    });

    game = new Chess(); board = Chessboard('myBoard', config);
    setupClickToMove();
    updateLeaderboardUI();
});

function populateBotDropdown() {
    let select = document.getElementById('bot-select');
    allBots.forEach(b => { let opt = document.createElement('option'); opt.value = b.id; opt.textContent = b.name; select.appendChild(opt); });
}
function loadEngine() { return fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js').then(res => res.text()).then(code => new Worker(URL.createObjectURL(new Blob([code], {type: 'application/javascript'})))); }

// ==========================================
// 4. GAME FLOW, HIGHLIGHT LOGIC & CLICK TO MOVE
// ==========================================
function startGame(isCustomFen = false) {
    if(!isCustomFen) { game.reset(); board.start(); } else { board.position(game.fen()); }
    
    gameActive = true; botThinking = false; selectedSquare = null;
    gameHistory = [{fen: game.fen(), move: 'start', color: null}];
    
    ['resign-btn', 'draw-btn', 'undo-btn'].forEach(id => document.getElementById(id).disabled = false);
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('analysis-panel').style.display = 'none';
    document.getElementById('move-tbody').innerHTML = '';
    
    calculateMaterial();
    
    let startingTime = parseInt(document.getElementById('time-control').value);
    timeW = startingTime; timeB = startingTime; 
    clearInterval(timerInterval); 
    
    let clocks = document.querySelectorAll('.clock');
    if (startingTime > 0) {
        clocks.forEach(c => c.style.display = 'block');
        updateClocks(); timerInterval = setInterval(tickTimer, 1000);
        document.getElementById('remove-timer-btn').disabled = false;
    } else {
        clocks.forEach(c => c.style.display = 'none');
        document.getElementById('remove-timer-btn').disabled = true;
    }
    
    clearHighlights();
    
    if (currentMode === 'placement') {
        currentBot = { id: 'placement_bot', name: `Evaluator`, elo: playerProfile.placementGames === 0 ? 1200 : (playerProfile.placementScore > 0 ? 1600 : 800), type: 'ladder' };
        botChat(`Placement Game ${playerProfile.placementGames + 1}/3.`);
    } else if (currentMode === 'bot') {
        currentBot = allBots.find(b => b.id === document.getElementById('bot-select').value);
        botChat(`Good luck! I play at ${currentBot.elo} strength.`);
    } else { botChat(`2-Player Mode. White to move.`); }
    
    document.getElementById('black-name').innerText = currentMode === 'pvp' ? "Player 2" : currentBot.name;
    updateStatus();
    
    if(game.turn() === 'b' && currentMode !== 'pvp') { botThinking = true; setTimeout(triggerBot, 500); }
}

// FIXED: Intercept mousedown before drag logic swallows the click
function setupClickToMove() {
    $('#myBoard').on('mousedown', '.square-55d63, .piece-417db', function(e) {
        if (!gameActive || botThinking) return;
        
        let squareEl = $(e.target).closest('.square-55d63');
        if (!squareEl.length) return;
        
        let square = squareEl.attr('data-square');
        
        if (selectedSquare) {
            let move = game.move({ from: selectedSquare, to: square, promotion: 'q' });
            if (move) {
                board.position(game.fen());
                clearHighlights(); selectedSquare = null;
                handleMoveVisuals(move);
                if (currentMode !== 'pvp' && gameActive && game.turn() === 'b') { 
                    botThinking = true; document.getElementById('undo-btn').disabled = true; window.setTimeout(triggerBot, 250); 
                }
            } else {
                let piece = game.get(square);
                if (piece && piece.color === game.turn()) highlightLegalMoves(square);
                else { clearHighlights(); selectedSquare = null; }
            }
        } else {
            let piece = game.get(square);
            if (piece && piece.color === game.turn()) highlightLegalMoves(square);
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
    if (currentMode !== 'pvp' && piece.search(/^b/) !== -1) return false; 
    let moves = game.moves({ square: source, verbose: true });
    if (moves.length === 0) return false; 
    highlightLegalMoves(source);
}

function onDrop(source, target) {
    clearHighlights(); selectedSquare = null;
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback'; 
    handleMoveVisuals(move);
    if (currentMode !== 'pvp' && gameActive && game.turn() === 'b') { botThinking = true; document.getElementById('undo-btn').disabled = true; window.setTimeout(triggerBot, 250); }
}

function makeMoveOnBoard(moveStr) {
    let move = game.move(moveStr, { sloppy: true }); board.position(game.fen());
    botThinking = false; document.getElementById('undo-btn').disabled = false;
    handleMoveVisuals(move); highlightCheck(); 
}

function handleMoveVisuals(move) {
    if (game.in_checkmate() || game.game_over()) playSound('end'); else if (game.in_check()) playSound('check'); else if (move.captured) playSound('capture'); else playSound('move');
    recordMove(move.san, game.turn() === 'w' ? 'b' : 'w');
    calculateMaterial(); updateStatus(); checkGameOver();
}

function clearHighlights() { $('#myBoard .square-55d63').removeClass('legal-move in-check selected-square'); }
function highlightCheck() {
    if (game.in_check()) {
        let b = game.board(), col = game.turn();
        for(let r=0; r<8; r++) for(let c=0; c<8; c++) if(b[r][c] && b[r][c].type === 'k' && b[r][c].color === col) $('#myBoard .square-' + ('abcdefgh'[c] + (8-r))).addClass('in-check');
    }
}
function recordMove(san, color) { gameHistory.push({ fen: game.fen(), move: san, color: color }); rebuildMoveTable(); }
function rebuildMoveTable() {
    let tbody = document.getElementById('move-tbody'); tbody.innerHTML = '';
    for(let i=1; i<gameHistory.length; i+=2) {
        tbody.innerHTML += `<tr><td>${Math.ceil(i / 2)}.</td><td>${gameHistory[i].move}</td><td>${gameHistory[i+1] ? gameHistory[i+1].move : '...'}</td></tr>`;
    }
    let p = document.getElementById('move-history-panel'); p.scrollTop = p.scrollHeight;
}

// ==========================================
// 5. MATERIAL CALCULATOR
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

// ==========================================
// 6. BOT ENGINE (Pure Native Elo Constraints)
// ==========================================
function triggerBot() {
    if (!gameActive) return;
    if (!engine) return window.setTimeout(triggerBot, 500); 

    let possibleMoves = game.moves({ verbose: true });
    
    if (currentBot.type === 'personality') {
        let favMoves = possibleMoves.filter(m => m.piece === currentBot.fav);
        if (favMoves.length > 0 && Math.random() < 0.75) { botChat(`Behold my favorite piece!`); return makeMoveOnBoard(favMoves[Math.floor(Math.random() * favMoves.length)].san); }
    }

    let elo = currentBot.elo;
    
    // NATIVE ELO MATH: No RNG blunders, just strictly limiting Stockfish's brain
    // Depth: Hard restricted to 1 move deep for beginners, climbs to 20 for GM.
    let depth = Math.max(1, Math.min(20, Math.floor(elo / 150))); 
    
    // Skill Level: Kept at 0 until ~500 Elo, then climbs.
    let skillLevel = Math.max(0, Math.min(20, Math.floor((elo - 500) / 100)));
    
    // Move Time: Force lower bots to 'panic' and spit out moves without calculating
    let moveTime = Math.max(10, Math.min(3000, Math.floor(elo / 1.5)));

    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    engine.postMessage('position fen ' + game.fen());
    engine.postMessage(`go depth ${depth} movetime ${moveTime}`);
}

function handleEngineMessage(event) {
    if (event.data.startsWith('bestmove')) {
        let move = event.data.split(' ')[1];
        let delay = Math.floor(Math.random() * 1000) + 500; 
        setTimeout(() => makeMoveOnBoard(move), delay);
    }
}

// ==========================================
// 7. END GAME & TIMERS
// ==========================================
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
    let result = 'draw', msg = "A draw.";
    if (game.in_checkmate()) { result = game.turn() === 'w' ? 'loss' : 'win'; msg = result === 'win' ? "You win! Checkmate." : "Checkmate."; }
    endGame(result, msg);
}
function endGame(result, msg) {
    gameActive = false; botThinking = false; clearInterval(timerInterval);
    ['resign-btn', 'draw-btn', 'undo-btn', 'remove-timer-btn'].forEach(id => document.getElementById(id).disabled = true);
    updateStatus(msg); botChat(msg);
    
    if (currentMode === 'placement') {
        playerProfile.placementGames++;
        if (result === 'win') playerProfile.placementScore++; if (result === 'loss') playerProfile.placementScore--;
        if (playerProfile.placementGames >= 3) playerProfile.elo = 1200 + (playerProfile.placementScore * 300);
        localStorage.setItem('chessProfile', JSON.stringify(playerProfile)); updateProfileUI();
    } else if (currentMode === 'bot') {
        let d = JSON.parse(localStorage.getItem('chessLeaderboard')) || {};
        if (!d[currentBot.id]) d[currentBot.id] = { wins: 0, losses: 0, name: currentBot.name };
        result === 'win' ? d[currentBot.id].wins++ : d[currentBot.id].losses++;
        localStorage.setItem('chessLeaderboard', JSON.stringify(d)); updateLeaderboardUI();
    }
    if(analysisEngine) runGameAnalysis();
}

function updateStatus(override) { document.getElementById('status').innerText = override || `${game.turn() === 'w' ? 'White' : 'Black'} to move`; }
function botChat(msg) { document.getElementById('chat-messages').innerHTML += `<p><strong style="color:#5865f2;">System:</strong> ${msg}</p>`; document.getElementById('chat-box').scrollTop = 9999; }
function updateProfileUI() { document.getElementById('player-elo-display').innerText = playerProfile.elo || "Unranked"; document.getElementById('placement-warning').style.display = playerProfile.elo ? 'none' : 'block'; }
function updateLeaderboardUI() { let lb = document.getElementById('leaderboard-stats'); lb.innerHTML = ''; let d = JSON.parse(localStorage.getItem('chessLeaderboard')) || {}; for (let [id, s] of Object.entries(d)) lb.innerHTML += `<div class="stat-row"><span class="stat-name">${s.name}</span><span class="stat-score">${s.wins}W - ${s.losses}L</span></div>`; }

// ==========================================
// 8. ASYNC ANALYSIS
// ==========================================
function evaluatePositionAsync(fen) {
    return new Promise(res => {
        if(!analysisEngine) return res(0);
        let score = 0, listener = e => {
            if (e.data.includes('score cp')) { let m = e.data.match(/score cp (-?\d+)/); if(m) score = parseInt(m[1]); }
            if (e.data.includes('bestmove')) { analysisEngine.removeEventListener('message', listener); res(score); }
        };
        analysisEngine.addEventListener('message', listener);
        analysisEngine.postMessage('position fen ' + fen); analysisEngine.postMessage('go depth 8');
    });
}
async function runGameAnalysis() {
    document.getElementById('analysis-panel').style.display = 'block';
    let bEl = document.getElementById('move-breakdown'), pEl = document.getElementById('analysis-progress');
    bEl.innerHTML = ''; let stats = { brilliant: 0, great: 0, mistake: 0, blunder: 0 }, prev = 0;
    
    for (let i = 1; i < gameHistory.length; i++) {
        pEl.innerText = `(${i}/${gameHistory.length - 1})`;
        let move = gameHistory[i], raw = await evaluatePositionAsync(move.fen);
        let ev = game.turn() === 'w' ? raw : -raw, diff = ev - prev;
        
        if (move.color === 'w') {
            let tag = "", col = "";
            if (diff < -300) { tag = "Blunder ??"; col = "#e74c3c"; stats.blunder++; }
            else if (diff < -150) { tag = "Mistake ?"; col = "#f1c40f"; stats.mistake++; }
            else if (diff > 200 && ev > 0) { tag = "Brilliant !!"; col = "#1abc9c"; stats.brilliant++; }
            else if (diff > 100) { tag = "Great !"; col = "#3498db"; stats.great++; }
            if (tag) bEl.innerHTML += `<p><strong style="color:${col}">${tag}</strong> on move ${move.move}</p>`;
        }
        prev = ev;
    }
    document.getElementById('analysis-status').innerHTML = "<strong>Complete!</strong>";
    document.getElementById('stat-brilliant').innerText = stats.brilliant; document.getElementById('stat-great').innerText = stats.great;
    document.getElementById('stat-mistake').innerText = stats.mistake; document.getElementById('stat-blunder').innerText = stats.blunder;
}
