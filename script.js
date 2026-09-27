// --- VARIABEL GLOBAL ---
let game = new Chess(); // Instance utama dari chess.js
let boardElement = document.getElementById('chessboard');
let selectedSquare = null;
let gameMode = 'local'; 
let aiDifficulty = 2;
let isAiTurn = false;

// Mapping simbol Unicode untuk bidak catur
const pieces = {
    'p': '♟', 'r': '♜', 'n': '♞', 'b': '♝', 'q': '♛', 'k': '♚',
    'P': '♙', 'R': '♖', 'N': '♘', 'B': '♗', 'Q': '♕', 'K': '♔'
};

// --- FUNGSI NAVIGASI ---
function startGame(mode) {
    gameMode = mode;
    if (mode === 'ai') {
        aiDifficulty = parseInt(document.getElementById('difficulty').value);
    }
    
    const lobby = document.getElementById('lobby-screen');
    lobby.style.opacity = '0';
    lobby.style.transform = 'scale(1.1)';
    
    setTimeout(() => {
        lobby.style.display = 'none';
        document.getElementById('game-screen').style.display = 'flex';
        resetGame();
    }, 600);
}

function backToLobby() {
    document.getElementById('game-screen').style.display = 'none';
    const lobby = document.getElementById('lobby-screen');
    lobby.style.display = 'flex';
    lobby.style.opacity = '1';
    lobby.style.transform = 'scale(1)';
    game = new Chess();
    selectedSquare = null;
}

// --- FUNGSI UTAMA PERMAINAN ---
function resetGame() {
    game = new Chess();
    selectedSquare = null;
    isAiTurn = false;
    renderBoard();
    updateStatus();
}

function renderBoard() {
    boardElement.innerHTML = '';
    let board = game.board(); // Mengambil array 2D dari chess.js

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            let square = document.createElement('div');
            let isLight = (row + col) % 2 === 0;
            square.className = `square ${isLight ? 'light' : 'dark'}`;
            
            // Konversi indeks ke koordinat catur (a1, b1, dst)
            let file = String.fromCharCode(97 + col); 
            let rank = 8 - row; 
            let squareId = file + rank;
            
            square.dataset.square = squareId;
            
            // Render Bidak
            let piece = board[row][col];
            if (piece) {
                let pieceSpan = document.createElement('span');
                pieceSpan.className = `piece ${piece.color === 'w' ? 'white-piece' : 'black-piece'}`;
                let pieceType = piece.color === 'w' ? piece.type.toUpperCase() : piece.type;
                pieceSpan.innerText = pieces[pieceType];
                square.appendChild(pieceSpan);
            }

            // Event Klik
            square.addEventListener('click', () => handleSquareClick(squareId));
            
            // Highlight jika kotak sedang dipilih
            if (selectedSquare === squareId) {
                square.classList.add('selected');
            }

            boardElement.appendChild(square);
        }
    }
    highlightValidMoves();
}

function handleSquareClick(squareId) {
    // Cegah klik jika game sudah selesai atau sedang giliran AI
    if (game.game_over() || isAiTurn) return;

    // Jika belum ada bidak yang dipilih
    if (!selectedSquare) {
        let piece = game.get(squareId);
        if (piece && piece.color === game.turn()) {
            selectedSquare = squareId;
            renderBoard();
        }
    } else {
        // Jika sudah ada bidak yang dipilih, coba lakukan langkah
        let move = game.move({
            from: selectedSquare,
            to: squareId,
            promotion: 'q' // Promosi otomatis ke Queen
        });

        if (move) {
            // Langkah berhasil
            selectedSquare = null;
            renderBoard();
            updateStatus();
            
            // Jika melawan AI, picu langkah AI
            if (gameMode === 'ai' && !game.game_over()) {
                isAiTurn = true;
                setTimeout(makeAiMove, 500); 
            }
        } else {
            // Langkah tidak valid, cek apakah user mengklik bidak lain miliknya
            let piece = game.get(squareId);
            if (piece && piece.color === game.turn()) {
                selectedSquare = squareId;
                renderBoard();
            } else {
                selectedSquare = null;
                renderBoard();
            }
        }
    }
}

function highlightValidMoves() {
    if (!selectedSquare) return;
    let moves = game.moves({ square: selectedSquare, verbose: true });
    
    moves.forEach(move => {
        let squareEl = document.querySelector(`[data-square="${move.to}"]`);
        if (squareEl) {
            if (move.captured) {
                squareEl.classList.add('capture-move');
            } else {
                squareEl.classList.add('valid-move');
            }
        }
    });
}

function updateStatus() {
    let header = document.getElementById('game-header-text');
    let msg = document.getElementById('status-msg');
    
    if (game.game_over()) {
        if (game.in_checkmate()) {
            header.innerText = "SKAKMAT!";
            msg.innerText = `Pemenang: ${game.turn() === 'w' ? 'Hitam' : 'Putih'}`;
        } else if (game.in_draw()) {
            header.innerText = "SERI (DRAW)";
            msg.innerText = "Permainan Berakhir Seri";
        }
    } else {
        let turnText = game.turn() === 'w' ? 'Putih' : 'Hitam';
        header.innerText = `Giliran: ${turnText}`;
        if (game.in_check()) {
            msg.innerText = `${turnText} sedang di-SKAK!`;
        } else {
            msg.innerText = "Pilih bidak untuk melangkah";
        }
    }
}

// --- LOGIKA KECERDASAN BUATAN (AI) ---
function makeAiMove() {
    if (game.game_over()) return;
    
    let possibleMoves = game.moves();
    if (possibleMoves.length === 0) return;

    let bestMove = null;

    if (aiDifficulty === 1) {
        // Level Mudah: Langkah Acak
        bestMove = possibleMoves[Math.floor(Math.random() * possibleMoves.length)];
    } else {
        // Level Sedang & Sulit: Algoritma Minimax
        let depth = aiDifficulty === 2 ? 2 : 3;
        bestMove = minimaxRoot(depth, game, true);
    }

    if (bestMove) {
        game.move(bestMove);
        renderBoard();
        updateStatus();
    }
    isAiTurn = false;
}

// Pencarian langkah terbaik untuk AI
function minimaxRoot(depth, game, isMaximizingPlayer) {
    let bestMove = -9999;
    let bestMoveFound = null;
    let possibleMoves = game.moves();

    for(let i = 0; i < possibleMoves.length; i++) {
        let move = possibleMoves[i];
        game.move(move);
        let value = minimax(depth - 1, game, -10000, 10000, !isMaximizingPlayer);
        game.undo();
        if(value >= bestMove) {
            bestMove = value;
            bestMoveFound = move;
        }
    }
    return bestMoveFound;
}

// Algoritma Minimax dengan Alpha-Beta Pruning
function minimax(depth, game, alpha, beta, isMaximizingPlayer) {
    if (depth === 0) {
        return -evaluateBoard(game.board());
    }

    let possibleMoves = game.moves();

    if (isMaximizingPlayer) {
        let bestMove = -9999;
        for (let i = 0; i < possibleMoves.length; i++) {
            game.move(possibleMoves[i]);
            bestMove = Math.max(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximizingPlayer));
            game.undo();
            alpha = Math.max(alpha, bestMove);
            if (beta <= alpha) return bestMove;
        }
        return bestMove;
    } else {
        let bestMove = 9999;
        for (let i = 0; i < possibleMoves.length; i++) {
            game.move(possibleMoves[i]);
            bestMove = Math.min(bestMove, minimax(depth - 1, game, alpha, beta, !isMaximizingPlayer));
            game.undo();
            beta = Math.min(beta, bestMove);
            if (beta <= alpha) return bestMove;
        }
        return bestMove;
    }
}

// Evaluasi nilai papan untuk AI
function evaluateBoard(board) {
    let totalEvaluation = 0;
    for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 8; j++) {
            totalEvaluation += getPieceValue(board[i][j]);
        }
    }
    return totalEvaluation;
}

function getPieceValue(piece) {
    if (piece === null) return 0;
    
    // Nilai dasar bidak catur
    let absoluteValue = 0;
    if (piece.type === 'p') absoluteValue = 10;
    else if (piece.type === 'r') absoluteValue = 50;
    else if (piece.type === 'n') absoluteValue = 30;
    else if (piece.type === 'b') absoluteValue = 30;
    else if (piece.type === 'q') absoluteValue = 90;
    else if (piece.type === 'k') absoluteValue = 900;

    // Putih positif, Hitam negatif
    return piece.color === 'w' ? absoluteValue : -absoluteValue;
}