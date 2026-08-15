// =================================================================
// 0. FIREBASE & AUTH SETUP
// =================================================================
const firebaseConfig = {
    apiKey: "AIzaSyBNeg6-whOIiX4yWWPgffOZY6xm0wrvpu0",
    authDomain: "chess-faac6.firebaseapp.com",
    databaseURL: "https://chess-faac6-default-rtdb.firebaseio.com",
    projectId: "chess-faac6",
    storageBucket: "chess-faac6.firebasestorage.app",
    messagingSenderId: "395409063256",
    appId: "1:395409063256:web:617565e068905312e1f92d"
};

if (firebase.apps.length === 0 && firebaseConfig.apiKey) firebase.initializeApp(firebaseConfig);
const auth = typeof firebase !== 'undefined' && firebase.auth ? firebase.auth() : null;
const db = typeof firebase !== 'undefined' && firebase.database ? firebase.database() : null;
let currentUser = null;

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
// 2. EXPANDED STRATEGY BOT FACTORY & ROSTER
// =================================================================
const allBots = [];
function registerBot(id, name, elo, category, behaviorFn) {
    allBots.push({ id, name: `${name} (${elo})`, elo, category, behavior: behaviorFn });
}

// Tactical & Style Archetypes
registerBot('bot_toddler', 'Toddler Toby', 150, 'beginner', moves => moves[Math.floor(Math.random() * moves.length)]);
registerBot('bot_pawn_pusher', 'Paula Pawn', 450, 'strategy', moves => {
    let pMoves = moves.filter(m => m.piece === 'p');
    return pMoves.length ? pMoves[Math.floor(Math.random() * pMoves.length)] : null;
});
registerBot('bot_berserker', 'Boris Berserker', 750, 'aggressive', moves => {
    let caps = moves.filter(m => m.captured);
    return caps.length ? caps[Math.floor(Math.random() * caps.length)] : null;
});
registerBot('bot_gambiteer', 'Garry Gambiteer', 1050, 'aggressive', moves => {
    let aggressive = moves.filter(m => m.captured || m.san.includes('+') || m.piece === 'n' || m.piece === 'q');
    return aggressive.length ? aggressive[Math.floor(Math.random() * aggressive.length)] : null;
});
registerBot('bot_turtle', 'Tina Turtle', 1250, 'solid', moves => {
    let defMoves = moves.filter(m => (m.color === 'w' ? m.to[1] <= '4' : m.to[1] >= '5'));
    return defMoves.length ? defMoves[Math.floor(Math.random() * defMoves.length)] : null;
});
registerBot('bot_sniper', 'Sam Sniper', 1450, 'positional', moves => {
    let longRange = moves.filter(m => (m.piece === 'b' || m.piece === 'r') && Math.abs(m.to.charCodeAt(0) - m.from.charCodeAt(0)) >= 2);
    return longRange.length ? longRange[Math.floor(Math.random() * longRange.length)] : null;
});
registerBot('bot_fianchetto', 'Felix Fianchetto', 1600, 'positional', moves => {
    let fMoves = moves.filter(m => ['g3','b3','g6','b6','bg2','bb2','bg7','bb7'].some(sq => m.san.toLowerCase().includes(sq)));
    return fMoves.length ? fMoves[Math.floor(Math.random() * fMoves.length)] : null;
});
registerBot('bot_grinder', 'Gordon Grinder', 1850, 'endgame', moves => moves.find(m => m.piece === 'r' || m.piece === 'k') || null);
registerBot('bot_tactician', 'Tanya Tactician', 2100, 'tactical', () => null); // Relies purely on deep Stockfish tactical lines
registerBot('bot_master', 'Magnus Mode', 2800, 'grandmaster', () => null);

// Populate Standard Calibration Bots for Elo Placement
const PLACEMENT_BENCHMARKS = [600, 900, 1200, 1500, 1800];

// =================================================================
// 3. PLAYER STYLE DNA & FINGERPRINTING SYSTEM
// =================================================================
const DEFAULT_DNA = {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    acpl: 45, // Average Centipawn Loss
    aggression: 50, // % of checks/captures/early queen moves
    tactics: 50, // % of tactical moves identified
    positional: 50, // piece development & pawn integrity
    endgame: 50, // conversion when material is equal/advantaged
    resilience: 50, // recovery from blunders
    preferredPieces: { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 },
    blunderTendencies: { queenEarly: 0, missedTactic: 0, timeTrouble: 0, hangingPiece: 0 },
    calculatedElo: null
};

let playerDNA = JSON.parse(localStorage.getItem('chessPlayerDNA')) || DEFAULT_DNA;
let activeCloneDNA = null; // Used when playing against an imported or local clone

function savePlayerDNA() {
    localStorage.setItem('chessPlayerDNA', JSON.stringify(playerDNA));
    updateProfileUI();
}

function analyzeGameForDNA(history, evaluations, playerColor) {
    let userMoves = history.filter(h => h.color === playerColor);
    if (userMoves.length === 0) return;

    let captures = 0, checks = 0, pawnPushes = 0;
    let pieceFreq = { p: 0, n: 0, b: 0, r: 0, q: 0, k: 0 };
    let cpLossTotal = 0;

    userMoves.forEach(m => {
        if (m.move.includes('x')) captures++;
        if (m.move.includes('+')) checks++;
        if (m.piece) pieceFreq[m.piece] = (pieceFreq[m.piece] || 0) + 1;
        if (m.cpLoss) cpLossTotal += Math.min(400, Math.max(0, m.cpLoss));
    });

    let currentACPL = userMoves.length > 0 ? (cpLossTotal / userMoves.length) : 50;
    let moveCount = userMoves.length;

    // Adapt DNA
    playerDNA.gamesPlayed++;
    playerDNA.acpl = Math.round((playerDNA.acpl * 0.8) + (currentACPL * 0.2));
    playerDNA.aggression = Math.min(100, Math.max(10, Math.round((playerDNA.aggression * 0.8) + (((captures + checks) / moveCount) * 100 * 1.5) * 0.2)));
    playerDNA.tactics = Math.min(100, Math.max(10, Math.round(100 - (playerDNA.acpl * 0.8))));
    playerDNA.positional = Math.min(100, Math.max(10, Math.round(100 - (playerDNA.blunderTendencies.hangingPiece * 5))));
    
    // Estimate Elo from ACPL and Win Rate
    let estElo = Math.max(300, Math.min(2900, Math.round(3000 - (playerDNA.acpl * 28))));
    playerDNA.calculatedElo = playerDNA.calculatedElo ? Math.round((playerDNA.calculatedElo * 0.7) + (estElo * 0.3)) : estElo;

    savePlayerDNA();
}

function getDNAInsights() {
    let insights = [];
    if (playerDNA.aggression > 65) insights.push("⚔️ Highly aggressive attacker: frequently trades and looks for checks.");
    else if (playerDNA.aggression < 35) insights.push("🛡️ Ultra-defensive: prefers solid structures and avoids risky gambits.");

    if (playerDNA.acpl < 25) insights.push("🎯 Master-level accuracy: very low average centipawn loss.");
    else if (playerDNA.acpl > 70) insights.push("⚠️ High blunder vulnerability: often loses material in tactical scrambles.");

    if (playerDNA.tactics > 70) insights.push("🔍 Sharp tactical vision: quickly executes forks and pins.");
    else insights.push("📈 Opportunity in tactics: puzzles will rapidly boost rating.");

    return insights;
}

// Clone Predictor Move Generator
function getCloneBotMove(possibleMoves) {
    let targetDNA = activeCloneDNA || playerDNA;
    
    // Check if aggressive tendency triggers a capture/check
    if (Math.random() * 100 < targetDNA.aggression) {
        let aggMoves = possibleMoves.filter(m => m.captured || m.san.includes('+'));
        if (aggMoves.length > 0) return aggMoves[Math.floor(Math.random() * aggMoves.length)].san;
    }

    // Tendency to make errors matching ACPL
    if (Math.random() * 100 < (targetDNA.acpl / 2)) {
        // Play suboptimal move
        return possibleMoves[Math.floor(Math.random() * possibleMoves.length)].san;
    }

    return null; // Fallback to Stockfish rating approximation
}

// =================================================================
// 4. CHESS.COM-STYLE GAME REVIEW & ACCURACY ENGINE
// =================================================================
// Win Probability formula based on Stockfish Centipawns: P(Win) = 1 / (1 + 10^(-cp / 400))
function cpToWinProb(cp) {
    return 1 / (1 + Math.pow(10, -cp / 400));
}

// Chess.com Accuracy Formula approximation per move: 103.166 * e^(-0.0435 * winDiff) - 3.166
function calculateMoveAccuracy(winProbBefore, winProbAfter) {
    let winDiff = Math.max(0, (winProbBefore - winProbAfter) * 100);
    let accuracy = 103.1668 * Math.exp(-0.04354 * winDiff) - 3.1669;
    return Math.max(0, Math.min(100, accuracy));
}

function classifyMove(diffCp, winDiff, isSacrifice = false, isOnlyMove = false) {
    if (diffCp >= 0 && isSacrifice) return { tag: "Brilliant", sym: "!!", key: "brilliant", color: "#1ba599" };
    if (diffCp >= -10 && isOnlyMove) return { tag: "Great", sym: "!", key: "great", color: "#5c8bb0" };
    if (diffCp >= -15) return { tag: "Best", sym: "★", key: "best", color: "#95b645" };
    if (diffCp >= -40) return { tag: "Excellent", sym: "✓", key: "excellent", color: "#96bc4b" };
    if (diffCp >= -80) return { tag: "Good", sym: "✓", key: "good", color: "#8bb158" };
    if (diffCp >= -150) return { tag: "Inaccuracy", sym: "?!", key: "inaccuracy", color: "#f0c15c" };
    if (diffCp >= -300) return { tag: "Mistake", sym: "?", key: "mistake", color: "#e69d41" };
    if (winDiff > 0.35 && diffCp < -400) return { tag: "Miss", sym: "✖", key: "miss", color: "#ea5b5b" };
    return { tag: "Blunder", sym: "??", key: "blunder", color: "#fa412d" };
}

// =================================================================
// 5. GLOBAL STATE & INITIALIZATION
// =================================================================
let board = null, game = null;
let currentMode = 'bot', currentBot = null, matchId = null;
let engine = null, analysisEngine = null;
let gameActive = false, botThinking = false;
let gameHistory = []; 
let timeW = 600, timeB = 600, timerInterval = null;
let selectedSquare = null, myPlayerColor = 'w';
let placementStep = 0;

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
    
    loadEngine().then(w => { engine = w; engine.onmessage = handleEngineMessage; });
    loadEngine().then(w => { analysisEngine = w; });

    // UI Event Handlers
    document.getElementById('game-mode').addEventListener('change', (e) => {
        currentMode = e.target.value;
        document.getElementById('bot-settings').style.display = (currentMode === 'bot') ? 'block' : 'none';
        document.getElementById('placement-panel').style.display = (currentMode === 'placement') ? 'block' : 'none';
    });

    document.getElementById('start-btn').addEventListener('click', () => {
        if (currentMode === 'online') findOnlineMatch();
        else startGame(false);
    });

    document.getElementById('resign-btn').addEventListener('click', () => { if(gameActive) endGame('loss', "Resignation"); });
    document.getElementById('draw-btn').addEventListener('click', handleDrawOffer);
    document.getElementById('undo-btn').addEventListener('click', handleUndo);

    document.getElementById('open-dna-btn').addEventListener('click', openDNAModal);
    document.getElementById('export-dna-btn').addEventListener('click', exportDNAFile);
    document.getElementById('import-dna-file').addEventListener('change', importDNAFile);
    document.getElementById('board-theme').addEventListener('change', e => {
        document.body.className = e.target.value;
    });

    document.getElementById('load-fen-btn').addEventListener('click', () => {
        let fen = document.getElementById('fen-input').value.trim();
        if (game.load(fen)) { board.position(fen); startGame(true); }
        else alert("Invalid FEN string.");
    });

    document.getElementById('clear-data-btn').addEventListener('click', () => {
        if (confirm("Reset player profile, Elo, and DNA metrics?")) {
            localStorage.clear();
            playerDNA = Object.assign({}, DEFAULT_DNA);
            updateProfileUI();
            alert("Profile reset successfully.");
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
        opt.textContent = `${b.name} - [${b.category.toUpperCase()}]`; 
        select.appendChild(opt); 
    });
}

function loadEngine() { 
    return fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(res => res.text())
        .then(code => new Worker(URL.createObjectURL(new Blob([code], {type: 'application/javascript'})))); 
}

// =================================================================
// 6. GAME LIFECYCLE & ENGINE INTEGRATION
// =================================================================
function startGame(isCustomFen = false) {
    if (!isCustomFen) { game.reset(); board.start(); } else { board.position(game.fen()); }
    board.orientation('white');
    gameActive = true; 
    botThinking = false; 
    selectedSquare = null;
    gameHistory = [{ fen: game.fen(), move: 'start', color: null }];
    myPlayerColor = 'w'; 

    let timeChoice = parseInt(document.getElementById('time-control').value);
    timeW = timeChoice || 600; 
    timeB = timeChoice || 600;
    clearInterval(timerInterval);
    if (timeChoice > 0) timerInterval = setInterval(tickTimer, 1000);
    updateClocks();

    ['resign-btn', 'draw-btn', 'undo-btn'].forEach(id => document.getElementById(id).disabled = false);
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('analysis-panel').style.display = 'none';

    // Setup Bot/Opponent logic
    if (currentMode === 'bot') {
        currentBot = allBots.find(b => b.id === document.getElementById('bot-select').value) || allBots[0];
        document.getElementById('black-name').innerText = currentBot.name;
        botChat(`Match started vs ${currentBot.name}. Good luck!`);
    } else if (currentMode === 'clone') {
        document.getElementById('black-name').innerText = "AI Clone (DNA Mimic)";
        botChat("Playing against the neural clone modeled on player DNA.");
    } else if (currentMode === 'placement') {
        let testElo = PLACEMENT_BENCHMARKS[placementStep] || 1200;
        currentBot = { id: 'placement_bot', name: `RLI Evaluator (${testElo})`, elo: testElo, category: 'benchmark', behavior: () => null };
        document.getElementById('black-name').innerText = currentBot.name;
        document.getElementById('placement-progress').innerText = `Match ${placementStep + 1} of 5 (Testing ~${testElo} Elo)`;
        botChat(`Placement Match ${placementStep + 1}: Testing at ${testElo} Elo strength.`);
    } else {
        document.getElementById('black-name').innerText = "Player 2";
    }

    document.getElementById('white-name').innerText = currentUser ? (currentUser.displayName || currentUser.email.split('@')[0]) : "You";
    updateStatus();
}

function handleUndo() {
    if (!gameActive || botThinking || gameHistory.length <= 1) return;
    game.undo(); 
    let slice = -1;
    if (currentMode !== 'pvp') { game.undo(); slice = -2; }
    board.position(game.fen());
    gameHistory = gameHistory.slice(0, slice);
    rebuildMoveTable(); 
    calculateMaterial(); 
    updateEvalBar();
    clearHighlights(); 
    highlightCheck(); 
    updateStatus();
}

async function handleDrawOffer() {
    if (!gameActive || currentMode === 'pvp') return;
    botChat("Evaluating draw request...");
    let score = await evaluatePositionAsync(game.fen());
    let botScore = game.turn() === 'b' ? score : -score; 
    
    if (botScore > 120) botChat("I am in an advantageous position. Draw declined!");
    else if (botScore < -150) endGame('draw', "Draw accepted. You defended well.");
    else endGame('draw', "Position is equal. Draw accepted.");
}

function triggerBot() {
    if (!gameActive || !engine) return;
    let moves = game.moves({ verbose: true });
    if (moves.length === 0) return;

    // 1. Clone Mode
    if (currentMode === 'clone') {
        let cloneMove = getCloneBotMove(moves);
        if (cloneMove) return executeBotMove(cloneMove);
    }

    // 2. Custom Behavior Override
    if (currentBot && typeof currentBot.behavior === 'function') {
        let customMove = currentBot.behavior(moves);
        if (customMove) return executeBotMove(customMove.san || customMove);
    }

    // 3. Stockfish Engine Calculation
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
        let bestMove = line.split(' ')[1];
        executeBotMove(bestMove);
    }
}

function executeBotMove(moveStr) {
    let delay = Math.floor(Math.random() * 400) + 300; 
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
// 7. BOARD INTERACTIONS & VISUALS
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
                clearHighlights(); 
                selectedSquare = null;
                handleMoveVisuals(move, false);
                if (gameActive && game.turn() !== myPlayerColor && currentMode !== 'pvp') {
                    botThinking = true; 
                    setTimeout(triggerBot, 250);
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
    if (!isMyTurn) return false;
    return game.moves({ square: source }).length > 0;
}

function onDrop(source, target) {
    clearHighlights(); 
    selectedSquare = null;
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) return 'snapback';
    handleMoveVisuals(move, false);
    if (gameActive && game.turn() !== myPlayerColor && currentMode !== 'pvp') {
        botThinking = true; 
        setTimeout(triggerBot, 250);
    }
}

function handleMoveVisuals(move, isSync) {
    if (game.in_checkmate() || game.game_over()) playSound('end');
    else if (game.in_check()) playSound('check');
    else if (move.captured) playSound('capture');
    else playSound('move');

    if (!isSync) {
        gameHistory.push({ fen: game.fen(), move: move.san, piece: move.piece, color: game.turn() === 'w' ? 'b' : 'w' });
    }
    rebuildMoveTable();
    calculateMaterial(); 
    updateStatus(); 
    updateEvalBar(); 
    checkGameOver();
}

function highlightLegalMoves(square) {
    clearHighlights(); 
    selectedSquare = square;
    $('#myBoard .square-' + square).addClass('selected-square');
    game.moves({ square: square, verbose: true }).forEach(m => $('#myBoard .square-' + m.to).addClass('legal-move'));
}

function clearHighlights() { 
    $('#myBoard .square-55d63').removeClass('legal-move in-check selected-square'); 
}

function highlightCheck() {
    if (game.in_check()) {
        let b = game.board(), col = game.turn();
        for (let r=0; r<8; r++) {
            for (let c=0; c<8; c++) {
                if (b[r][c] && b[r][c].type === 'k' && b[r][c].color === col) {
                    $('#myBoard .square-' + ('abcdefgh'[c] + (8-r))).addClass('in-check');
                }
            }
        }
    }
}

function rebuildMoveTable() {
    let tbody = document.getElementById('move-tbody'); 
    tbody.innerHTML = '';
    for (let i = 1; i < gameHistory.length; i += 2) {
        tbody.innerHTML += `<tr><td>${Math.ceil(i / 2)}.</td><td>${gameHistory[i].move}</td><td>${gameHistory[i+1] ? gameHistory[i+1].move : '...'}</td></tr>`;
    }
    document.getElementById('move-history-panel').scrollTop = document.getElementById('move-history-panel').scrollHeight;
}

// =================================================================
// 8. GAME OVER, TIMERS & CHESS.COM REVIEW RUNNER
// =================================================================
function tickTimer() {
    if (!gameActive) return;
    game.turn() === 'w' ? timeW-- : timeB--;
    updateClocks();
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
    let result = 'draw', msg = "Game drawn.";
    if (game.in_checkmate()) {
        result = game.turn() === 'w' ? 'loss' : 'win';
        msg = result === 'win' ? "Checkmate! You won!" : "Checkmate! Opponent won.";
    }
    endGame(result, msg);
}

function endGame(result, msg) {
    gameActive = false; 
    botThinking = false; 
    clearInterval(timerInterval);
    ['resign-btn', 'draw-btn', 'undo-btn'].forEach(id => document.getElementById(id).disabled = true);
    updateStatus(msg); 
    botChat(msg);

    // Adaptive Placement Logic
    if (currentMode === 'placement') {
        if (result === 'win') placementStep = Math.min(PLACEMENT_BENCHMARKS.length - 1, placementStep + 1);
        else if (result === 'loss') placementStep = Math.max(0, placementStep - 1);
        
        if (placementStep >= 4 || result === 'win') {
            playerDNA.calculatedElo = PLACEMENT_BENCHMARKS[placementStep];
            savePlayerDNA();
            botChat(`🎯 Placement calibrated! Your starting Elo is set to ${playerDNA.calculatedElo}.`);
        }
    }

    if (analysisEngine) runChessComAnalysis();
}

function updateStatus(override) {
    document.getElementById('status').innerText = override || `${game.turn() === 'w' ? 'White' : 'Black'} to move`;
}

function botChat(msg) {
    document.getElementById('chat-messages').innerHTML += `<p><strong style="color:#5865f2;">System:</strong> ${msg}</p>`;
    document.getElementById('chat-box').scrollTop = 9999;
}

function updateProfileUI() {
    document.getElementById('player-elo-display').innerText = playerDNA.calculatedElo ? `${playerDNA.calculatedElo} Elo` : "Unranked";
    document.getElementById('placement-warning').style.display = playerDNA.calculatedElo ? 'none' : 'block';
}

function evaluatePositionAsync(fen) {
    return new Promise(res => {
        if (!analysisEngine) return res(0);
        let score = 0;
        let listener = e => {
            if (e.data.includes('score cp')) {
                let m = e.data.match(/score cp (-?\d+)/);
                if (m) score = parseInt(m[1]);
            }
            if (e.data.includes('bestmove')) {
                analysisEngine.removeEventListener('message', listener);
                res(score);
            }
        };
        analysisEngine.addEventListener('message', listener);
        analysisEngine.postMessage('position fen ' + fen);
        analysisEngine.postMessage('go depth 12');
    });
}

async function updateEvalBar() {
    if (!analysisEngine || !gameActive) return;
    let score = await evaluatePositionAsync(game.fen());
    let capped = Math.max(-1000, Math.min(1000, score));
    let pct = 50 + (capped / 20);
    if (game.turn() === 'b') pct = 100 - pct;
    document.getElementById('eval-bar-fill').style.height = pct + '%';
}

function calculateMaterial() {
    let counts = { w: {p:0,n:0,b:0,r:0,q:0}, b: {p:0,n:0,b:0,r:0,q:0} };
    let boardState = game.board();
    for (let r=0; r<8; r++) {
        for (let c=0; c<8; c++) {
            let piece = boardState[r][c];
            if (piece && piece.type !== 'k') counts[piece.color][piece.type]++;
        }
    }
    let start = {p:8, n:2, b:2, r:2, q:1};
    let deadW = '', deadB = '', scoreW = 0, scoreB = 0;
    for (let p in start) {
        let missingW = start[p] - counts.w[p];
        let missingB = start[p] - counts.b[p];
        for (let i=0; i<missingW; i++) { 
            deadW += `<div class="grave-piece" style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/w${p.toUpperCase()}.png')"></div>`; 
            scoreB += PIECE_VALUES[p]; 
        }
        for (let i=0; i<missingB; i++) { 
            deadB += `<div class="grave-piece" style="background-image:url('https://chessboardjs.com/img/chesspieces/wikipedia/b${p.toUpperCase()}.png')"></div>`; 
            scoreW += PIECE_VALUES[p]; 
        }
    }
    document.getElementById('grave-w').innerHTML = deadB;
    document.getElementById('grave-b').innerHTML = deadW;
    let diff = scoreW - scoreB;
    document.getElementById('mat-w').innerText = diff > 0 ? `+${diff}` : '';
    document.getElementById('mat-b').innerText = diff < 0 ? `+${Math.abs(diff)}` : '';
}

// =================================================================
// 9. DEEP CHESS.COM GAME REVIEW PIPELINE
// =================================================================
async function runChessComAnalysis() {
    document.getElementById('analysis-panel').style.display = 'block';
    let bEl = document.getElementById('move-breakdown');
    bEl.innerHTML = '';
    
    let counts = { brilliant: 0, great: 0, best: 0, excellent: 0, good: 0, inaccuracy: 0, mistake: 0, miss: 0, blunder: 0 };
    let accuracyTotals = { w: [], b: [] };
    let prevEval = 0;

    for (let i = 1; i < gameHistory.length; i++) {
        document.getElementById('analysis-status').innerText = `Analyzing move ${i} of ${gameHistory.length - 1}...`;
        let item = gameHistory[i];
        let rawEval = await evaluatePositionAsync(item.fen);
        let evalForMoveColor = item.color === 'w' ? rawEval : -rawEval;
        let diffCp = evalForMoveColor - prevEval;
        item.cpLoss = Math.max(0, -diffCp);

        let winProbBefore = cpToWinProb(prevEval);
        let winProbAfter = cpToWinProb(evalForMoveColor);
        let moveAcc = calculateMoveAccuracy(winProbBefore, winProbAfter);
        accuracyTotals[item.color].push(moveAcc);

        let classification = classifyMove(diffCp, Math.abs(winProbBefore - winProbAfter));
        if (item.color === 'w') counts[classification.key]++;

        bEl.innerHTML += `
            <div class="move-breakdown-row">
                <span><strong>${Math.ceil(i/2)}. ${item.color === 'w' ? '' : '...'}${item.move}</strong></span>
                <span style="color:${classification.color}; font-weight:bold;">${classification.sym} ${classification.tag}</span>
            </div>
        `;
        prevEval = evalForMoveColor;
    }

    // Compute Overall Accuracies
    let avgAccW = accuracyTotals.w.length ? Math.round(accuracyTotals.w.reduce((a,b)=>a+b,0) / accuracyTotals.w.length) : 80;
    let avgAccB = accuracyTotals.b.length ? Math.round(accuracyTotals.b.reduce((a,b)=>a+b,0) / accuracyTotals.b.length) : 80;

    document.getElementById('accuracy-score-w').innerText = `${avgAccW}%`;
    document.getElementById('accuracy-score-b').innerText = `${avgAccB}%`;
    document.getElementById('caps-w').innerText = `Est. Elo: ${Math.round(avgAccW * 26)}`;
    document.getElementById('caps-b').innerText = `Est. Elo: ${Math.round(avgAccB * 26)}`;

    // Populate Badges
    for (let key in counts) {
        let el = document.getElementById(`stat-${key}`);
        if (el) el.innerText = counts[key];
    }
    document.getElementById('analysis-status').innerText = "Game Review Complete";

    // Feed game into DNA engine
    analyzeGameForDNA(gameHistory, null, myPlayerColor);
}

// =================================================================
// 10. DNA MODAL & IMPORT/EXPORT PIPELINE
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

    let insightsList = document.getElementById('dna-insights-list');
    insightsList.innerHTML = '';
    getDNAInsights().forEach(insight => {
        let li = document.createElement('li');
        li.innerText = insight;
        insightsList.appendChild(li);
    });
}

function exportDNAFile() {
    let dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(playerDNA, null, 2));
    let downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `chess_player_dna_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
}

function importDNAFile(event) {
    let file = event.target.files[0];
    if (!file) return;
    let reader = new FileReader();
    reader.onload = function(e) {
        try {
            activeCloneDNA = JSON.parse(e.target.result);
            alert(`✅ Clone DNA imported successfully! Set Game Mode to "Play vs Player Clone" to face this opponent.`);
            document.getElementById('game-mode').value = 'clone';
            currentMode = 'clone';
            document.getElementById('dna-modal').style.display = 'none';
        } catch(err) {
            alert("Invalid DNA file format.");
        }
    };
    reader.readAsText(file);
}
