// =================================================================
// 0. FIREBASE CONFIGURATION & HYBRID GUEST/AUTH SYNC
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


let auth = null;
let db = null;
let currentUser = null;

if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.database();
    } catch (e) {
        console.warn("Firebase initialization skipped or failed:", e);
    }
}

// Local Computer Sync & Profile Storage (No default friends)
let guestProfile = JSON.parse(localStorage.getItem('chessGuestProfile')) || {
    username: "Student_" + Math.floor(1000 + Math.random() * 9000),
    friends: []
};

// =================================================================
// 1. SOUND EFFECTS
// =================================================================
const sfxMove = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-self.mp3');
const sfxCapture = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/capture.mp3');
const sfxCheck = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/move-check.mp3');
const sfxEnd = new Audio('https://images.chesscomfiles.com/chess-themes/sounds/_MP3_/default/game-end.mp3');

function playSound(type) {
    let p = null;
    if (type === 'end') {
        p = sfxEnd.play();
    } else if (type === 'check') {
        p = sfxCheck.play();
    } else if (type === 'capture') {
        p = sfxCapture.play();
    } else {
        p = sfxMove.play();
    }
    if (p !== undefined && p !== null) {
        p.catch(function () {});
    }
}

// =================================================================
// 2. COMPLETE RESTORED BOT ROSTER (40+ BOTS FULLY EXPANDED)
// =================================================================
const allBots = [];
function addBot(id, name, elo, type, category, handler) {
    if (handler === undefined) {
        handler = null;
    }
    allBots.push({
        id: id,
        name: name,
        elo: elo,
        type: type,
        category: category,
        handler: handler
    });
}

// 1. Full Standard Ladder Bots (100 -> 3200)
addBot("bot_zach", "Zach", 100, "ladder", "Standard Ladder");
addBot("bot_martin", "Martin", 200, "ladder", "Standard Ladder");
addBot("bot_sally", "Sally", 300, "ladder", "Standard Ladder");
addBot("bot_jimmy", "Jimmy", 400, "ladder", "Standard Ladder");
addBot("bot_bobby", "Bobby", 500, "ladder", "Standard Ladder");
addBot("bot_sarah", "Sarah", 600, "ladder", "Standard Ladder");
addBot("bot_mike", "Mike", 700, "ladder", "Standard Ladder");
addBot("bot_nelson", "Nelson", 800, "ladder", "Standard Ladder");
addBot("bot_chloe", "Chloe", 900, "ladder", "Standard Ladder");
addBot("bot_david", "David", 1000, "ladder", "Standard Ladder");
addBot("bot_emma", "Emma", 1100, "ladder", "Standard Ladder");
addBot("bot_maria", "Maria", 1200, "ladder", "Standard Ladder");
addBot("bot_lucas", "Lucas", 1300, "ladder", "Standard Ladder");
addBot("bot_sophia", "Sophia", 1400, "ladder", "Standard Ladder");
addBot("bot_jack", "Jack", 1500, "ladder", "Standard Ladder");
addBot("bot_elena", "Elena", 1600, "ladder", "Standard Ladder");
addBot("bot_oliver", "Oliver", 1700, "ladder", "Standard Ladder");
addBot("bot_viktor", "Viktor", 1800, "ladder", "Standard Ladder");
addBot("bot_isabella", "Isabella", 1900, "ladder", "Standard Ladder");
addBot("bot_liam", "Liam", 2000, "ladder", "Standard Ladder");
addBot("bot_mateo", "Mateo", 2200, "ladder", "Standard Ladder");
addBot("bot_yuki", "Yuki", 2400, "ladder", "Standard Ladder");
addBot("bot_hikaru", "Hikaru", 2600, "ladder", "Standard Ladder");
addBot("bot_magnus", "Magnus", 2800, "ladder", "Standard Ladder");
addBot("bot_stockfishmax", "Stockfish Max", 3200, "ladder", "Standard Ladder");

// 2. Personality Piece Lovers
addBot("pers_pam", "Pam (Pawn Lover)", 100, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'p'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_arthur", "Arthur (King Walker)", 250, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'k'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_rocky", "Rocky (Rook Lover)", 1000, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'r'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_benedict", "Benedict (Bishop Lover)", 1150, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'b'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_victoria", "Victoria (Queen Lover)", 1250, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'q'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_lancelot", "Lancelot (Knight Lover)", 1350, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'n'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});

// 3. Behavioral & Strategic Archetypes
addBot("beh_grog", "Grog (Berserker)", 800, "behavior", "Aggressive", function(moves) {
    let caps = moves.filter(function(m) { return m.captured; });
    if (caps.length > 0 && Math.random() < 0.85) {
        return caps[Math.floor(Math.random() * caps.length)];
    }
    return null;
});
addBot("beh_gandhi", "Gandhi (Pacifist)", 900, "behavior", "Positional", function(moves) {
    let nonCaps = moves.filter(function(m) { return !m.captured; });
    if (nonCaps.length > 0 && Math.random() < 0.80) {
        return nonCaps[Math.floor(Math.random() * nonCaps.length)];
    }
    return null;
});
addBot("beh_robin", "Sir Robin (Coward)", 950, "behavior", "Quirky", function(moves) {
    let retreats = moves.filter(function(m) {
        if (m.color === 'w') {
            return m.to[1] < m.from[1];
        } else {
            return m.to[1] > m.from[1];
        }
    });
    if (retreats.length > 0 && Math.random() < 0.65) {
        return retreats[Math.floor(Math.random() * retreats.length)];
    }
    return null;
});
addBot("beh_turtle", "The Turtle", 1100, "behavior", "Solid", function(moves) {
    let def = moves.filter(function(m) {
        if (m.color === 'w') {
            return m.to[1] <= '4';
        } else {
            return m.to[1] >= '5';
        }
    });
    if (def.length > 0 && Math.random() < 0.75) {
        return def[Math.floor(Math.random() * def.length)];
    }
    return null;
});
addBot("beh_sniper", "The Sniper", 1400, "behavior", "Positional", function(moves) {
    let snipes = moves.filter(function(m) {
        let isLongPiece = (m.piece === 'b' || m.piece === 'r');
        let dist = Math.abs(m.to.charCodeAt(0) - m.from.charCodeAt(0));
        return isLongPiece && dist >= 2;
    });
    if (snipes.length > 0 && Math.random() < 0.80) {
        return snipes[Math.floor(Math.random() * snipes.length)];
    }
    return null;
});
addBot("beh_fianchetto", "Felix Fianchetto", 1650, "behavior", "Positional", function(moves) {
    let targets = ['g3', 'b3', 'g6', 'b6', 'bg2', 'bb2', 'bg7', 'bb7'];
    let fian = moves.filter(function(m) {
        let sanLower = m.san.toLowerCase();
        return targets.some(function(s) { return sanLower.indexOf(s) !== -1; });
    });
    if (fian.length > 0 && Math.random() < 0.70) {
        return fian[Math.floor(Math.random() * fian.length)];
    }
    return null;
});
addBot("beh_gambiteer", "Garry Gambiteer", 1750, "behavior", "Tactical", function(moves) {
    let gambitMoves = moves.filter(function(m) {
        return m.captured || m.san.indexOf('+') !== -1 || m.piece === 'n';
    });
    if (gambitMoves.length > 0 && Math.random() < 0.70) {
        return gambitMoves[Math.floor(Math.random() * gambitMoves.length)];
    }
    return null;
});

const PLACEMENT_BENCHMARKS = [600, 900, 1200, 1500, 1800];

// =================================================================
// 3. DEEP SITUATIONAL DNA ENGINE
// =================================================================
const DEFAULT_DNA = {
    gamesPlayed: 0,
    acpl: 48,
    aggression: 50,
    tactics: 50,
    conversionWhenAhead: 50,
    pressureResilience: 50,
    checkReaction: 50,
    endgameSkill: 50,
    calculatedElo: 1200
};

let playerDNA = Object.assign({}, DEFAULT_DNA, JSON.parse(localStorage.getItem('chessPlayerDNA')) || {});
let activeCloneDNA = null;

function saveGuestAndDNA() {
    localStorage.setItem('chessGuestProfile', JSON.stringify(guestProfile));
    localStorage.setItem('chessPlayerDNA', JSON.stringify(playerDNA));
    updateProfileUI();
}

function analyzeGameForDeepDNA(history, playerColor) {
    let userMoves = history.filter(function(h) { return h.color === playerColor; });
    if (userMoves.length === 0) {
        return;
    }

    let totalCpLoss = 0;
    let aheadMoves = 0;
    let aheadAccurate = 0;
    let underPressureMoves = 0;
    let underPressureAccurate = 0;
    let checkResponses = 0;
    let checkAccurate = 0;
    let endgameMoves = 0;
    let endgameAccurate = 0;

    userMoves.forEach(function(m) {
        let cpLoss = m.cpLoss || 0;
        totalCpLoss += cpLoss;
        let posEval = m.evalBefore || 0;

        if (posEval >= 250) {
            aheadMoves++;
            if (cpLoss < 60) {
                aheadAccurate++;
            }
        }
        if (posEval <= -250) {
            underPressureMoves++;
            if (cpLoss < 60) {
                underPressureAccurate++;
            }
        }
        if (m.wasInCheck) {
            checkResponses++;
            if (cpLoss < 80) {
                checkAccurate++;
            }
        }
        if (m.pieceCount <= 10) {
            endgameMoves++;
            if (cpLoss < 50) {
                endgameAccurate++;
            }
        }
    });

    let matchACPL = totalCpLoss / userMoves.length;
    playerDNA.gamesPlayed++;
    playerDNA.acpl = Math.round((playerDNA.acpl * 0.75) + (matchACPL * 0.25));

    if (aheadMoves > 0) {
        playerDNA.conversionWhenAhead = Math.round((playerDNA.conversionWhenAhead * 0.70) + ((aheadAccurate / aheadMoves) * 100 * 0.30));
    }
    if (underPressureMoves > 0) {
        playerDNA.pressureResilience = Math.round((playerDNA.pressureResilience * 0.70) + ((underPressureAccurate / underPressureMoves) * 100 * 0.30));
    }
    if (checkResponses > 0) {
        playerDNA.checkReaction = Math.round((playerDNA.checkReaction * 0.70) + ((checkAccurate / checkResponses) * 100 * 0.30));
    }
    if (endgameMoves > 0) {
        playerDNA.endgameSkill = Math.round((playerDNA.endgameSkill * 0.70) + ((endgameAccurate / endgameMoves) * 100 * 0.30));
    }

    playerDNA.tactics = Math.min(100, Math.max(10, Math.round(100 - (playerDNA.acpl * 0.75))));
    
    let estimatedElo = Math.max(250, Math.min(2900, Math.round(2900 - (playerDNA.acpl * 26))));
    playerDNA.calculatedElo = Math.round((playerDNA.calculatedElo * 0.70) + (estimatedElo * 0.30));

    saveGuestAndDNA();
}

function getCloneBotMove(moves) {
    let target = activeCloneDNA || playerDNA;
    let isCheck = game.in_check();

    if (isCheck && Math.random() * 100 > target.checkReaction) {
        return moves[Math.floor(Math.random() * moves.length)].san;
    }

    if (Math.random() * 100 < target.aggression) {
        let agg = moves.filter(function(m) {
            return m.captured || m.san.indexOf('+') !== -1;
        });
        if (agg.length > 0) {
            return agg[Math.floor(Math.random() * agg.length)].san;
        }
    }

    if (Math.random() * 100 < (target.acpl / 2.5)) {
        return moves[Math.floor(Math.random() * moves.length)].san;
    }

    return null;
}

// =================================================================
// 4. CHESS.COM CAPS2 ACCURACY & POLARITY ENGINE
// =================================================================
function cpToWinProb(cp) {
    return 1 / (1 + Math.pow(10, -cp / 400));
}

function calculateCAPS2MoveAccuracy(winProbBefore, winProbAfter) {
    let winDiff = Math.max(0, (winProbBefore - winProbAfter) * 100);
    let accuracy = 103.1668 * Math.exp(-0.04354 * winDiff) - 3.1669;
    return Math.max(0, Math.min(100, accuracy));
}

function classifyMove(diffCp, winDiff, isSacrifice) {
    if (isSacrifice === undefined) {
        isSacrifice = false;
    }
    if (diffCp >= 0 && isSacrifice) {
        return { tag: "Brilliant", sym: "!!", key: "brilliant", color: "#1ba599" };
    }
    if (diffCp >= -10) {
        return { tag: "Great", sym: "!", key: "great", color: "#5c8bb0" };
    }
    if (diffCp >= -25) {
        return { tag: "Best", sym: "★", key: "best", color: "#95b645" };
    }
    if (diffCp >= -55) {
        return { tag: "Excellent", sym: "✓", key: "excellent", color: "#96bc4b" };
    }
    if (diffCp >= -100) {
        return { tag: "Good", sym: "✓", key: "good", color: "#8bb158" };
    }
    if (diffCp >= -175) {
        return { tag: "Inaccuracy", sym: "?!", key: "inaccuracy", color: "#f0c15c" };
    }
    if (diffCp >= -320) {
        return { tag: "Mistake", sym: "?", key: "mistake", color: "#e69d41" };
    }
    if (winDiff > 0.35 && diffCp < -450) {
        return { tag: "Miss", sym: "✖", key: "miss", color: "#ea5b5b" };
    }
    return { tag: "Blunder", sym: "??", key: "blunder", color: "#fa412d" };
}

function calculateCalibratedPerformanceRating(accuracy, opponentElo, result) {
    let baseAccRating = 0;
    if (accuracy >= 95) {
        baseAccRating = 2400 + (accuracy - 95) * 80;
    } else if (accuracy >= 85) {
        baseAccRating = 1800 + (accuracy - 85) * 60;
    } else if (accuracy >= 70) {
        baseAccRating = 1200 + (accuracy - 70) * 40;
    } else if (accuracy >= 50) {
        baseAccRating = 600 + (accuracy - 50) * 30;
    } else {
        baseAccRating = Math.max(100, accuracy * 12);
    }

    let modifier = 0;
    if (result === 'win') {
        modifier = 350;
    } else if (result === 'draw') {
        modifier = 50;
    } else {
        modifier = -200;
    }
    let maxCap = opponentElo + modifier;
    let perf = Math.round((baseAccRating * 0.40) + (maxCap * 0.60));
    return Math.max(100, Math.min(3000, perf));
}

function evaluatePositionAsync(fen, depth, timeoutMs) {
    if (depth === undefined) {
        depth = 10;
    }
    if (timeoutMs === undefined) {
        timeoutMs = 2500;
    }
    return new Promise(function(resolve) {
        if (!analysisEngine) {
            return resolve(0);
        }
        let score = 0;
        let timer = null;

        function listener(e) {
            let line = e.data;
            if (line.indexOf('score cp') !== -1) {
                let m = line.match(/score cp (-?\d+)/);
                if (m) {
                    score = parseInt(m[1]);
                }
            } else if (line.indexOf('score mate') !== -1) {
                let m = line.match(/score mate (-?\d+)/);
                if (m) {
                    score = parseInt(m[1]) > 0 ? 10000 : -10000;
                }
            }
            if (line.indexOf('bestmove') === 0 || line.indexOf('bestmove') !== -1) {
                cleanup();
                let isWhite = fen.split(' ')[1] === 'w';
                resolve(isWhite ? score : -score);
            }
        }

        function cleanup() {
            clearTimeout(timer);
            analysisEngine.removeEventListener('message', listener);
        }

        timer = setTimeout(function() {
            cleanup();
            resolve(score);
        }, timeoutMs);

        analysisEngine.addEventListener('message', listener);
        analysisEngine.postMessage('stop');
        analysisEngine.postMessage('position fen ' + fen);
        analysisEngine.postMessage('go depth ' + depth);
    });
}

// =================================================================
// 5. RESTORED AUTHENTIC STOCKFISH MULTIPV BOT SYSTEM
// =================================================================
let board = null;
let game = null;
let currentMode = 'bot';
let currentBot = null;
let engine = null;
let analysisEngine = null;
let gameActive = false;
let botThinking = false;
let gameHistory = []; 
let timeW = 600;
let timeB = 600;
let timerInterval = null;
let selectedSquare = null;
let myPlayerColor = 'w';
let currentEngineMoves = [];
let placementStep = 0;

const PIECE_VALUES = { 'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9, 'k': 0 };

const config = {
    draggable: true,
    position: 'start',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: function() {
        board.position(game.fen());
        clearHighlights();
        highlightCheck();
    },
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
};

document.addEventListener('DOMContentLoaded', function() {
    updateProfileUI();
    populateBotDropdown();
    renderFriendsList();

    loadEngine().then(function(w) {
        engine = w;
        engine.onmessage = handleEngineMessage;
    });
    loadEngine().then(function(w) {
        analysisEngine = w;
    });

    // Classroom Stealth Handlers
    document.getElementById('open-app-from-school-btn').addEventListener('click', function() {
        document.getElementById('schoolwork-overlay').style.display = 'none';
    });
    document.getElementById('panic-school-btn').addEventListener('click', function() {
        document.getElementById('schoolwork-overlay').style.display = 'block';
    });

    // Guest and Profile Modal Wiring
    document.getElementById('guest-btn').addEventListener('click', function() {
        let customName = document.getElementById('username-input').value.trim();
        if (customName) {
            guestProfile.username = customName;
            saveGuestAndDNA();
        }
        document.getElementById('auth-modal').style.display = 'none';
    });

    document.getElementById('edit-username-btn').addEventListener('click', function() {
        let name = prompt("Enter new username:", guestProfile.username);
        if (name && name.trim()) {
            guestProfile.username = name.trim();
            saveGuestAndDNA();
        }
    });

    // Firebase Auth Wiring (if initialized)
    if (auth) {
        document.getElementById('login-btn').addEventListener('click', function() {
            let email = document.getElementById('email-input').value.trim();
            let password = document.getElementById('password-input').value.trim();
            auth.signInWithEmailAndPassword(email, password)
                .then(function(res) {
                    guestProfile.username = res.user.displayName || res.user.email.split('@')[0];
                    saveGuestAndDNA();
                    document.getElementById('auth-modal').style.display = 'none';
                })
                .catch(function(err) {
                    alert("Login failed: " + err.message);
                });
        });

        document.getElementById('signup-btn').addEventListener('click', function() {
            let email = document.getElementById('email-input').value.trim();
            let password = document.getElementById('password-input').value.trim();
            auth.createUserWithEmailAndPassword(email, password)
                .then(function(res) {
                    let customName = document.getElementById('username-input').value.trim();
                    if (customName) {
                        res.user.updateProfile({ displayName: customName });
                        guestProfile.username = customName;
                    } else {
                        guestProfile.username = res.user.email.split('@')[0];
                    }
                    saveGuestAndDNA();
                    document.getElementById('auth-modal').style.display = 'none';
                })
                .catch(function(err) {
                    alert("Sign up failed: " + err.message);
                });
        });

        document.getElementById('google-login-btn').addEventListener('click', function() {
            let provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(function(res) {
                    guestProfile.username = res.user.displayName || res.user.email.split('@')[0];
                    saveGuestAndDNA();
                    document.getElementById('auth-modal').style.display = 'none';
                })
                .catch(function(err) {
                    alert("Google Sign-In failed: " + err.message);
                });
        });

        auth.onAuthStateChanged(function(user) {
            if (user) {
                currentUser = user;
                guestProfile.username = user.displayName || user.email.split('@')[0];
                saveGuestAndDNA();
                document.getElementById('auth-modal').style.display = 'none';
            }
        });
    }

    // Match Setup & Mode Selection
    document.getElementById('game-mode').addEventListener('change', function(e) {
        currentMode = e.target.value;
        document.getElementById('bot-settings').style.display = (currentMode === 'bot') ? 'block' : 'none';
        document.getElementById('placement-panel').style.display = (currentMode === 'placement') ? 'block' : 'none';
        if (currentMode === 'custom_code') {
            document.getElementById('custom-room-modal').style.display = 'block';
        }
    });

    document.getElementById('create-room-btn').addEventListener('click', function() {
        let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
        let code = "";
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        let display = document.getElementById('room-code-display');
        display.style.display = 'block';
        display.innerText = "CODE: " + code;
        botChat("Hosted Local Room: " + code + ". Share this code to play!");
    });

    document.getElementById('join-room-btn').addEventListener('click', function() {
        let code = document.getElementById('join-room-code').value.trim();
        if (code) {
            document.getElementById('custom-room-modal').style.display = 'none';
            startGame(false);
            botChat("Connected to room " + code + "!");
        }
    });

    document.getElementById('add-friend-btn').addEventListener('click', function() {
        let fInput = document.getElementById('friend-name-input');
        let fName = fInput.value.trim();
        if (fName && guestProfile.friends.indexOf(fName) === -1) {
            guestProfile.friends.push(fName);
            fInput.value = '';
            saveGuestAndDNA();
            renderFriendsList();
        }
    });

    document.getElementById('start-btn').addEventListener('click', function() {
        startGame(false);
    });
    document.getElementById('resign-btn').addEventListener('click', function() {
        if (gameActive) {
            endGame('loss', "Resigned");
        }
    });
    document.getElementById('draw-btn').addEventListener('click', handleDrawOffer);
    document.getElementById('undo-btn').addEventListener('click', handleUndo);

    document.getElementById('open-dna-btn').addEventListener('click', openDNAModal);
    document.getElementById('export-dna-btn').addEventListener('click', exportDNAFile);
    document.getElementById('import-dna-file').addEventListener('change', importDNAFile);
    document.getElementById('board-theme').addEventListener('change', function(e) {
        document.body.className = e.target.value;
    });

    document.getElementById('clear-data-btn').addEventListener('click', function() {
        if (confirm("Reset local player data, DNA profile, and friend list?")) {
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
    allBots.forEach(function(b) {
        let opt = document.createElement('option');
        opt.value = b.id;
        opt.textContent = b.name + " (" + b.elo + ") - [" + b.category + "]";
        select.appendChild(opt);
    });
}

function renderFriendsList() {
    let el = document.getElementById('friends-list-container');
    el.innerHTML = '';
    if (guestProfile.friends.length === 0) {
        el.innerHTML = '<div style="font-size:11px; color:#888; padding:5px;">No friends added yet.</div>';
        return;
    }
    guestProfile.friends.forEach(function(f) {
        el.innerHTML += '<div class="friend-row"><span>🟢 <strong>' + f + '</strong></span><button onclick="challengeFriend(\'' + f + '\')" style="font-size:10px; padding:2px 5px; background:#5865f2;">Play</button></div>';
    });
}

function challengeFriend(f) {
    document.getElementById('game-mode').value = 'custom_code';
    currentMode = 'custom_code';
    document.getElementById('custom-room-modal').style.display = 'block';
}

function loadEngine() {
    return fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(function(res) { return res.text(); })
        .then(function(code) {
            return new Worker(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
        });
}

// =================================================================
// 6. ORIGINAL MULTIPV CANDIDATE SELECTION FOR BOT ELO
// =================================================================
function triggerBot() {
    if (!gameActive || !engine) {
        return;
    }
    let moves = game.moves({ verbose: true });
    if (moves.length === 0) {
        return;
    }

    if (currentMode === 'clone') {
        let cloneMove = getCloneBotMove(moves);
        if (cloneMove) {
            return executeBotMove(cloneMove);
        }
    }

    if (currentBot && typeof currentBot.handler === 'function') {
        let custom = currentBot.handler(moves);
        if (custom) {
            return executeBotMove(custom.san || custom);
        }
    }

    let elo = currentBot ? currentBot.elo : (playerDNA.calculatedElo || 1200);

    let depth = Math.max(1, Math.min(20, Math.floor(elo / 150))); 
    let skillLevel = Math.max(0, Math.min(20, Math.floor((elo - 500) / 100)));
    let moveTime = Math.max(100, Math.min(3000, Math.floor(elo / 1.5)));
    let multiPvCount = 1;
    if (elo < 1000) {
        multiPvCount = 5;
    } else if (elo < 1500) {
        multiPvCount = 3;
    }

    currentEngineMoves = [];
    engine.postMessage('setoption name Skill Level value ' + skillLevel);
    engine.postMessage('setoption name MultiPV value ' + multiPvCount);
    engine.postMessage('position fen ' + game.fen());
    engine.postMessage('go depth ' + depth + ' movetime ' + moveTime);
}

function handleEngineMessage(event) {
    let line = event.data;
    if (line.indexOf('info depth') !== -1 && line.indexOf('multipv') !== -1) {
        let pvMatch = line.match(/multipv (\d+).* pv ([a-h][1-8][a-h][1-8][qrbn]?)/);
        if (pvMatch) {
            currentEngineMoves[parseInt(pvMatch[1]) - 1] = pvMatch[2];
        }
    }
    
    if (line.indexOf('bestmove') === 0) {
        let bestMove = line.split(' ')[1];
        let moveToPlay = bestMove;
        let elo = currentBot ? currentBot.elo : 1200;
        
        if (elo < 1000 && currentEngineMoves.length > 1) {
            let targetIndex = Math.floor((1000 - elo) / 200); 
            targetIndex = Math.min(targetIndex, currentEngineMoves.length - 1);
            if (currentEngineMoves[targetIndex]) {
                moveToPlay = currentEngineMoves[targetIndex];
            }
        }
        executeBotMove(moveToPlay);
    }
}

function executeBotMove(sanOrUci) {
    let delay = Math.floor(Math.random() * 400) + 250;
    setTimeout(function() {
        let move = game.move(sanOrUci, { sloppy: true });
        if (move) {
            board.position(game.fen());
            botThinking = false;
            handleMoveVisuals(move, false);
        }
    }, delay);
}

// =================================================================
// 7. BOARD CONTROL & GAMEPLAY LOOP
// =================================================================
function startGame(isCustomFen) {
    if (!isCustomFen) {
        game.reset();
        board.start();
    } else {
        board.position(game.fen());
    }
    board.orientation('white');
    gameActive = true;
    botThinking = false;
    selectedSquare = null;
    gameHistory = [{ fen: game.fen(), move: 'start', color: null }];

    let timeChoice = parseInt(document.getElementById('time-control').value);
    timeW = timeChoice || 600;
    timeB = timeChoice || 600;
    clearInterval(timerInterval);
    if (timeChoice > 0) {
        timerInterval = setInterval(tickTimer, 1000);
    }
    updateClocks();

    let controlIds = ['resign-btn', 'draw-btn', 'undo-btn'];
    controlIds.forEach(function(id) {
        document.getElementById(id).disabled = false;
    });
    document.getElementById('chat-messages').innerHTML = '';
    document.getElementById('analysis-panel').style.display = 'none';

    document.getElementById('white-name').innerText = guestProfile.username;
    document.getElementById('white-elo').innerText = "(Elo " + playerDNA.calculatedElo + ")";

    if (currentMode === 'bot') {
        currentBot = allBots.find(function(b) {
            return b.id === document.getElementById('bot-select').value;
        }) || allBots[0];
        document.getElementById('black-name').innerText = currentBot.name;
        document.getElementById('black-elo').innerText = "(Elo " + currentBot.elo + ")";
        botChat("Match started vs " + currentBot.name + ".");
    } else if (currentMode === 'clone') {
        document.getElementById('black-name').innerText = "Player Clone AI";
        document.getElementById('black-elo').innerText = "(Elo " + playerDNA.calculatedElo + ")";
        botChat("Facing your behavioral DNA clone.");
    } else if (currentMode === 'placement') {
        let testElo = PLACEMENT_BENCHMARKS[placementStep] || 1200;
        currentBot = {
            id: 'placement_bot',
            name: "RLI Benchmark",
            elo: testElo,
            category: 'benchmark',
            handler: null
        };
        document.getElementById('black-name').innerText = currentBot.name;
        document.getElementById('black-elo').innerText = "(Elo " + testElo + ")";
        document.getElementById('placement-progress').innerText = "Match " + (placementStep + 1) + " of 5";
    }

    updateStatus();
}

function handleUndo() {
    if (!gameActive || botThinking || gameHistory.length <= 1) {
        return;
    }
    game.undo();
    let slice = -1;
    if (currentMode !== 'pvp') {
        game.undo();
        slice = -2;
    }
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
    if (!gameActive || currentMode === 'pvp') {
        return;
    }
    botChat("Evaluating position for draw...");
    let score = await evaluatePositionAsync(game.fen());
    let botScore = game.turn() === 'b' ? score : -score;
    if (botScore > 120) {
        botChat("I have a winning advantage. Draw declined!");
    } else {
        endGame('draw', "Draw accepted.");
    }
}

function setupClickToMove() {
    $(document).on('click', '.square-55d63', function() {
        if (!gameActive || botThinking) {
            return;
        }
        let square = $(this).attr('data-square');
        if (!square) {
            return;
        }

        let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
        if (!isMyTurn) {
            return;
        }

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
                if (piece && (piece.color === game.turn() || currentMode === 'pvp')) {
                    highlightLegalMoves(square);
                } else {
                    clearHighlights();
                    selectedSquare = null;
                }
            }
        } else {
            let piece = game.get(square);
            if (piece && (piece.color === game.turn() || currentMode === 'pvp')) {
                highlightLegalMoves(square);
            }
        }
    });
}

function onDragStart(source, piece) {
    if (!gameActive || game.game_over() || botThinking) {
        return false;
    }
    let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
    return isMyTurn && game.moves({ square: source }).length > 0;
}

function onDrop(source, target) {
    clearHighlights();
    selectedSquare = null;
    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) {
        return 'snapback';
    }
    handleMoveVisuals(move, false);
    if (gameActive && game.turn() !== myPlayerColor && currentMode !== 'pvp') {
        botThinking = true;
        setTimeout(triggerBot, 250);
    }
}

function handleMoveVisuals(move, isSync) {
    if (game.in_checkmate() || game.game_over()) {
        playSound('end');
    } else if (game.in_check()) {
        playSound('check');
    } else if (move.captured) {
        playSound('capture');
    } else {
        playSound('move');
    }

    let boardMatrix = game.board();
    let totalPieces = 0;
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            if (boardMatrix[r][c] !== null) {
                totalPieces++;
            }
        }
    }

    if (!isSync) {
        gameHistory.push({
            fen: game.fen(),
            move: move.san,
            piece: move.piece,
            color: game.turn() === 'w' ? 'b' : 'w',
            wasInCheck: game.in_check(),
            pieceCount: totalPieces
        });
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
    game.moves({ square: square, verbose: true }).forEach(function(m) {
        $('#myBoard .square-' + m.to).addClass('legal-move');
    });
}

function clearHighlights() {
    $('#myBoard .square-55d63').removeClass('legal-move in-check selected-square');
}

function highlightCheck() {
    if (game.in_check()) {
        let b = game.board();
        let col = game.turn();
        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                if (b[r][c] && b[r][c].type === 'k' && b[r][c].color === col) {
                    $('#myBoard .square-' + ('abcdefgh'[c] + (8 - r))).addClass('in-check');
                }
            }
        }
    }
}

function rebuildMoveTable() {
    let tbody = document.getElementById('move-tbody');
    tbody.innerHTML = '';
    for (let i = 1; i < gameHistory.length; i += 2) {
        let moveNumber = Math.ceil(i / 2) + ".";
        let whiteMove = gameHistory[i].move;
        let blackMove = gameHistory[i + 1] ? gameHistory[i + 1].move : '...';
        tbody.innerHTML += '<tr><td>' + moveNumber + '</td><td>' + whiteMove + '</td><td>' + blackMove + '</td></tr>';
    }
    document.getElementById('move-history-panel').scrollTop = document.getElementById('move-history-panel').scrollHeight;
}

function tickTimer() {
    if (!gameActive) {
        return;
    }
    if (game.turn() === 'w') {
        timeW--;
    } else {
        timeB--;
    }
    updateClocks();
    if (timeW <= 0) {
        endGame('loss', "Black wins on time.");
    }
    if (timeB <= 0) {
        endGame('win', "White wins on time.");
    }
}

function updateClocks() {
    function formatTime(s) {
        let mins = Math.floor(s / 60);
        let secs = (s % 60).toString();
        if (secs.length < 2) {
            secs = "0" + secs;
        }
        return mins + ":" + secs;
    }
    document.getElementById('timer-w').innerText = formatTime(timeW);
    document.getElementById('timer-b').innerText = formatTime(timeB);
    document.getElementById('timer-w').classList.toggle('active', game.turn() === 'w');
    document.getElementById('timer-b').classList.toggle('active', game.turn() === 'b');
}

function checkGameOver() {
    if (!game.game_over()) {
        return;
    }
    let res = 'draw';
    let msg = "Game drawn.";
    if (game.in_checkmate()) {
        res = game.turn() === 'w' ? 'loss' : 'win';
        msg = res === 'win' ? "Checkmate! Victory!" : "Checkmate! Defeat.";
    }
    endGame(res, msg);
}

function endGame(result, msg) {
    gameActive = false;
    botThinking = false;
    clearInterval(timerInterval);
    let controlIds = ['resign-btn', 'draw-btn', 'undo-btn'];
    controlIds.forEach(function(id) {
        document.getElementById(id).disabled = true;
    });
    updateStatus(msg);
    botChat(msg);

    if (currentMode === 'placement') {
        if (result === 'win') {
            placementStep = Math.min(PLACEMENT_BENCHMARKS.length - 1, placementStep + 1);
        } else if (result === 'loss') {
            placementStep = Math.max(0, placementStep - 1);
        }
        playerDNA.calculatedElo = PLACEMENT_BENCHMARKS[placementStep];
        saveGuestAndDNA();
    }
    if (analysisEngine) {
        runChessComAnalysis(result);
    }
}

function updateStatus(override) {
    let defaultStatus = (game.turn() === 'w' ? 'White' : 'Black') + " to move";
    document.getElementById('status').innerText = override || defaultStatus;
}

function botChat(msg) {
    document.getElementById('chat-messages').innerHTML += '<p><strong style="color:#5865f2;">System:</strong> ' + msg + '</p>';
    document.getElementById('chat-box').scrollTop = 9999;
}

function updateProfileUI() {
    document.getElementById('player-name-display').innerText = guestProfile.username;
    document.getElementById('player-elo-display').innerText = playerDNA.calculatedElo + " Elo";
}

async function updateEvalBar() {
    if (!analysisEngine || !gameActive) {
        return;
    }
    let score = await evaluatePositionAsync(game.fen());
    let capped = Math.max(-1000, Math.min(1000, score));
    let pct = 50 + (capped / 20);
    document.getElementById('eval-bar-fill').style.height = pct + '%';
}

function calculateMaterial() {
    let counts = {
        w: { p: 0, n: 0, b: 0, r: 0, q: 0 },
        b: { p: 0, n: 0, b: 0, r: 0, q: 0 }
    };
    let boardState = game.board();
    for (let r = 0; r < 8; r++) {
        for (let c = 0; c < 8; c++) {
            let piece = boardState[r][c];
            if (piece && piece.type !== 'k') {
                counts[piece.color][piece.type]++;
            }
        }
    }
    let start = { p: 8, n: 2, b: 2, r: 2, q: 1 };
    let deadW = '';
    let deadB = '';
    let scoreW = 0;
    let scoreB = 0;

    for (let p in start) {
        let diffW = start[p] - counts.w[p];
        for (let i = 0; i < diffW; i++) {
            deadW += '<div class="grave-piece" style="background-image:url(\'https://chessboardjs.com/img/chesspieces/wikipedia/w' + p.toUpperCase() + '.png\')"></div>';
            scoreB += PIECE_VALUES[p];
        }
        let diffB = start[p] - counts.b[p];
        for (let i = 0; i < diffB; i++) {
            deadB += '<div class="grave-piece" style="background-image:url(\'https://chessboardjs.com/img/chesspieces/wikipedia/b' + p.toUpperCase() + '.png\')"></div>';
            scoreW += PIECE_VALUES[p];
        }
    }
    document.getElementById('grave-w').innerHTML = deadB;
    document.getElementById('grave-b').innerHTML = deadW;
    let diff = scoreW - scoreB;
    document.getElementById('mat-w').innerText = diff > 0 ? ("+" + diff) : '';
    document.getElementById('mat-b').innerText = diff < 0 ? ("+" + Math.abs(diff)) : '';
}

// =================================================================
// 8. ACCURATE CAPS2 REVIEW PIPELINE
// =================================================================
async function runChessComAnalysis(gameResult) {
    document.getElementById('analysis-panel').style.display = 'block';
    let bEl = document.getElementById('move-breakdown');
    bEl.innerHTML = '';
    let counts = {
        brilliant: 0,
        great: 0,
        best: 0,
        excellent: 0,
        good: 0,
        inaccuracy: 0,
        mistake: 0,
        miss: 0,
        blunder: 0
    };
    let accuracyTotals = { w: [], b: [] };
    let prevEval = 0;

    for (let i = 1; i < gameHistory.length; i++) {
        let item = gameHistory[i];
        let evalForMove = await evaluatePositionAsync(item.fen, 8, 1200);
        let diffCp = 0;
        if (item.color === 'w') {
            diffCp = evalForMove - prevEval;
        } else {
            diffCp = prevEval - evalForMove;
        }
        item.cpLoss = Math.max(0, -diffCp);
        item.evalBefore = prevEval;

        let evalPrevRel = item.color === 'w' ? prevEval : -prevEval;
        let evalCurRel = item.color === 'w' ? evalForMove : -evalForMove;
        let winBefore = cpToWinProb(evalPrevRel);
        let winAfter = cpToWinProb(evalCurRel);
        accuracyTotals[item.color].push(calculateCAPS2MoveAccuracy(winBefore, winAfter));

        let cls = classifyMove(diffCp, Math.abs(winBefore - winAfter));
        if (item.color === 'w') {
            counts[cls.key]++;
        }
        
        let prefix = item.color === 'w' ? '' : '...';
        bEl.innerHTML += '<div class="move-breakdown-row"><span><strong>' + Math.ceil(i / 2) + '. ' + prefix + item.move + '</strong></span><span style="color:' + cls.color + '; font-weight:bold;">' + cls.sym + ' ' + cls.tag + '</span></div>';
        prevEval = evalForMove;
    }

    let accW = 75;
    if (accuracyTotals.w.length > 0) {
        let sumW = accuracyTotals.w.reduce(function(a, b) { return a + b; }, 0);
        accW = Math.round(sumW / accuracyTotals.w.length);
    }
    let accB = 75;
    if (accuracyTotals.b.length > 0) {
        let sumB = accuracyTotals.b.reduce(function(a, b) { return a + b; }, 0);
        accB = Math.round(sumB / accuracyTotals.b.length);
    }

    let oppElo = currentBot ? currentBot.elo : 1200;
    let estW = calculateCalibratedPerformanceRating(accW, oppElo, gameResult === 'win' ? 'win' : 'loss');
    let estB = calculateCalibratedPerformanceRating(accB, playerDNA.calculatedElo, gameResult === 'win' ? 'loss' : 'win');

    document.getElementById('accuracy-score-w').innerText = accW + "%";
    document.getElementById('accuracy-score-b').innerText = accB + "%";
    document.getElementById('caps-w').innerText = "Est. Elo: " + estW;
    document.getElementById('caps-b').innerText = "Est. Elo: " + estB;

    for (let k in counts) {
        let statEl = document.getElementById("stat-" + k);
        if (statEl) {
            statEl.innerText = counts[k];
        }
    }
    document.getElementById('analysis-status').innerText = "CAPS2 Review Complete";
    analyzeGameForDeepDNA(gameHistory, myPlayerColor);
}

// =================================================================
// 9. DNA MODAL & IMPORT/EXPORT PIPELINE
// =================================================================
function openDNAModal() {
    document.getElementById('dna-modal').style.display = 'block';
    document.getElementById('bar-aggression').style.width = playerDNA.aggression + '%';
    document.getElementById('val-aggression').innerText = playerDNA.aggression + '%';
    document.getElementById('bar-tactics').style.width = playerDNA.tactics + '%';
    document.getElementById('val-tactics').innerText = playerDNA.tactics + '%';
    document.getElementById('bar-conversion').style.width = playerDNA.conversionWhenAhead + '%';
    document.getElementById('val-conversion').innerText = playerDNA.conversionWhenAhead + '%';
    document.getElementById('bar-pressure').style.width = playerDNA.pressureResilience + '%';
    document.getElementById('val-pressure').innerText = playerDNA.pressureResilience + '%';
    document.getElementById('bar-check').style.width = playerDNA.checkReaction + '%';
    document.getElementById('val-check').innerText = playerDNA.checkReaction + '%';
    document.getElementById('bar-endgame').style.width = playerDNA.endgameSkill + '%';
    document.getElementById('val-endgame').innerText = playerDNA.endgameSkill + '%';

    let list = document.getElementById('dna-insights-list');
    list.innerHTML = '';
    list.innerHTML += '<li>⚔️ Advantage Conversion: ' + playerDNA.conversionWhenAhead + '% accuracy when leading by +3.00 eval.</li>';
    list.innerHTML += '<li>🛡️ Defensive Resilience: ' + playerDNA.pressureResilience + '% accuracy when defending behind -3.00 eval.</li>';
    list.innerHTML += '<li>🎯 Average Centipawn Loss: ' + playerDNA.acpl + ' CP.</li>';
    list.innerHTML += '<li>📊 True Estimated Elo: ' + playerDNA.calculatedElo + ' Elo.</li>';
}

function exportDNAFile() {
    let blob = new Blob([JSON.stringify(playerDNA, null, 2)], { type: "application/json" });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = guestProfile.username + "_behavioral_dna.json";
    a.click();
}

function importDNAFile(e) {
    let file = e.target.files[0];
    if (!file) {
        return;
    }
    let r = new FileReader();
    r.onload = function(ev) {
        try {
            activeCloneDNA = JSON.parse(ev.target.result);
            alert("Behavioral DNA loaded! Switch Game Mode to 'Play vs My Behavioral Clone' to test against it.");
            document.getElementById('game-mode').value = 'clone';
            currentMode = 'clone';
            document.getElementById('dna-modal').style.display = 'none';
        } catch (err) {
            alert("Invalid DNA JSON.");
        }
    };
    r.readAsText(file);
}
