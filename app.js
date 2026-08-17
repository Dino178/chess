// =================================================================
// 0. FIREBASE & CLOUD FIRESTORE / REALTIME DB INITIALIZATION
// =================================================================
// Insert your Firebase project credentials below
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
let firestore = null;
let currentUser = null;
let isAdmin = false;

// Initialize Firebase services if valid credentials are present
if (typeof firebase !== 'undefined' && firebaseConfig.apiKey && firebaseConfig.apiKey !== "YOUR_API_KEY") {
    try {
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
        }
        auth = firebase.auth();
        db = firebase.database();
        if (firebase.firestore) {
            firestore = firebase.firestore();
        }
    } catch (e) {
        console.warn("Firebase initialization skipped or failed; running in offline guest mode.", e);
    }
}

// Local Computer Sync & Persistent Profile Storage
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
// 2. MASSIVE ROSTER OF 40+ ORIGINAL BOTS (TIERED, PERSONALITY, STYLES)
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

// 1. Standard Tiered Ladder (100 -> 3200)
addBot("bot_sprout", "Sprout", 100, "ladder", "Beginner");
addBot("bot_toby", "Toby", 200, "ladder", "Beginner");
addBot("bot_finley", "Finley", 300, "ladder", "Beginner");
addBot("bot_milo", "Milo", 400, "ladder", "Beginner");
addBot("bot_jasper", "Jasper", 500, "ladder", "Casual");
addBot("bot_sienna", "Sienna", 600, "ladder", "Casual");
addBot("bot_rowan", "Rowan", 700, "ladder", "Casual");
addBot("bot_bruno", "Bruno", 800, "ladder", "Intermediate");
addBot("bot_chloe", "Chloe", 900, "ladder", "Intermediate");
addBot("bot_darius", "Darius", 1000, "ladder", "Intermediate");
addBot("bot_astrid", "Astrid", 1100, "ladder", "Club");
addBot("bot_mateo", "Mateo", 1200, "ladder", "Club");
addBot("bot_korra", "Korra", 1300, "ladder", "Club");
addBot("bot_selena", "Selena", 1400, "ladder", "Advanced");
addBot("bot_alder", "Alder", 1500, "ladder", "Advanced");
addBot("bot_nadia", "Nadia", 1600, "ladder", "Advanced");
addBot("bot_orion", "Orion", 1700, "ladder", "Expert");
addBot("bot_valen", "Valen", 1800, "ladder", "Expert");
addBot("bot_cassian", "Cassian", 1900, "ladder", "Expert");
addBot("bot_lyra", "Lyra", 2000, "ladder", "Master");
addBot("bot_marcus", "Marcus", 2200, "ladder", "Master");
addBot("bot_kaito", "Kaito", 2400, "ladder", "International Master");
addBot("bot_artemis", "Artemis", 2600, "ladder", "Grandmaster");
addBot("bot_solaris", "Solaris", 2800, "ladder", "Super Grandmaster");
addBot("bot_stockfishmax", "Titan Core", 3200, "ladder", "Engine Maximum");

// 2. Personality Piece Specialists
addBot("pers_pippa", "Pippa (Pawn Specialist)", 100, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'p'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_rex", "Rex (King Explorer)", 250, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'k'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_rampart", "Rampart (Rook Fortress)", 1000, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'r'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_basil", "Basil (Bishop Fanatic)", 1150, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'b'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_valkyrie", "Valkyrie (Queen Striker)", 1250, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'q'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});
addBot("pers_gallop", "Sir Gallop (Knight Hopper)", 1350, "personality", "Personality", function(moves) {
    let favs = moves.filter(function(m) { return m.piece === 'n'; });
    if (favs.length > 0 && Math.random() < 0.75) {
        return favs[Math.floor(Math.random() * favs.length)];
    }
    return null;
});

// 3. Strategic & Behavioral Archetypes
addBot("beh_vanguard", "Vanguard (Berserker)", 800, "behavior", "Aggressive", function(moves) {
    let caps = moves.filter(function(m) { return m.captured; });
    if (caps.length > 0 && Math.random() < 0.85) {
        return caps[Math.floor(Math.random() * caps.length)];
    }
    return null;
});
addBot("beh_zenith", "Zenith (Pacifist)", 900, "behavior", "Positional", function(moves) {
    let nonCaps = moves.filter(function(m) { return !m.captured; });
    if (nonCaps.length > 0 && Math.random() < 0.80) {
        return nonCaps[Math.floor(Math.random() * nonCaps.length)];
    }
    return null;
});
addBot("beh_crag", "Crag (Turtle Guard)", 1100, "behavior", "Solid", function(moves) {
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
addBot("beh_ballista", "Ballista (Long-Range Sniper)", 1400, "behavior", "Positional", function(moves) {
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
addBot("beh_retreat", "Bramble (Cautious Dodger)", 950, "behavior", "Quirky", function(moves) {
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
addBot("beh_wing", "Aethelgard (Fianchetto Master)", 1650, "behavior", "Positional", function(moves) {
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
addBot("beh_tempest", "Tempest (Gambit Striker)", 1750, "behavior", "Tactical", function(moves) {
    let gambitMoves = moves.filter(function(m) {
        return m.captured || m.san.indexOf('+') !== -1 || m.piece === 'n';
    });
    if (gambitMoves.length > 0 && Math.random() < 0.70) {
        return gambitMoves[Math.floor(Math.random() * gambitMoves.length)];
    }
    return null;
});

// Calibration Benchmarks for Placement Matches
const PLACEMENT_BENCHMARKS = [600, 900, 1200, 1500, 1800];

// Admin Random Name Generator (21x21x21 combinations)
const word1 = ["Sneaky", "Brilliant", "Clumsy", "Rapid", "Silent", "Angry", "Happy", "Cosmic", "Shadow", "Golden", "Iron", "Mystic", "Rogue", "Brave", "Lazy", "Fierce", "Swift", "Toxic", "Crystal", "Phantom", "Cyber"];
const word2 = ["Penguin", "Dragon", "Wizard", "Knight", "Panda", "Tiger", "Goblin", "Ninja", "Robot", "Pirate", "Ghost", "Falcon", "Kraken", "Wolf", "Bear", "Sloth", "Cobra", "Raven", "Shark", "Yeti", "Cyborg"];
const word3 = ["Slayer", "Master", "Crusher", "King", "Queen", "Legend", "Maker", "Hunter", "Breaker", "Walker", "Sniper", "Jumper", "Dasher", "Runner", "Thinker", "Player", "Tactic", "Gambit", "Blunder", "Genius", "Hero"];

function generateBotUsername() {
    let w1 = word1[Math.floor(Math.random() * word1.length)];
    let w2 = word2[Math.floor(Math.random() * word2.length)];
    let w3 = word3[Math.floor(Math.random() * word3.length)];
    return w1 + w2 + w3;
}

// =================================================================
// 3. ADAPTIVE SITUATIONAL DNA ENGINE & POSITION REPLAY MEMORY
// =================================================================
const DEFAULT_DNA = {
    gamesPlayed: 0,
    acpl: 45,
    aggression: 50,
    tactics: 50,
    conversionWhenAhead: 50,
    pressureResilience: 50,
    checkReaction: 50,
    endgameSkill: 50,
    calculatedElo: 1200,
    exactPositionMemory: {}
};

let playerDNA = Object.assign({}, DEFAULT_DNA, JSON.parse(localStorage.getItem('chessPlayerDNA')) || {});
let activeCloneDNA = null;

function saveGuestAndDNA() {
    localStorage.setItem('chessGuestProfile', JSON.stringify(guestProfile));
    localStorage.setItem('chessPlayerDNA', JSON.stringify(playerDNA));
    updateProfileUI();

    if (firestore && currentUser) {
        firestore.collection('users').doc(currentUser.uid).set({
            profile: guestProfile,
            dna: playerDNA,
            lastUpdated: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true }).catch(function(err) {
            console.error("Firestore sync error:", err);
        });
    }
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

        let simpleFen = m.fen.split(' ').slice(0, 4).join(' ');
        if (!playerDNA.exactPositionMemory[simpleFen]) {
            playerDNA.exactPositionMemory[simpleFen] = {};
        }
        playerDNA.exactPositionMemory[simpleFen][m.move] = (playerDNA.exactPositionMemory[simpleFen][m.move] || 0) + 1;

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
    
    playerDNA.acpl = Math.round((playerDNA.acpl * 0.65) + (matchACPL * 0.35));

    if (aheadMoves > 0) {
        playerDNA.conversionWhenAhead = Math.round((playerDNA.conversionWhenAhead * 0.65) + ((aheadAccurate / aheadMoves) * 100 * 0.35));
    }
    if (underPressureMoves > 0) {
        playerDNA.pressureResilience = Math.round((playerDNA.pressureResilience * 0.65) + ((underPressureAccurate / underPressureMoves) * 100 * 0.35));
    }
    if (checkResponses > 0) {
        playerDNA.checkReaction = Math.round((playerDNA.checkReaction * 0.65) + ((checkAccurate / checkResponses) * 100 * 0.35));
    }
    if (endgameMoves > 0) {
        playerDNA.endgameSkill = Math.round((playerDNA.endgameSkill * 0.65) + ((endgameAccurate / endgameMoves) * 100 * 0.35));
    }

    playerDNA.tactics = Math.min(100, Math.max(10, Math.round(100 - (playerDNA.acpl * 0.75))));
    
    let estimatedElo = Math.max(250, Math.min(2900, Math.round(2900 - (playerDNA.acpl * 26))));
    playerDNA.calculatedElo = Math.round((playerDNA.calculatedElo * 0.65) + (estimatedElo * 0.35));

    saveGuestAndDNA();
}

function getCloneBotMove(moves) {
    let target = activeCloneDNA || playerDNA;
    let simpleFen = game.fen().split(' ').slice(0, 4).join(' ');

    if (target.exactPositionMemory && target.exactPositionMemory[simpleFen]) {
        let options = target.exactPositionMemory[simpleFen];
        let bestSan = null;
        let highestFreq = 0;
        for (let san in options) {
            if (options[san] > highestFreq && moves.some(function(m) { return m.san === san; })) {
                highestFreq = options[san];
                bestSan = san;
            }
        }
        if (bestSan) {
            return bestSan;
        }
    }

    if (target.tactics > 60) {
        let safeMoves = moves.filter(function(m) {
            let tempGame = new Chess(game.fen());
            tempGame.move(m.san);
            let oppMoves = tempGame.moves({ verbose: true });
            return !oppMoves.some(function(om) {
                return om.captured && PIECE_VALUES[om.captured] >= PIECE_VALUES[m.piece];
            });
        });
        if (safeMoves.length > 0) {
            moves = safeMoves;
        }
    }

    if (Math.random() * 100 < target.aggression) {
        let aggressive = moves.filter(function(m) {
            return m.captured || m.san.indexOf('+') !== -1;
        });
        if (aggressive.length > 0) {
            return aggressive[Math.floor(Math.random() * aggressive.length)].san;
        }
    }

    return null;
}

// =================================================================
// 4. CAPS2 CALIBRATION & FIDE TOURNAMENT PERFORMANCE FORMULAS
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

function calculateACPLToPerformance(acpl, oppElo, outcome) {
    let qualityElo = 0;
    if (acpl <= 15) {
        qualityElo = 2600 - (acpl * 15);
    } else if (acpl <= 35) {
        qualityElo = 2200 - ((acpl - 15) * 20);
    } else if (acpl <= 65) {
        qualityElo = 1700 - ((acpl - 35) * 18);
    } else if (acpl <= 110) {
        qualityElo = 1100 - ((acpl - 65) * 10);
    } else if (acpl <= 170) {
        qualityElo = 650 - ((acpl - 110) * 5);
    } else {
        qualityElo = Math.max(100, 350 - ((acpl - 170) * 2));
    }

    let resultBonus = 0;
    if (outcome === 1) {
        resultBonus = 300;
    } else if (outcome === 0.5) {
        resultBonus = 0;
    } else {
        resultBonus = -300;
    }
    let expectedVersusOpponent = oppElo + resultBonus;

    let finalPerformance = Math.round((qualityElo * 0.50) + (expectedVersusOpponent * 0.50));
    return Math.max(100, Math.min(3100, finalPerformance));
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
            if (line.indexOf('bestmove') === 0) {
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
// 5. APPLICATION STATE & INITIALIZATION
// =================================================================
let board = null;
let game = null;
let currentMode = 'bot';
let currentBot = null;
let matchId = null;
let matchRef = null;
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
    pieceTheme: 'https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/wikipedia/{piece}.png'
};

document.addEventListener('DOMContentLoaded', function() {
    updateProfileUI();
    populateBotDropdown();
    renderFriendsList();
    updateLeaderboardUI();

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

    // Guest and Name Handlers
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

    // Firebase Authentication
    if (auth) {
        document.getElementById('login-btn').addEventListener('click', function() {
            let email = document.getElementById('email-input').value.trim();
            let password = document.getElementById('password-input').value.trim();
            auth.signInWithEmailAndPassword(email, password)
                .then(function(res) { handleAuthSuccess(res.user); })
                .catch(function(err) { alert("Login failed: " + err.message); });
        });

        document.getElementById('signup-btn').addEventListener('click', function() {
            let email = document.getElementById('email-input').value.trim();
            let password = document.getElementById('password-input').value.trim();
            auth.createUserWithEmailAndPassword(email, password)
                .then(function(res) {
                    let customName = document.getElementById('username-input').value.trim() || email.split('@')[0];
                    res.user.updateProfile({ displayName: customName });
                    handleAuthSuccess(res.user);
                })
                .catch(function(err) { alert("Sign up failed: " + err.message); });
        });

        document.getElementById('google-login-btn').addEventListener('click', function() {
            let provider = new firebase.auth.GoogleAuthProvider();
            auth.signInWithPopup(provider)
                .then(function(res) { handleAuthSuccess(res.user); })
                .catch(function(err) { alert("Google Sign-In failed: " + err.message); });
        });

        auth.onAuthStateChanged(function(user) {
            if (user) {
                handleAuthSuccess(user);
            }
        });
    }

    // Admin Bot Spawner Handler
    let adminSpawnBtn = document.getElementById('admin-spawn-btn');
    if (adminSpawnBtn) {
        adminSpawnBtn.addEventListener('click', function() {
            if (!isAdmin || !db) {
                return;
            }
            let selectedBot = allBots.find(function(b) {
                return b.id === document.getElementById('bot-select').value;
            });
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

            botChat("Admin: Spawned bot " + randomName + " (" + finalElo + " Elo) into global matchmaking queue.");
            document.getElementById('admin-custom-elo').value = '';
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
        if (currentMode === 'online') {
            findOnlineMatch();
        } else {
            startGame(false);
        }
    });
    document.getElementById('resign-btn').addEventListener('click', function() {
        if (gameActive) {
            endGame('loss', "Resigned");
        }
    });
    document.getElementById('draw-btn').addEventListener('click', handleDrawOffer);
    document.getElementById('undo-btn').addEventListener('click', handleUndo);

    // Sandbox FEN Loader
    let loadFenBtn = document.getElementById('load-fen-btn');
    if (loadFenBtn) {
        loadFenBtn.addEventListener('click', function() {
            let fen = document.getElementById('fen-input').value.trim();
            if (game.load(fen)) {
                board.position(fen);
                startGame(true);
            } else {
                alert("Invalid FEN notation string.");
            }
        });
    }

    // PGN Downloader
    let downloadPgnBtn = document.getElementById('download-pgn');
    if (downloadPgnBtn) {
        downloadPgnBtn.addEventListener('click', downloadGamePGN);
    }

    document.getElementById('open-dna-btn').addEventListener('click', openDNAModal);
    document.getElementById('export-dna-btn').addEventListener('click', exportDNAFile);
    document.getElementById('import-dna-file').addEventListener('change', importDNAFile);
    document.getElementById('board-theme').addEventListener('change', function(e) {
        document.body.className = e.target.value;
    });

    document.getElementById('clear-data-btn').addEventListener('click', function() {
        if (confirm("WIPE ALL DATA: This will reset your profile, DNA learning memory, calculated Elo, and game history. Proceed?")) {
            localStorage.removeItem('chessGuestProfile');
            localStorage.removeItem('chessPlayerDNA');
            localStorage.removeItem('chessLeaderboard');
            guestProfile = {
                username: "Student_" + Math.floor(1000 + Math.random() * 9000),
                friends: []
            };
            playerDNA = Object.assign({}, DEFAULT_DNA);
            saveGuestAndDNA();
            location.reload();
        }
    });

    game = new Chess();
    board = Chessboard('myBoard', config);
    setupClickToMove();
});

function handleAuthSuccess(user) {
    currentUser = user;
    guestProfile.username = user.displayName || user.email.split('@')[0];
    document.getElementById('auth-modal').style.display = 'none';

    isAdmin = (user.email === "popuppy106@gmail.com");
    let badge = isAdmin ? '<span style="background:#ed4245; padding:2px 4px; border-radius:4px; font-size:10px;">ADMIN</span> ' : '';
    document.getElementById('player-name-display').innerHTML = badge + guestProfile.username;
    
    let adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
        adminPanel.style.display = isAdmin ? 'block' : 'none';
    }

    let onlineOpt = document.querySelector('#game-mode option[value="online"]');
    if (onlineOpt) {
        onlineOpt.disabled = false;
    }

    if (firestore) {
        firestore.collection('users').doc(user.uid).get().then(function(doc) {
            if (doc.exists) {
                let data = doc.data();
                if (data.dna) {
                    playerDNA = Object.assign({}, DEFAULT_DNA, data.dna);
                }
                if (data.profile && data.profile.friends) {
                    guestProfile.friends = data.profile.friends;
                }
                saveGuestAndDNA();
                renderFriendsList();
            } else {
                saveGuestAndDNA();
            }
        });
    } else {
        saveGuestAndDNA();
    }
}

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

function updateLeaderboardUI() {
    let lb = document.getElementById('leaderboard-stats');
    if (!lb) {
        return;
    }
    lb.innerHTML = '';
    let d = JSON.parse(localStorage.getItem('chessLeaderboard')) || {};
    for (let id in d) {
        let s = d[id];
        lb.innerHTML += '<div class="stat-row"><span class="stat-name">' + s.name + '</span><span class="stat-score">' + s.wins + 'W - ' + s.losses + 'L - ' + (s.draws || 0) + 'D</span></div>';
    }
}

function recordLeaderboardMatch(opponentName, outcome) {
    let d = JSON.parse(localStorage.getItem('chessLeaderboard')) || {};
    if (!d[opponentName]) {
        d[opponentName] = { name: opponentName, wins: 0, losses: 0, draws: 0 };
    }
    if (outcome === 'win') {
        d[opponentName].wins++;
    } else if (outcome === 'loss') {
        d[opponentName].losses++;
    } else {
        d[opponentName].draws++;
    }
    localStorage.setItem('chessLeaderboard', JSON.stringify(d));
    updateLeaderboardUI();
}

function loadEngine() {
    return fetch('https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js')
        .then(function(res) { return res.text(); })
        .then(function(code) {
            return new Worker(URL.createObjectURL(new Blob([code], { type: 'application/javascript' })));
        });
}

// =================================================================
// 6. ONLINE MULTIPLAYER MATCHMAKING QUEUE
// =================================================================
function findOnlineMatch() {
    if (!currentUser || !db) {
        return alert("You must be logged in to play online multiplayer!");
    }
    updateStatus("Searching for an opponent...");
    botChat("Searching for a live online match...");

    let queueRef = db.ref('matchmaking');
    queueRef.orderByChild('waiting').equalTo(true).once('value', function(snapshot) {
        let players = snapshot.val();
        if (players) {
            let opponentKey = Object.keys(players)[0];
            let opponent = players[opponentKey];

            if (opponent.uid === currentUser.uid) {
                return waitForMatch(queueRef);
            }

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

    myQueueRef.on('value', function(snapshot) {
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
    game.reset();
    board.start();
    board.orientation(myPlayerColor === 'w' ? 'white' : 'black');
    gameActive = true;
    botThinking = false;
    selectedSquare = null;

    document.getElementById('black-name').innerText = opponentName;
    document.getElementById('white-name').innerText = currentUser.displayName || currentUser.email.split('@')[0];
    botChat("Match found! You are playing as " + (myPlayerColor === 'w' ? "White" : "Black") + ".");

    if (opponentData && opponentData.isBot) {
        currentBot = allBots.find(function(b) { return b.id === opponentData.botId; }) || allBots[0];
        currentBot.elo = opponentData.elo || currentBot.elo;
        if (myPlayerColor === 'b') {
            botThinking = true;
            setTimeout(triggerBot, 500);
        }
    }

    matchRef = db.ref('matches/' + matchId);
    matchRef.on('value', function(snapshot) {
        let data = snapshot.val();
        if (data && data.fen !== game.fen() && data.fen !== "start") {
            game.load(data.fen);
            board.position(game.fen());
            handleMoveVisuals({ san: data.lastMove }, true);
        }
    });
    updateStatus();
}

// =================================================================
// 7. ROBUST STOCKFISH BOT CONTROLLER (NATIVE UCI_ELO + BLUNDER CURVE)
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

    // Human error probability curve for Elo < 1350
    if (elo < 1350) {
        let errorRate = (1350 - elo) / 1400;
        if (Math.random() < errorRate) {
            let nonCheckingMoves = moves.filter(function(m) {
                return m.san.indexOf('+') === -1 && m.san.indexOf('#') === -1;
            });
            let pool = nonCheckingMoves.length > 0 ? nonCheckingMoves : moves;
            let randomMove = pool[Math.floor(Math.random() * pool.length)];
            return executeBotMove(randomMove.san);
        }
    }

    // Native Stockfish UCI LimitStrength Engine Calibration
    let clampedElo = Math.max(1350, Math.min(2850, elo));
    let depth = 3;
    if (elo >= 2500) {
        depth = 18;
    } else if (elo >= 2000) {
        depth = 14;
    } else if (elo >= 1500) {
        depth = 10;
    } else if (elo >= 1000) {
        depth = 6;
    }
    let moveTime = Math.min(2500, Math.max(150, Math.floor(elo * 0.8)));

    engine.postMessage('setoption name UCI_LimitStrength value true');
    engine.postMessage('setoption name UCI_Elo value ' + clampedElo);
    engine.postMessage('position fen ' + game.fen());
    engine.postMessage('go depth ' + depth + ' movetime ' + moveTime);
}

function handleEngineMessage(event) {
    let line = event.data;
    if (line.indexOf('bestmove') === 0) {
        let bestMove = line.split(' ')[1];
        if (bestMove && bestMove !== '(none)') {
            executeBotMove(bestMove);
        }
    }
}

function executeBotMove(sanOrUci) {
    let delay = Math.floor(Math.random() * 300) + 200;
    setTimeout(function() {
        let move = game.move(sanOrUci, { sloppy: true });
        if (move) {
            board.position(game.fen());
            botThinking = false;
            handleMoveVisuals(move, false);
            if (currentMode === 'online' && matchRef) {
                matchRef.update({ fen: game.fen(), lastMove: move.san, turn: game.turn() });
            }
        }
    }, delay);
}

// =================================================================
// 8. BOARD CONTROL & GAMEPLAY LOOP
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
        botChat("Match started vs " + currentBot.name + " (" + currentBot.elo + " Elo).");
    } else if (currentMode === 'clone') {
        currentBot = {
            id: 'clone_bot',
            name: "Player Clone AI",
            elo: playerDNA.calculatedElo,
            category: 'clone',
            handler: null
        };
        document.getElementById('black-name').innerText = "Player Clone AI";
        document.getElementById('black-elo').innerText = "(Elo " + playerDNA.calculatedElo + ")";
        botChat("Facing your behavioral DNA clone (" + playerDNA.calculatedElo + " Elo).");
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
                if (currentMode === 'online' && matchRef) {
                    matchRef.update({ fen: game.fen(), lastMove: move.san, turn: game.turn() });
                }
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
    if (currentMode === 'online' && matchRef) {
        matchRef.update({ fen: game.fen(), lastMove: move.san, turn: game.turn() });
    }
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

    let opponentName = currentBot ? currentBot.name : "Player 2";
    recordLeaderboardMatch(opponentName, result);

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
            deadW += '<div class="grave-piece" style="background-image:url(\'https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/wikipedia/w' + p.toUpperCase() + '.png\')"></div>';
            scoreB += PIECE_VALUES[p];
        }
        let diffB = start[p] - counts.b[p];
        for (let i = 0; i < diffB; i++) {
            deadB += '<div class="grave-piece" style="background-image:url(\'https://cdnjs.cloudflare.com/ajax/libs/chessboard-js/1.0.0/img/chesspieces/wikipedia/b' + p.toUpperCase() + '.png\')"></div>';
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
// 9. ACCURATE CAPS2 REVIEW & FIDE PERFORMANCE RATINGS
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
    let cpLossTotals = { w: 0, b: 0 };
    let moveCounts = { w: 0, b: 0 };
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
        let cpLoss = Math.max(0, -diffCp);
        item.cpLoss = cpLoss;
        item.evalBefore = prevEval;

        cpLossTotals[item.color] += Math.min(500, cpLoss);
        moveCounts[item.color]++;

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

    let acplW = moveCounts.w > 0 ? (cpLossTotals.w / moveCounts.w) : 60;
    let acplB = moveCounts.b > 0 ? (cpLossTotals.b / moveCounts.b) : 60;

    let accW = accuracyTotals.w.length > 0 ? Math.round(accuracyTotals.w.reduce(function(a, b) { return a + b; }, 0) / accuracyTotals.w.length) : 70;
    let accB = accuracyTotals.b.length > 0 ? Math.round(accuracyTotals.b.reduce(function(a, b) { return a + b; }, 0) / accuracyTotals.b.length) : 70;

    let knownPlayerElo = playerDNA.calculatedElo || 1200;
    let knownBotElo = currentBot ? currentBot.elo : 1200;

    let scoreW = (gameResult === 'win') ? 1 : (gameResult === 'draw') ? 0.5 : 0;
    let scoreB = 1 - scoreW;

    let performanceW = calculateACPLToPerformance(acplW, knownBotElo, scoreW);
    let performanceB = calculateACPLToPerformance(acplB, knownPlayerElo, scoreB);

    document.getElementById('accuracy-score-w').innerText = accW + "%";
    document.getElementById('accuracy-score-b').innerText = accB + "%";
    document.getElementById('caps-w').innerText = "Perf. Rating: " + performanceW;
    document.getElementById('caps-b').innerText = "Perf. Rating: " + performanceB;

    for (let k in counts) {
        let statEl = document.getElementById("stat-" + k);
        if (statEl) {
            statEl.innerText = counts[k];
        }
    }
    
    document.getElementById('analysis-status').innerText = "CAPS2 Review Complete";
    analyzeGameForDeepDNA(gameHistory, myPlayerColor);

    if (firestore && currentUser) {
        firestore.collection('users').doc(currentUser.uid).collection('game_history').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            accuracy: { white: accW, black: accB },
            performance: { white: performanceW, black: performanceB },
            opponent: currentBot ? currentBot.name : "Player 2",
            result: gameResult
        }).catch(function(err) {
            console.error("Could not save game history:", err);
        });
    }
}

// =================================================================
// 10. PGN DOWNLOADER, DNA MODAL & IMPORT/EXPORT PIPELINE
// =================================================================
function downloadGamePGN() {
    let pgnText = '';
    pgnText += '[Event "Casual Match"]\n';
    pgnText += '[Site "Localhost Client"]\n';
    pgnText += '[Date "' + new Date().toISOString().slice(0, 10) + '"]\n';
    pgnText += '[White "' + (guestProfile.username || 'White') + '"]\n';
    pgnText += '[Black "' + (currentBot ? currentBot.name : 'Black') + '"]\n';
    pgnText += '[Result "*"]\n\n';

    for (let i = 1; i < gameHistory.length; i += 2) {
        let num = Math.ceil(i / 2) + ".";
        let wMove = gameHistory[i].move;
        let bMove = gameHistory[i + 1] ? gameHistory[i + 1].move : "";
        pgnText += num + " " + wMove + " " + bMove + " ";
    }

    let blob = new Blob([pgnText], { type: "text/plain" });
    let a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = "chess_match_" + Date.now() + ".pgn";
    a.click();
}

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
    list.innerHTML += '<li>📊 Profile Rating: ' + playerDNA.calculatedElo + ' Elo.</li>';
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
