// =================================================================
// 0. FIREBASE & CLOUD FIRESTORE HYBRID INITIALIZATION
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
let firestore = null;
let currentUser = null;
let isAdmin = false;

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
        console.warn("Firebase initialization skipped or failed; running local guest mode.", e);
    }
}

// Local Guest Storage & Fallback Profile Setup
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
// 2. COMPLETE BOT ROSTER (40+ BOTS WITH FULL DIALOGUES & LOGIC)
// =================================================================
const allBots = [];
function addBot(id, name, elo, type, category, dialogues, handler) {
    if (handler === undefined) {
        handler = null;
    }
    allBots.push({
        id: id,
        name: name,
        elo: elo,
        type: type,
        category: category,
        dialogues: dialogues,
        handler: handler
    });
}

// 50 ELO EXTREMELY ARROGANT MEME BOT
addBot("bot_dunning", "Lord Dunning (50)", 50, "personality", "Hyper-Arrogant", {
    start: [
        "Bow down! You are playing against an undefeated theoretical deity.",
        "I will checkmate you in 3 moves without even looking at the screen.",
        "Prepare yourself. Grandmasters cry when they see my pawn structures.",
        "Your resignation will be accepted whenever you realize my greatness."
    ],
    take: [
        "All calculated. That piece was simply cluttering my imperial conquest.",
        "You fell for my master trap! Taking my pieces only speeds up your demise!",
        "A peasant takes a coin, while a king prepares the guillotine. You are doomed!",
        "Did you really think that piece was safe from my omniscient vision?"
    ],
    losePiece: [
        "A brilliant tactical sacrifice! You fell directly into my 47-move trap!",
        "I gave you that piece out of royal pity. Don't flatter yourself.",
        "My king operates on a higher dimension. That piece was a double-agent anyway.",
        "Material is an illusion for weak minds. My positional mastery is absolute!"
    ],
    check: [
        "CHECK! Kneel before your grand emperor!",
        "Feel the raw fury of an absolute chess deity! Surrender now!",
        "Tremble! Your king's reign ends this very second!"
    ],
    win: [
        "HAHAHA! Too easy! Go read a book and never challenge a god again!",
        "Flawless perfection! Another historic masterpiece written by Lord Dunning!",
        "I didn't even use 1% of my cerebral capacity to dismantle you."
    ],
    lose: [
        "WHAT?! My mouse glitched! My cat jumped on the keyboard! You CHEATED!",
        "This game was clearly rigged by the developers. My true rating is 3500!",
        "A fluke! I demand an immediate rematch, peasant!",
        "The board lighting was uneven! This match does not count in official archives!"
    ]
}, function(moves) {
    return moves[Math.floor(Math.random() * moves.length)];
});

// Standard Tiered Ladder (100 -> 3200)
addBot("bot_sprout", "Sprout", 100, "ladder", "Beginner", {
    start: ["Hi! I'm still learning how the horse jumps!", "Are we playing checkers or chess?"],
    take: ["Yay! I got one!", "Look what I found!"],
    losePiece: ["Oh no, where did my piece go?", "Wait, I didn't see that!"],
    check: ["Check! Am I winning yet?", "Beep boop, king in trouble!"],
    win: ["I won?! That was so fun!", "Yay! My hard work paid off!"],
    lose: ["Good game! You are very good at this!", "Aww, good try by me though!"]
});

addBot("bot_toby", "Toby", 200, "ladder", "Beginner", {
    start: ["Let's play! My big brother taught me chess yesterday."],
    take: ["I like eating pieces!"],
    losePiece: ["Hey, give that back!"],
    check: ["Check! Watch out!"],
    win: ["I did it! I'm telling my mom!"],
    lose: ["Can we play again? Please?"]
});

addBot("bot_finley", "Finley", 300, "ladder", "Beginner", {
    start: ["I'm going to push all my pawns forward!"],
    take: ["Nom nom nom, captured!"],
    losePiece: ["Oops! Didn't see that bishop sneak up."],
    check: ["Check! Move your king!"],
    win: ["Pawn power wins the day!"],
    lose: ["Ah, I left my back rank open."]
});

addBot("bot_milo", "Milo", 400, "ladder", "Beginner", {
    start: ["I know what castling is now, prepare yourself!"],
    take: ["Snagged it!"],
    losePiece: ["Wait, was that square guarded?"],
    check: ["Check! King on the run!"],
    win: ["Clean win! I'm getting better every day."],
    lose: ["I really need to stop hanging my rooks."]
});

addBot("bot_jasper", "Jasper", 500, "ladder", "Casual", {
    start: ["Let's have a nice casual game."],
    take: ["Got one of your pieces!"],
    losePiece: ["Ah, miscalculated that exchange."],
    check: ["Check to your king!"],
    win: ["Great game, thanks for playing!"],
    lose: ["Nice one! You saw right through my defense."]
});

addBot("bot_sienna", "Sienna", 600, "ladder", "Casual", {
    start: ["Good luck! Let's have a clean and fun game."],
    take: ["Material secured!"],
    losePiece: ["Ah, tactical oversight on my part."],
    check: ["Check! Keep your king safe."],
    win: ["Nice game! Good match."],
    lose: ["Well played! Your tactics were sharp."]
});

addBot("bot_rowan", "Rowan", 700, "ladder", "Casual", {
    start: ["I've been studying open games lately."],
    take: ["Trading into an open file."],
    losePiece: ["Good vision, I missed that square."],
    check: ["Check! How will you block?"],
    win: ["Good battle! Keep practicing!"],
    lose: ["Tough loss for me, great tactics!"]
});

addBot("bot_bruno", "Bruno (Brawler)", 800, "ladder", "Intermediate", {
    start: ["No quiet games here. Prepare for a brawl!"],
    take: ["SMASH! That's off the board!"],
    losePiece: ["Just a scratch. Attack continues!"],
    check: ["CHECK! Nowhere to hide!"],
    win: ["Total knockout! Better luck next time."],
    lose: ["You weathered the storm. Respect."]
});

addBot("bot_chloe", "Chloe", 900, "ladder", "Intermediate", {
    start: ["I love dynamic tactical play. Let's see your ideas."],
    take: ["That tactic worked nicely."],
    losePiece: ["Ouch, did I miscalculate?"],
    check: ["Check! Defend your monarch."],
    win: ["Checkmate! Beautiful coordination."],
    lose: ["Oof, you outplayed me in the middle game."]
});

addBot("bot_darius", "Darius", 1000, "ladder", "Intermediate", {
    start: ["A thousand Elo is where real chess begins."],
    take: ["Trading down into an advantage."],
    losePiece: ["A careless mistake. I will fight on."],
    check: ["Check! Watch your diagonals."],
    win: ["Solid fundamentals win games."],
    lose: ["Impressive tactical vision from you."]
});

addBot("bot_astrid", "Astrid", 1100, "ladder", "Club", {
    start: ["I love classical pawn structures. Let's begin."],
    take: ["Capturing toward the center."],
    losePiece: ["Strong move. You caught me off guard."],
    check: ["Check! The center opens up."],
    win: ["Patience and structure prevail."],
    lose: ["You dismantled my center completely!"]
});

addBot("bot_mateo", "Mateo", 1200, "ladder", "Club", {
    start: ["Let's test your opening repertoire."],
    take: ["Exchanging down."],
    losePiece: ["You found a really neat tactic there."],
    check: ["Check! Careful now."],
    win: ["Precision and patience."],
    lose: ["I got outplayed. Excellent performance!"]
});

addBot("bot_korra", "Korra", 1300, "ladder", "Club", {
    start: ["I fight for every single square on the board."],
    take: ["Snagging key material."],
    losePiece: ["A sharp blow, but the fight is not over."],
    check: ["Check! Feel the pressure!"],
    win: ["Tenacity wins the fight!"],
    lose: ["You outmaneuvered me cleanly. Good game!"]
});

addBot("bot_selena", "Selena", 1400, "ladder", "Advanced", {
    start: ["I don't leave tactical weaknesses unpunished."],
    take: ["Punishing your loose piece."],
    losePiece: ["Sharp calculation. I didn't foresee that resource."],
    check: ["Check! Your king safety is compromised."],
    win: ["A textbook conversion."],
    lose: ["Fantastic play. You belong in a tournament hall."]
});

addBot("bot_alder", "Alder", 1500, "ladder", "Advanced", {
    start: ["Calculation and prophylaxis will decide this encounter."],
    take: ["Eliminating your active defender."],
    losePiece: ["Very deep vision. Well calculated."],
    check: ["Check. King position degraded."],
    win: ["Strategic advantages converted smoothly."],
    lose: ["I yielded the initiative. Well played!"]
});

addBot("bot_nadia", "Nadia", 1600, "ladder", "Advanced", {
    start: ["Positional harmony is the key to chess mastery."],
    take: ["Target acquired and eliminated."],
    losePiece: ["Deep counterplay. Very impressive."],
    check: ["Check! The pressure mounts."],
    win: ["Controlled from start to finish."],
    lose: ["You dismantled my setup completely. Bravo!"]
});

addBot("bot_orion", "Orion", 1700, "ladder", "Expert", {
    start: ["The initiative is everything in modern chess."],
    take: ["Striking the weak point."],
    losePiece: ["An unexpected tactical turnaround!"],
    check: ["Check! King safety compromised."],
    win: ["The initiative carried through to victory."],
    lose: ["You refuted my attack with absolute precision."]
});

addBot("bot_valen", "Valen", 1800, "ladder", "Expert", {
    start: ["Expect relentless pressure on every weak square."],
    take: ["Liquidating into a winning endgame."],
    losePiece: ["Brilliant resource! I have to defend carefully."],
    check: ["Check! The net tightens."],
    win: ["Flawless execution."],
    lose: ["A masterclass. You played with incredible precision."]
});

addBot("bot_cassian", "Cassian", 1900, "ladder", "Expert", {
    start: ["Every master game is won in the transition from middlegame to endgame."],
    take: ["Precise simplification."],
    losePiece: ["You found the only defensive resource."],
    check: ["Check. The endgame approaches."],
    win: ["Technical conversion complete."],
    lose: ["Flawless endgame play on your end."]
});

addBot("bot_lyra", "Lyra", 2000, "ladder", "Master", {
    start: ["Welcome to candidate master territory."],
    take: ["Structural damage inflicted."],
    losePiece: ["Superb tactical acuity."],
    check: ["Check. Escape squares restricted."],
    win: ["Calculated from move fifteen."],
    lose: ["Outstanding. You played like a titled master."]
});

addBot("bot_marcus", "Marcus", 2200, "ladder", "Master", {
    start: ["National master precision ready. Make your opening move."],
    take: ["The position crumbles."],
    losePiece: ["A profound concept. Commendable."],
    check: ["Check. Defensive lines collapsing."],
    win: ["Checkmate. Precision above all."],
    lose: ["A brilliant victory for you. Well earned."]
});

addBot("bot_kaito", "Kaito", 2400, "ladder", "International Master", {
    start: ["International master standard. No inaccuracies forgiven."],
    take: ["Critical piece removed."],
    losePiece: ["Exceptional Grandmaster-tier idea."],
    check: ["Check. Defenses breached."],
    win: ["Dominant coordination."],
    lose: ["Magnificent play. You deserve an IM norm."]
});

addBot("bot_artemis", "Artemis", 2600, "ladder", "Grandmaster", {
    start: ["Greetings. Let us create something worthy of an anthology."],
    take: ["A concrete concession on your end."],
    losePiece: ["Fascinating complication."],
    check: ["Check. The defensive task is insurmountable."],
    win: ["Grandmaster precision. Thank you for the duel."],
    lose: ["Magnificent. Truly magnificent calculation."]
});

addBot("bot_solaris", "Solaris", 2800, "ladder", "Super Grandmaster", {
    start: ["Super Grandmaster rating active. Perfection is required."],
    take: ["Inaccuracy punished immediately."],
    losePiece: ["An extraordinary stroke of genius."],
    check: ["Check. Mate is imminent."],
    win: ["Flawless technique."],
    lose: ["Incredible. You have defeated a 2800 player."]
});

addBot("bot_stockfishmax", "Titan Core", 3200, "ladder", "Engine Maximum", {
    start: ["Stockfish evaluation depth 30 engaged."],
    take: ["Centipawn differential optimal."],
    losePiece: ["Evaluating counter-threat lines."],
    check: ["Check. Mate in 12 identified."],
    win: ["Evaluation complete. Engine victory assured."],
    lose: ["Hardware anomaly detected. You defeated the engine."]
});

// Personality Specialists
addBot("pers_pippa", "Pam (Pawn Pusher)", 100, "personality", "Personality", {
    start: ["My pawns will destroy you with ease."],
    take: ["Pawn capture!"],
    losePiece: ["Brilliant Sacrifice!"],
    check: ["Check! Look at that!"],
    win: ["My pawn easily destroyed you!"],
    lose: ["I misclicked my pawns and thats why I lost. Play another game and I'll win!"]
}, function(moves) {
    let pMoves = moves.filter(function(m) { return m.piece === 'p'; });
    return (pMoves.length > 0 && Math.random() < 0.8) ? pMoves[Math.floor(Math.random() * pMoves.length)] : null;
});

addBot("pers_rex", "Rex (King Explorer)", 250, "personality", "Personality", {
    start: ["A king leads from the front! Let's march!"],
    take: ["The king claims his spoils!"],
    losePiece: ["A loyal soldier has fallen for the crown!"],
    check: ["Check! Make way for his majesty!"],
    win: ["The warrior king reigns supreme!"],
    lose: ["My royal march ended in tragedy!"]
}, function(moves) {
    let kMoves = moves.filter(function(m) { return m.piece === 'k'; });
    return (kMoves.length > 0 && Math.random() < 0.75) ? kMoves[Math.floor(Math.random() * kMoves.length)] : null;
});

addBot("pers_rampart", "Rampart (Rook Fortress)", 1000, "personality", "Personality", {
    start: ["Rooks belong on open files. Watch my cannons roar!"],
    take: ["Blast through! Rook takes!"],
    losePiece: ["My fortress wall has been breached!"],
    check: ["Check along the rank!"],
    win: ["Checkmate on the seventh rank!"],
    lose: ["My cannons were outmaneuvered!"]
}, function(moves) {
    let rMoves = moves.filter(function(m) { return m.piece === 'r'; });
    return (rMoves.length > 0 && Math.random() < 0.75) ? rMoves[Math.floor(Math.random() * rMoves.length)] : null;
});

addBot("pers_basil", "Basil (Bishop Fanatic)", 1150, "personality", "Personality", {
    start: ["The bishop pair is worth more than gold!"],
    take: ["Sniper strike across the diagonal!"],
    losePiece: ["Not my clergy! A tragic loss."],
    check: ["Long-diagonal check!"],
    win: ["Checkmate across the board!"],
    lose: ["Blocked diagonals proved my undoing."]
}, function(moves) {
    let bMoves = moves.filter(function(m) { return m.piece === 'b'; });
    return (bMoves.length > 0 && Math.random() < 0.75) ? bMoves[Math.floor(Math.random() * bMoves.length)] : null;
});

addBot("pers_valkyrie", "Valkyrie (Queen Striker)", 1250, "personality", "Personality", {
    start: ["My Queen rules this board. Beware her wrath!"],
    take: ["Struck down by the Queen!"],
    losePiece: ["Impossible! My Queen was caught?!"],
    check: ["Check from the Queen herself!"],
    win: ["Kneel before the royal strike!"],
    lose: ["A tragic fall for my royal armada."]
}, function(moves) {
    let qMoves = moves.filter(function(m) { return m.piece === 'q'; });
    return (qMoves.length > 0 && Math.random() < 0.75) ? qMoves[Math.floor(Math.random() * qMoves.length)] : null;
});

addBot("pers_gallop", "Sir Gallop (Knight Hopper)", 1350, "personality", "Personality", {
    start: ["Outposts and forks! My cavalry will jump everywhere!"],
    take: ["Forked and captured!"],
    losePiece: ["My steed was unseated!"],
    check: ["Royal knight check!"],
    win: ["A glorious cavalry charge!"],
    lose: ["Unpinned and dismounted. Good game!"]
}, function(moves) {
    let nMoves = moves.filter(function(m) { return m.piece === 'n'; });
    return (nMoves.length > 0 && Math.random() < 0.75) ? nMoves[Math.floor(Math.random() * nMoves.length)] : null;
});

// Strategic Archetypes
addBot("beh_vanguard", "Vanguard (Berserker)", 800, "behavior", "Aggressive", {
    start: ["Blood and captures! I will take every piece you offer!"],
    take: ["BLOOD! Captured!"],
    losePiece: ["Doesn't matter, ATTACK!"],
    check: ["CHECK! FEEL THE FURY!"],
    win: ["Decimated!"],
    lose: ["I burned out in glory!"]
}, function(moves) {
    let caps = moves.filter(function(m) { return m.captured; });
    return (caps.length > 0 && Math.random() < 0.85) ? caps[Math.floor(Math.random() * caps.length)] : null;
});

addBot("beh_zenith", "Zenith (Pacifist)", 900, "behavior", "Positional", {
    start: ["Peace and harmony. I avoid conflict when possible."],
    take: ["Only taking out of absolute necessity."],
    losePiece: ["I accept this loss calmly."],
    check: ["A gentle check."],
    win: ["Harmonious resolution."],
    lose: ["A well-deserved victory for you."]
}, function(moves) {
    let nonCaps = moves.filter(function(m) { return !m.captured; });
    return (nonCaps.length > 0 && Math.random() < 0.80) ? nonCaps[Math.floor(Math.random() * nonCaps.length)] : null;
});

addBot("beh_crag", "Crag (Turtle Guard)", 1100, "behavior", "Solid", {
    start: ["Good luck breaking my stone fortress!"],
    take: ["Snapping off the invaders."],
    losePiece: ["A chip off the rock, nothing more."],
    check: ["Check from behind the ramparts!"],
    win: ["The fortress held strong!"],
    lose: ["You cracked the shell. Impressive!"]
}, function(moves) {
    let def = moves.filter(function(m) {
        if (m.color === 'w') {
            return m.to[1] <= '4';
        } else {
            return m.to[1] >= '5';
        }
    });
    return (def.length > 0 && Math.random() < 0.75) ? def[Math.floor(Math.random() * def.length)] : null;
});

addBot("beh_ballista", "Ballista (Long-Range Sniper)", 1400, "behavior", "Positional", {
    start: ["Long-range optics locked in. Mind your files and diagonals."],
    take: ["Target destroyed from afar."],
    losePiece: ["My sniper post was compromised!"],
    check: ["Check from edge to edge!"],
    win: ["Direct artillery hit!"],
    lose: ["Close-quarters combat was my downfall."]
}, function(moves) {
    let snipes = moves.filter(function(m) {
        let isLongPiece = (m.piece === 'b' || m.piece === 'r');
        let dist = Math.abs(m.to.charCodeAt(0) - m.from.charCodeAt(0));
        return isLongPiece && dist >= 2;
    });
    return (snipes.length > 0 && Math.random() < 0.80) ? snipes[Math.floor(Math.random() * snipes.length)] : null;
});

addBot("beh_retreat", "Bramble (Cautious Dodger)", 950, "behavior", "Quirky", {
    start: ["I don't like danger. I'll retreat whenever things look scary!"],
    take: ["Only taking if it's completely safe!"],
    losePiece: ["Aaaah! I knew I should have retreated further!"],
    check: ["Check from a safe distance!"],
    win: ["Caution wins the race!"],
    lose: ["Backed into a corner!"]
}, function(moves) {
    let retreats = moves.filter(function(m) {
        if (m.color === 'w') {
            return m.to[1] < m.from[1];
        } else {
            return m.to[1] > m.from[1];
        }
    });
    return (retreats.length > 0 && Math.random() < 0.65) ? retreats[Math.floor(Math.random() * retreats.length)] : null;
});

addBot("beh_wing", "Aethelgard (Fianchetto Master)", 1650, "behavior", "Positional", {
    start: ["Flank fianchettoes are the highest form of strategic chess."],
    take: ["The fianchetto bishop strikes!"],
    losePiece: ["My wing was overextended."],
    check: ["Check through the fianchetto diagonal!"],
    win: ["Flank mastery victorious."],
    lose: ["A masterclass through the center from you."]
}, function(moves) {
    let targets = ['g3', 'b3', 'g6', 'b6', 'bg2', 'bb2', 'bg7', 'bb7'];
    let fian = moves.filter(function(m) {
        let sanLower = m.san.toLowerCase();
        return targets.some(function(s) { return sanLower.indexOf(s) !== -1; });
    });
    return (fian.length > 0 && Math.random() < 0.70) ? fian[Math.floor(Math.random() * fian.length)] : null;
});

addBot("beh_tempest", "Tempest (Gambit Striker)", 1750, "behavior", "Tactical", {
    start: ["Take my pawns if you dare; your king will pay the price."],
    take: ["A tactical strike straight to the heart!"],
    losePiece: ["All part of the dynamic initiative."],
    check: ["Check! The storm arrives!"],
    win: ["Swept away by the hurricane!"],
    lose: ["You weathered the tempest cleanly. Respect."]
}, function(moves) {
    let gambitMoves = moves.filter(function(m) { return m.captured || m.san.indexOf('+') !== -1 || m.piece === 'n'; });
    return (gambitMoves.length > 0 && Math.random() < 0.70) ? gambitMoves[Math.floor(Math.random() * gambitMoves.length)] : null;
});

const PLACEMENT_BENCHMARKS = [600, 900, 1200, 1500, 1800];

// Bot Dialogue Dispatcher
function triggerBotChat(eventKey) {
    if (!currentBot || !currentBot.dialogues || !currentBot.dialogues[eventKey]) {
        return;
    }
    let lines = currentBot.dialogues[eventKey];
    let pick = lines[Math.floor(Math.random() * lines.length)];
    botChat("<strong>" + currentBot.name + ":</strong> \"" + pick + "\"");
}

// =================================================================
// 3. ADAPTIVE SITUATIONAL DNA ENGINE & EXACT POSITION MEMORY
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

// Official Elo Update Algorithm (Winning always increases Profile Elo)
function updatePlayerRatingOnMatch(oppElo, outcome) {
    let currentRating = playerDNA.calculatedElo || 1200;
    let expected = 1 / (1 + Math.pow(10, (oppElo - currentRating) / 400));
    let kFactor = playerDNA.gamesPlayed < 10 ? 32 : 20;
    let newRating = Math.round(currentRating + kFactor * (outcome - expected));
    playerDNA.calculatedElo = Math.max(100, Math.min(2900, newRating));
}

function analyzeGameForDeepDNA(history, playerColor, gameOutcome) {
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
            if (cpLoss < 60) aheadAccurate++;
        }
        if (posEval <= -250) {
            underPressureMoves++;
            if (cpLoss < 60) underPressureAccurate++;
        }
        if (m.wasInCheck) {
            checkResponses++;
            if (cpLoss < 80) checkAccurate++;
        }
        if (m.pieceCount <= 10) {
            endgameMoves++;
            if (cpLoss < 50) endgameAccurate++;
        }
    });

    let matchACPL = totalCpLoss / userMoves.length;
    playerDNA.gamesPlayed++;
    
    playerDNA.acpl = Math.round((playerDNA.acpl * 0.70) + (matchACPL * 0.30));

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

    let oppRating = currentBot ? currentBot.elo : 1200;
    updatePlayerRatingOnMatch(oppRating, gameOutcome);

    saveGuestAndDNA();
}

function isMoveTacticallySafe(san) {
    try {
        let tempGame = new Chess(game.fen());
        let executed = tempGame.move(san, { sloppy: true });
        if (!executed) {
            return false;
        }
        let oppMoves = tempGame.moves({ verbose: true });
        let isHanging = oppMoves.some(function(om) {
            return om.to === executed.to && om.captured && PIECE_VALUES[om.captured] >= PIECE_VALUES[executed.piece];
        });
        return !isHanging;
    } catch (e) {
        return true;
    }
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
        if (bestSan && isMoveTacticallySafe(bestSan)) {
            return bestSan;
        }
    }

    if (target.tactics > 60) {
        let safeMoves = moves.filter(function(m) {
            return isMoveTacticallySafe(m.san);
        });
        if (safeMoves.length > 0) {
            moves = safeMoves;
        }
    }

    if (Math.random() * 100 < target.aggression) {
        let aggressive = moves.filter(function(m) {
            return (m.captured || m.san.indexOf('+') !== -1) && isMoveTacticallySafe(m.san);
        });
        if (aggressive.length > 0) {
            return aggressive[Math.floor(Math.random() * aggressive.length)].san;
        }
    }

    return null;
}

// =================================================================
// 4. CAPS2 CALIBRATION & TRUE FIDE PERFORMANCE ALGORITHM
// =================================================================
function cpToWinProb(cp) {
    return 1 / (1 + Math.pow(10, -cp / 400));
}

function calculateCAPS2MoveAccuracy(winDiff) {
    let diffPct = Math.max(0, winDiff * 100);
    let accuracy = 103.1668 * Math.exp(-0.04354 * diffPct) - 3.1669;
    return Math.max(0, Math.min(100, accuracy));
}

// Complete Chess.com Move Classification Specification Rule Set
function classifyMoveRuleSet(isBook, isSacrifice, isOnlyWinningMove, isMissedWin, winProbDrop, isEngineTop1) {
    if (isBook) {
        return { tag: "Book Move", sym: "📖", key: "book", color: "#a88b68" };
    }
    if (isSacrifice && winProbDrop < 0.02) {
        return { tag: "Brilliant", sym: "!!", key: "brilliant", color: "#1ba599" };
    }
    if (isOnlyWinningMove && winProbDrop < 0.02) {
        return { tag: "Great Move", sym: "!", key: "great", color: "#5c8bb0" };
    }
    if (isMissedWin) {
        return { tag: "Miss", sym: "✖", key: "miss", color: "#ea5b5b" };
    }
    if (winProbDrop < 0.02) {
        if (isEngineTop1) {
            return { tag: "Best Move", sym: "★", key: "best", color: "#95b645" };
        } else {
            return { tag: "Excellent Move", sym: "✓", key: "excellent", color: "#96bc4b" };
        }
    }
    if (winProbDrop >= 0.02 && winProbDrop < 0.05) {
        return { tag: "Good Move", sym: "👍", key: "good", color: "#8bb158" };
    }
    if (winProbDrop >= 0.05 && winProbDrop < 0.10) {
        return { tag: "Inaccuracy", sym: "?!", key: "inaccuracy", color: "#f0c15c" };
    }
    if (winProbDrop >= 0.10 && winProbDrop < 0.20) {
        return { tag: "Mistake", sym: "?", key: "mistake", color: "#e69d41" };
    }
    return { tag: "Blunder", sym: "??", key: "blunder", color: "#fa412d" };
}

function calculateRealPerformance(acc, oppElo, outcome) {
    let basePerf = 0;
    if (acc >= 98) {
        basePerf = 2700 + (acc - 98) * 100;
    } else if (acc >= 90) {
        basePerf = 2000 + (acc - 90) * 87.5;
    } else if (acc >= 75) {
        basePerf = 1300 + (acc - 75) * 46.6;
    } else if (acc >= 50) {
        basePerf = 600 + (acc - 50) * 28;
    } else if (acc >= 25) {
        basePerf = 200 + (acc - 25) * 16;
    } else {
        basePerf = Math.max(50, acc * 4);
    }

    if (outcome === 1) {
        basePerf = Math.max(oppElo + 50, basePerf);
    } else if (outcome === 0) {
        basePerf = Math.min(Math.max(50, oppElo - 50), basePerf);
    }

    return Math.max(50, Math.min(3200, Math.round(basePerf)));
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
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png'
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

    // Remove Timer Button
    let removeTimerBtn = document.getElementById('remove-timer-btn');
    if (removeTimerBtn) {
        removeTimerBtn.addEventListener('click', function() {
            if (!gameActive) {
                return;
            }
            clearInterval(timerInterval);
            document.getElementById('timer-w').innerText = "--:--";
            document.getElementById('timer-b').innerText = "--:--";
            document.getElementById('time-control').value = "0";
            botChat("Timer disabled for this match.");
        });
    }

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

    isAdmin = (user.email === "landon.z.low@gmail.com");
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

    if (db) {
        db.ref('users/' + user.uid).update({
            email: user.email,
            lastOnline: firebase.database.ServerValue.TIMESTAMP
        });
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

    let elo = currentBot ? currentBot.elo : (playerDNA.calculatedElo || 1200);

    if (currentBot && typeof currentBot.handler === 'function') {
        let custom = currentBot.handler(moves);
        if (custom) {
            let customSan = custom.san || custom;
            if (elo < 1400 || isMoveTacticallySafe(customSan)) {
                return executeBotMove(customSan);
            }
        }
    }

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

    let controlIds = ['resign-btn', 'draw-btn', 'undo-btn', 'remove-timer-btn'];
    controlIds.forEach(function(id) {
        let btn = document.getElementById(id);
        if (btn) {
            btn.disabled = false;
        }
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
        triggerBotChat('start');
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
    if (!gameActive || game.game_over() || botThinking) return false;
    let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
    if (!isMyTurn) return false;

    // Show the legal move dots as soon as dragging begins
    highlightLegalMoves(source);
    return game.moves({ square: source }).length > 0;
}

function onDrop(source, target) {
    // If piece was released on the same square (a stationary click), KEEP the dots visible!
    if (source === target) {
        return;
    }

    let move = game.move({ from: source, to: target, promotion: 'q' });
    if (move === null) {
        // If dropped on an illegal destination, retain the selection dots
        return 'snapback';
    }

    // A legal move was executed: clear dots and process move
    clearHighlights();
    selectedSquare = null;
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
        triggerBotChat('check');
    } else if (move.captured) {
        playSound('capture');
        if (move.color !== myPlayerColor) {
            triggerBotChat('take');
        } else {
            triggerBotChat('losePiece');
        }
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

// =================================================================
// CLICK-TO-MOVE, SELECTION & BOARD HIGHLIGHTING ENGINE
// =================================================================

function clearHighlights() {
    $('#myBoard .square-55d63').removeClass('legal-move legal-capture selected-square');
}

function highlightCheck() {
    $('#myBoard .square-55d63').removeClass('in-check');
    if (game && typeof game.in_check === 'function' && game.in_check()) {
        let boardMatrix = game.board();
        let turn = game.turn();
        let files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

        for (let r = 0; r < 8; r++) {
            for (let c = 0; c < 8; c++) {
                let piece = boardMatrix[r][c];
                if (piece && piece.type === 'k' && piece.color === turn) {
                    let square = files[c] + (8 - r);
                    $('#myBoard .square-' + square).addClass('in-check');
                    return;
                }
            }
        }
    }
}

function highlightLegalMoves(square) {
    clearHighlights();
    selectedSquare = square;

    $('#myBoard .square-' + square).addClass('selected-square');

    let moves = game.moves({ square: square, verbose: true });
    moves.forEach(function(m) {
        let $target = $('#myBoard .square-' + m.to);
        if (m.captured) {
            $target.addClass('legal-capture');
        } else {
            $target.addClass('legal-move');
        }
    });
}

function setupClickToMove() {
    $(document).off('click', '#myBoard .square-55d63');

    $(document).on('click', '#myBoard .square-55d63', function(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!gameActive || botThinking) return;

        let square = $(this).attr('data-square');
        if (!square) return;

        let isMyTurn = (game.turn() === myPlayerColor) || currentMode === 'pvp';
        if (!isMyTurn) return;

        let pieceOnSquare = game.get(square);

        // 1. Destination clicked while a piece is currently selected
        if (selectedSquare) {
            if (selectedSquare === square) {
                clearHighlights();
                selectedSquare = null;
                return;
            }

            // If switching to another piece of own color
            if (pieceOnSquare && pieceOnSquare.color === game.turn()) {
                highlightLegalMoves(square);
                return;
            }

            // Attempt move execution
            let move = game.move({
                from: selectedSquare,
                to: square,
                promotion: 'q'
            });

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
                return;
            }
        }

        // 2. Initial selection of own piece
        if (pieceOnSquare && (pieceOnSquare.color === game.turn() || currentMode === 'pvp')) {
            highlightLegalMoves(square);
        } else {
            clearHighlights();
            selectedSquare = null;
        }
    });
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
    if (parseInt(document.getElementById('time-control').value) === 0) {
        return;
    }
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
    let result = 'draw';
    let msg = "Game drawn.";
    if (game.in_checkmate()) {
        result = (game.turn() === myPlayerColor) ? 'loss' : 'win';
        msg = (result === 'win') ? "Checkmate! Victory!" : "Checkmate! Defeat.";
    }
    endGame(result, msg);
}

function endGame(result, msg) {
    gameActive = false;
    botThinking = false;
    clearInterval(timerInterval);
    let controlIds = ['resign-btn', 'draw-btn', 'undo-btn', 'remove-timer-btn'];
    controlIds.forEach(function(id) {
        let btn = document.getElementById(id);
        if (btn) {
            btn.disabled = true;
        }
    });
    updateStatus(msg);
    botChat(msg);

    if (result === 'win') {
        triggerBotChat('lose');
    } else if (result === 'loss') {
        triggerBotChat('win');
    }

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
    document.getElementById('grave-w').style.display = 'flex';
    document.getElementById('grave-b').innerHTML = deadW;
    document.getElementById('grave-b').style.display = 'flex';
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
        book: 0,
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
        let diffCp = (item.color === 'w') ? (evalForMove - prevEval) : (prevEval - evalForMove);

        let winBefore = cpToWinProb(item.color === 'w' ? prevEval : -prevEval);
        let winAfter = cpToWinProb(item.color === 'w' ? evalForMove : -evalForMove);
        let winProbDrop = Math.max(0, winBefore - winAfter);

        let isBook = (i <= 6 && (item.move === 'e4' || item.move === 'd4' || item.move === 'Qh5' || item.move === 'Bc4' || item.move === 'Nf3' || item.move === 'c4' || item.move === 'e5' || item.move === 'c5'));
        let isSacrifice = (item.move.indexOf('x') !== -1 && item.piece && item.piece !== 'p' && diffCp >= 0);
        let isOnlyWinningMove = (winProbDrop < 0.02 && Math.abs(diffCp) < 15 && prevEval < 150 && evalForMove > 300);
        let isMissedWin = (prevEval > 300 && evalForMove < 50);
        let isEngineTop1 = (diffCp >= -10);

        let cls = classifyMoveRuleSet(isBook, isSacrifice, isOnlyWinningMove, isMissedWin, winProbDrop, isEngineTop1);

        let moveAccuracy = isBook ? 100 : calculateCAPS2MoveAccuracy(winProbDrop);
        accuracyTotals[item.color].push(moveAccuracy);
        item.cpLoss = isBook ? 0 : Math.max(0, -diffCp);
        item.evalBefore = prevEval;

        if (item.color === myPlayerColor && counts[cls.key] !== undefined) {
            counts[cls.key]++;
        }
        
        let prefix = item.color === 'w' ? '' : '...';
        bEl.innerHTML += '<div class="move-breakdown-row"><span><strong>' + Math.ceil(i / 2) + '. ' + prefix + item.move + '</strong></span><span style="color:' + cls.color + '; font-weight:bold;">' + cls.sym + ' ' + cls.tag + '</span></div>';
        prevEval = evalForMove;
    }

    let accW = accuracyTotals.w.length > 0 ? Math.round(accuracyTotals.w.reduce(function(a, b) { return a + b; }, 0) / accuracyTotals.w.length) : 85;
    let accB = accuracyTotals.b.length > 0 ? Math.round(accuracyTotals.b.reduce(function(a, b) { return a + b; }, 0) / accuracyTotals.b.length) : 50;

    let knownPlayerElo = playerDNA.calculatedElo || 1200;
    let knownBotElo = currentBot ? currentBot.elo : 1200;

    let eloWhite = (myPlayerColor === 'w') ? knownPlayerElo : knownBotElo;
    let eloBlack = (myPlayerColor === 'w') ? knownBotElo : knownPlayerElo;

    let outcomeW = (myPlayerColor === 'w') ? (gameResult === 'win' ? 1 : gameResult === 'loss' ? 0 : 0.5) : (gameResult === 'win' ? 0 : gameResult === 'loss' ? 1 : 0.5);
    let outcomeB = 1 - outcomeW;

    let perfW = calculateRealPerformance(accW, eloBlack, outcomeW);
    let perfB = calculateRealPerformance(accB, eloWhite, outcomeB);

    document.getElementById('accuracy-score-w').innerText = accW + "%";
    document.getElementById('accuracy-score-b').innerText = accB + "%";
    document.getElementById('caps-w').innerText = "Perf. Rating: " + perfW;
    document.getElementById('caps-b').innerText = "Perf. Rating: " + perfB;

    for (let k in counts) {
        let statEl = document.getElementById("stat-" + k);
        if (statEl) {
            statEl.innerText = counts[k];
        }
    }
    
    document.getElementById('analysis-status').innerText = "CAPS2 Review Complete";
    
    let gameNumericOutcome = (gameResult === 'win') ? 1 : (gameResult === 'loss') ? 0 : 0.5;
    analyzeGameForDeepDNA(gameHistory, myPlayerColor, gameNumericOutcome);

    if (firestore && currentUser) {
        firestore.collection('users').doc(currentUser.uid).collection('game_history').add({
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            accuracy: { white: accW, black: accB },
            performance: { white: perfW, black: perfB },
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
