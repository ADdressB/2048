class Game2048 {
    constructor() {
        this.size = 4;
        this.grid = [];
        this.score = 0;
        this.bestScore = parseInt(localStorage.getItem('bestScore2048')) || 0;
        this.moves = 0;
        this.maxTile = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.history = [];
        this.maxHistoryLength = 20;
        this.currentTheme = localStorage.getItem('theme2048') || 'warm';
        this.soundEnabled = localStorage.getItem('soundEnabled2048') !== 'false';
        this.musicEnabled = localStorage.getItem('musicEnabled2048') === 'true';
        this.colorblindMode = localStorage.getItem('colorblindMode2048') === 'true';
        this.highContrastMode = localStorage.getItem('highContrastMode2048') === 'true';
        this.shakeEffectEnabled = localStorage.getItem('shakeEffectEnabled2048') !== 'false';
        this.fontSize = localStorage.getItem('fontSize2048') || 'medium';
        this.combo = 0;
        this.maxCombo = 0;
        this.timer = 0;
        this.timerInterval = null;
        this.isPaused = false;
        this.gameStartTime = null;
        this.particles = [];
        this.achievements = this.initAchievements();
        this.unlockedAchievements = JSON.parse(localStorage.getItem('achievements2048')) || [];
        this.gameHistory = JSON.parse(localStorage.getItem('gameHistory2048')) || [];
        this.leaderboard = JSON.parse(localStorage.getItem('leaderboard2048')) || [];
        this.musicOscillator = null;
        this.musicGain = null;
        this.musicPlaying = false;
        this.musicTimeout = null;
        this.gameResultSaved = false;
        this.stats = JSON.parse(localStorage.getItem('stats2048')) || {
            gamesPlayed: 0,
            totalMoves: 0,
            totalTime: 0,
            totalScore: 0,
            maxTileEver: 0,
            gamesWon: 0
        };
        this.tutorialStep = 1;
        this.tutorialShown = localStorage.getItem('tutorialShown2048') === 'true';
        this.confirmCallback = null;
        this.audioContext = null;
        this.backgroundMusic = null;
        
        this.gridContainer = document.getElementById('grid-container');
        this.scoreElement = document.getElementById('score');
        this.bestScoreElement = document.getElementById('best-score');
        this.movesElement = document.getElementById('moves');
        this.maxTileElement = document.getElementById('max-tile');
        this.comboElement = document.getElementById('combo');
        this.comboDisplay = document.getElementById('combo-display');
        this.timerElement = document.getElementById('timer');
        this.gameMessage = document.getElementById('game-message');
        this.pauseOverlay = document.getElementById('pause-overlay');
        this.newGameBtn = document.getElementById('new-game-btn');
        this.undoBtn = document.getElementById('undo-btn');
        this.pauseBtn = document.getElementById('pause-btn');
        this.gameContainer = document.getElementById('game-container');
        this.particlesCanvas = document.getElementById('particles-canvas');
        this.particlesCtx = this.particlesCanvas.getContext('2d');
        
        this.init();
    }

    initAchievements() {
        return [
            { id: 'first_merge', name: '初次合并', desc: '完成第一次合并', icon: '🎯' },
            { id: 'reach_512', name: '小有成就', desc: '达到512', icon: '⭐' },
            { id: 'reach_1024', name: '接近胜利', desc: '达到1024', icon: '🌟' },
            { id: 'reach_2048', name: '游戏大师', desc: '达到2048', icon: '👑' },
            { id: 'combo_3', name: '连击新手', desc: '达成3连击', icon: '🔥' },
            { id: 'combo_5', name: '连击达人', desc: '达成5连击', icon: '💥' },
            { id: 'combo_10', name: '连击大师', desc: '达成10连击', icon: '⚡' },
            { id: 'speed_demon', name: '速度恶魔', desc: '30秒内达到512', icon: '🏃' },
            { id: 'perfect_game', name: '完美游戏', desc: '不使用撤销完成游戏', icon: '💎' },
            { id: 'persistent', name: '坚持不懈', desc: '游戏10次', icon: '🎮' },
            { id: 'veteran', name: '老玩家', desc: '游戏50次', icon: '🏅' },
            { id: 'score_10k', name: '万分达人', desc: '单局得分超过10000', icon: '💰' }
        ];
    }

    init() {
        this.setupCanvas();
        this.createGrid();
        this.setupEventListeners();
        this.loadSettings();
        this.updateAchievementsDisplay();
        this.updateLeaderboard();
        this.updateStatsDisplay();
        this.updateHistoryDisplay();
        this.startParticles();
        
        if (!this.tutorialShown) {
            this.showTutorial();
        } else {
            this.newGame();
        }
    }

    setupCanvas() {
        this.particlesCanvas.width = window.innerWidth;
        this.particlesCanvas.height = window.innerHeight;
        
        window.addEventListener('resize', () => {
            this.particlesCanvas.width = window.innerWidth;
            this.particlesCanvas.height = window.innerHeight;
        });
    }

    startParticles() {
        this.animateParticles();
    }

    animateParticles() {
        this.particlesCtx.clearRect(0, 0, this.particlesCanvas.width, this.particlesCanvas.height);
        
        if (Math.random() < 0.1) {
            this.particles.push({
                x: Math.random() * this.particlesCanvas.width,
                y: this.particlesCanvas.height + 10,
                size: Math.random() * 3 + 1,
                speedY: Math.random() * 1 + 0.5,
                speedX: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
        
        this.particles.forEach((p, index) => {
            p.y -= p.speedY;
            p.x += p.speedX;
            p.opacity -= 0.002;
            
            if (p.y < -10 || p.opacity <= 0) {
                this.particles.splice(index, 1);
            } else {
                this.particlesCtx.beginPath();
                this.particlesCtx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                this.particlesCtx.fillStyle = `rgba(255, 255, 255, ${p.opacity})`;
                this.particlesCtx.fill();
            }
        });
        
        requestAnimationFrame(() => this.animateParticles());
    }

    createExplosion(x, y, color) {
        for (let i = 0; i < 20; i++) {
            this.particles.push({
                x: x,
                y: y,
                size: Math.random() * 5 + 2,
                speedX: (Math.random() - 0.5) * 8,
                speedY: (Math.random() - 0.5) * 8,
                opacity: 1,
                color: color
            });
        }
    }

    createGrid() {
        this.gridContainer.innerHTML = '';
        this.gridContainer.className = `grid-container size-${this.size}`;
        
        for (let i = 0; i < this.size * this.size; i++) {
            const cell = document.createElement('div');
            cell.className = 'grid-cell';
            this.gridContainer.appendChild(cell);
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeyPress(e));
        
        this.newGameBtn.addEventListener('click', () => this.showConfirm('确定要开始新游戏吗？', () => this.newGame()));
        this.undoBtn.addEventListener('click', () => this.undo());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        const retryBtn = this.gameMessage.querySelector('.btn-retry');
        retryBtn.addEventListener('click', () => this.newGame());
        
        const shareBtn = this.gameMessage.querySelector('.btn-share');
        shareBtn.addEventListener('click', () => this.showShareModal());
        
        const resumeBtn = this.pauseOverlay.querySelector('.btn-resume');
        resumeBtn.addEventListener('click', () => this.togglePause());
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const theme = e.target.dataset.theme;
                this.setTheme(theme);
            });
        });
        
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = parseInt(e.target.dataset.size);
                this.changeBoardSize(size);
            });
        });
        
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) {
            soundToggle.addEventListener('change', (e) => {
                this.soundEnabled = e.target.checked;
                localStorage.setItem('soundEnabled2048', this.soundEnabled);
            });
        }
        
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) {
            musicToggle.addEventListener('change', (e) => {
                this.musicEnabled = e.target.checked;
                localStorage.setItem('musicEnabled2048', this.musicEnabled);
                if (this.musicEnabled) {
                    this.startBackgroundMusic();
                } else {
                    this.stopBackgroundMusic();
                }
            });
            
            musicToggle.addEventListener('click', () => {
                if (!this.audioContext) {
                    this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
                }
                if (this.audioContext.state === 'suspended') {
                    this.audioContext.resume();
                }
            });
        }
        
        const colorblindToggle = document.getElementById('colorblind-mode');
        if (colorblindToggle) {
            colorblindToggle.addEventListener('change', (e) => {
                this.colorblindMode = e.target.checked;
                localStorage.setItem('colorblindMode2048', this.colorblindMode);
                document.body.classList.toggle('colorblind-mode', this.colorblindMode);
            });
        }
        
        const highContrastToggle = document.getElementById('high-contrast-mode');
        if (highContrastToggle) {
            highContrastToggle.addEventListener('change', (e) => {
                this.highContrastMode = e.target.checked;
                localStorage.setItem('highContrastMode2048', this.highContrastMode);
                document.body.classList.toggle('high-contrast', this.highContrastMode);
            });
        }
        
        const shakeEffectToggle = document.getElementById('shake-effect');
        if (shakeEffectToggle) {
            shakeEffectToggle.addEventListener('change', (e) => {
                this.shakeEffectEnabled = e.target.checked;
                localStorage.setItem('shakeEffectEnabled2048', this.shakeEffectEnabled);
            });
        }
        
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const size = e.target.dataset.size;
                this.setFontSize(size);
            });
        });
        
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                this.switchTab(tab);
            });
        });
        
        const skipTutorial = document.getElementById('skip-tutorial');
        const nextTutorial = document.getElementById('next-tutorial');
        const startGame = document.getElementById('start-game');
        
        if (skipTutorial) {
            skipTutorial.addEventListener('click', () => this.closeTutorial());
        }
        
        if (nextTutorial) {
            nextTutorial.addEventListener('click', () => this.nextTutorialStep());
        }
        
        if (startGame) {
            startGame.addEventListener('click', () => this.closeTutorial());
        }
        
        const confirmCancel = document.getElementById('confirm-cancel');
        const confirmOk = document.getElementById('confirm-ok');
        
        if (confirmCancel) {
            confirmCancel.addEventListener('click', () => this.hideConfirm());
        }
        
        if (confirmOk) {
            confirmOk.addEventListener('click', () => {
                if (this.confirmCallback) {
                    this.confirmCallback();
                }
                this.hideConfirm();
            });
        }
        
        const closeShare = document.querySelector('.btn-close-share');
        const downloadImage = document.getElementById('download-image');
        const copyLink = document.getElementById('copy-link');
        
        if (closeShare) {
            closeShare.addEventListener('click', () => this.hideShareModal());
        }
        
        if (downloadImage) {
            downloadImage.addEventListener('click', () => this.downloadShareImage());
        }
        
        if (copyLink) {
            copyLink.addEventListener('click', () => this.copyShareLink());
        }
        
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        
        this.gridContainer.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }, { passive: true });
        
        this.gridContainer.addEventListener('touchmove', (e) => {
            e.preventDefault();
        }, { passive: false });
        
        this.gridContainer.addEventListener('touchend', (e) => {
            touchEndX = e.changedTouches[0].clientX;
            touchEndY = e.changedTouches[0].clientY;
            this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
        }, { passive: true });
        
        let lastTap = 0;
        this.gridContainer.addEventListener('touchend', (e) => {
            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTap;
            if (tapLength < 500 && tapLength > 0) {
                this.togglePause();
            }
            lastTap = currentTime;
        });
    }

    handleKeyPress(e) {
        if (this.isPaused && e.key !== 'Escape' && e.key !== 'p' && e.key !== 'P') return;
        
        if (e.key === 'Escape' || e.key === 'p' || e.key === 'P') {
            this.togglePause();
            return;
        }
        
        if (this.gameOver && !this.gameWon) return;
        
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'w': 'up',
            'W': 'up',
            's': 'down',
            'S': 'down',
            'a': 'left',
            'A': 'left',
            'd': 'right',
            'D': 'right'
        };
        
        if (keyMap[e.key]) {
            e.preventDefault();
            this.move(keyMap[e.key]);
        }
    }

    handleSwipe(startX, startY, endX, endY) {
        if (this.isPaused || (this.gameOver && !this.gameWon)) return;
        
        const deltaX = endX - startX;
        const deltaY = endY - startY;
        const minSwipeDistance = 50;
        
        if (Math.abs(deltaX) < minSwipeDistance && Math.abs(deltaY) < minSwipeDistance) {
            return;
        }
        
        if (navigator.vibrate) {
            navigator.vibrate(10);
        }
        
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
            if (deltaX > 0) {
                this.move('right');
            } else {
                this.move('left');
            }
        } else {
            if (deltaY > 0) {
                this.move('down');
            } else {
                this.move('up');
            }
        }
    }

    loadSettings() {
        this.setTheme(this.currentTheme);
        document.body.classList.toggle('colorblind-mode', this.colorblindMode);
        document.body.classList.toggle('high-contrast', this.highContrastMode);
        this.setFontSize(this.fontSize);
        
        const soundToggle = document.getElementById('sound-toggle');
        if (soundToggle) soundToggle.checked = this.soundEnabled;
        
        const musicToggle = document.getElementById('music-toggle');
        if (musicToggle) musicToggle.checked = this.musicEnabled;
        
        const colorblindToggle = document.getElementById('colorblind-mode');
        if (colorblindToggle) colorblindToggle.checked = this.colorblindMode;
        
        const highContrastToggle = document.getElementById('high-contrast-mode');
        if (highContrastToggle) highContrastToggle.checked = this.highContrastMode;
        
        const shakeEffectToggle = document.getElementById('shake-effect');
        if (shakeEffectToggle) shakeEffectToggle.checked = this.shakeEffectEnabled;
        
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === this.size);
        });
    }

    changeBoardSize(size) {
        this.size = size;
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.size) === size);
        });
        this.createGrid();
        this.newGame();
    }

    setTheme(theme) {
        document.body.className = '';
        if (theme !== 'default') {
            document.body.classList.add(`theme-${theme}`);
        }
        if (this.colorblindMode) document.body.classList.add('colorblind-mode');
        if (this.highContrastMode) document.body.classList.add('high-contrast');
        if (this.fontSize !== 'medium') document.body.classList.add(`font-${this.fontSize}`);
        
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.theme === theme) {
                btn.classList.add('active');
            }
        });
        
        this.currentTheme = theme;
        localStorage.setItem('theme2048', theme);
    }

    setFontSize(size) {
        document.body.classList.remove('font-small', 'font-medium', 'font-large');
        if (size !== 'medium') {
            document.body.classList.add(`font-${size}`);
        }
        
        document.querySelectorAll('.font-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
        
        this.fontSize = size;
        localStorage.setItem('fontSize2048', size);
    }

    switchTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === tab);
        });
    }

    showTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    nextTutorialStep() {
        this.tutorialStep++;
        
        if (this.tutorialStep > 3) {
            this.closeTutorial();
            return;
        }
        
        document.querySelectorAll('.tutorial-step').forEach(step => {
            step.classList.remove('active');
        });
        
        const currentStep = document.querySelector(`.tutorial-step[data-step="${this.tutorialStep}"]`);
        if (currentStep) {
            currentStep.classList.add('active');
        }
        
        if (this.tutorialStep === 3) {
            document.getElementById('next-tutorial').classList.add('hidden');
            document.getElementById('start-game').classList.remove('hidden');
        }
    }

    closeTutorial() {
        const overlay = document.getElementById('tutorial-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        localStorage.setItem('tutorialShown2048', 'true');
        this.tutorialShown = true;
        this.newGame();
    }

    showConfirm(message, callback) {
        const dialog = document.getElementById('confirm-dialog');
        const messageEl = document.getElementById('confirm-message');
        
        if (messageEl) messageEl.textContent = message;
        if (dialog) dialog.classList.add('active');
        
        this.confirmCallback = callback;
    }

    hideConfirm() {
        const dialog = document.getElementById('confirm-dialog');
        if (dialog) dialog.classList.remove('active');
        this.confirmCallback = null;
    }

    newGame() {
        this.grid = Array(this.size).fill(null).map(() => Array(this.size).fill(0));
        this.score = 0;
        this.moves = 0;
        this.maxTile = 0;
        this.gameOver = false;
        this.gameWon = false;
        this.history = [];
        this.combo = 0;
        this.maxCombo = 0;
        this.timer = 0;
        this.isPaused = false;
        this.gameResultSaved = false;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
        
        this.gameStartTime = Date.now();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
        
        this.gameMessage.classList.remove('active', 'game-won');
        this.pauseOverlay.classList.remove('active');
        
        this.addRandomTile();
        this.addRandomTile();
        
        this.updateDisplay();
        this.updateUndoButton();
        this.playSound('start');
        
        this.stats.gamesPlayed++;
        this.saveStats();
        
        this.checkAchievement('persistent', this.stats.gamesPlayed >= 10);
        this.checkAchievement('veteran', this.stats.gamesPlayed >= 50);
    }

    updateTimer() {
        if (!this.isPaused && !this.gameOver) {
            this.timer++;
            const minutes = Math.floor(this.timer / 60);
            const seconds = this.timer % 60;
            this.timerElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
    }

    togglePause() {
        if (this.gameOver) return;
        
        this.isPaused = !this.isPaused;
        this.pauseOverlay.classList.toggle('active', this.isPaused);
        this.pauseBtn.textContent = this.isPaused ? '继续' : '暂停';
        
        if (this.isPaused) {
            this.playSound('pause');
        }
    }

    addRandomTile() {
        const emptyCells = [];
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    emptyCells.push({ row, col });
                }
            }
        }
        
        if (emptyCells.length > 0) {
            const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
            this.grid[row][col] = Math.random() < 0.9 ? 2 : 4;
            return { row, col };
        }
        return null;
    }

    move(direction) {
        if (this.gameOver && !this.gameWon) return;
        if (this.isPaused) return;
        
        const previousState = {
            grid: this.grid.map(row => [...row]),
            score: this.score,
            moves: this.moves,
            maxTile: this.maxTile,
            combo: this.combo
        };
        
        let moved = false;
        const mergedPositions = [];
        let mergeCount = 0;
        
        if (direction === 'left') {
            for (let row = 0; row < this.size; row++) {
                const result = this.slideRow(this.grid[row]);
                if (result.moved) moved = true;
                this.grid[row] = result.row;
                mergeCount += result.mergeCount;
                result.mergedIndices.forEach(col => {
                    mergedPositions.push({ row, col });
                });
            }
        } else if (direction === 'right') {
            for (let row = 0; row < this.size; row++) {
                const result = this.slideRow(this.grid[row].slice().reverse());
                if (result.moved) moved = true;
                this.grid[row] = result.row.reverse();
                mergeCount += result.mergeCount;
                result.mergedIndices.forEach(col => {
                    mergedPositions.push({ row, col: this.size - 1 - col });
                });
            }
        } else if (direction === 'up') {
            for (let col = 0; col < this.size; col++) {
                const column = [];
                for (let row = 0; row < this.size; row++) {
                    column.push(this.grid[row][col]);
                }
                const result = this.slideRow(column);
                if (result.moved) moved = true;
                mergeCount += result.mergeCount;
                for (let row = 0; row < this.size; row++) {
                    this.grid[row][col] = result.row[row];
                }
                result.mergedIndices.forEach(row => {
                    mergedPositions.push({ row, col });
                });
            }
        } else if (direction === 'down') {
            for (let col = 0; col < this.size; col++) {
                const column = [];
                for (let row = 0; row < this.size; row++) {
                    column.push(this.grid[row][col]);
                }
                const result = this.slideRow(column.reverse());
                if (result.moved) moved = true;
                mergeCount += result.mergeCount;
                const newColumn = result.row.reverse();
                for (let row = 0; row < this.size; row++) {
                    this.grid[row][col] = newColumn[row];
                }
                result.mergedIndices.forEach(row => {
                    mergedPositions.push({ row: this.size - 1 - row, col });
                });
            }
        }
        
        if (moved) {
            this.history.push(previousState);
            if (this.history.length > this.maxHistoryLength) {
                this.history.shift();
            }
            
            this.moves++;
            
            if (mergeCount > 0) {
                this.combo += mergeCount;
                if (this.combo > this.maxCombo) {
                    this.maxCombo = this.combo;
                }
                
                const comboBonus = Math.floor(this.combo * 10);
                this.score += comboBonus;
                
                this.checkAchievement('combo_3', this.maxCombo >= 3);
                this.checkAchievement('combo_5', this.maxCombo >= 5);
                this.checkAchievement('combo_10', this.maxCombo >= 10);
            } else {
                this.combo = 0;
            }
            
            const newTile = this.addRandomTile();
            
            this.updateDisplay(newTile, mergedPositions);
            this.updateUndoButton();
            
            if (this.score > this.bestScore) {
                this.bestScore = this.score;
                localStorage.setItem('bestScore2048', this.bestScore);
            }
            
            if (mergedPositions.length > 0) {
                this.playSound('merge');
                this.triggerShake();
                
                mergedPositions.forEach(pos => {
                    const cell = this.gridContainer.children[pos.row * this.size + pos.col];
                    if (cell) {
                        const rect = cell.getBoundingClientRect();
                        this.createExplosion(
                            rect.left + rect.width / 2,
                            rect.top + rect.height / 2,
                            '#ffd700'
                        );
                    }
                });
            } else {
                this.playSound('move');
            }
            
            this.checkAchievement('first_merge', this.maxTile >= 4);
            this.checkAchievement('reach_512', this.maxTile >= 512);
            this.checkAchievement('reach_1024', this.maxTile >= 1024);
            this.checkAchievement('reach_2048', this.maxTile >= 2048);
            this.checkAchievement('score_10k', this.score >= 10000);
            
            if (this.maxTile >= 512 && this.timer <= 30) {
                this.checkAchievement('speed_demon', true);
            }
            
            if (this.gameWon) {
                this.showMessage('你赢了！', true);
                this.playSound('win');
                this.stats.gamesWon++;
                this.saveStats();
                this.saveGameResult();
            } else if (this.isGameOver()) {
                this.gameOver = true;
                this.showMessage('游戏结束！');
                this.playSound('gameover');
                this.saveGameResult();
            }
            
            this.saveGame();
        }
    }

    slideRow(row) {
        let newRow = row.filter(val => val !== 0);
        let moved = false;
        const mergedIndices = [];
        let mergeCount = 0;
        
        for (let i = 0; i < newRow.length - 1; i++) {
            if (newRow[i] === newRow[i + 1]) {
                const mergedValue = newRow[i] * 2;
                newRow[i] = mergedValue;
                this.score += mergedValue;
                if (mergedValue > this.maxTile) {
                    this.maxTile = mergedValue;
                    if (mergedValue > this.stats.maxTileEver) {
                        this.stats.maxTileEver = mergedValue;
                    }
                }
                if (mergedValue === 2048 && !this.gameWon) {
                    this.gameWon = true;
                }
                mergedIndices.push(i);
                mergeCount++;
                newRow.splice(i + 1, 1);
            }
        }
        
        while (newRow.length < this.size) {
            newRow.push(0);
        }
        
        for (let i = 0; i < this.size; i++) {
            if (row[i] !== newRow[i]) {
                moved = true;
            }
        }
        
        return { row: newRow, moved, mergedIndices, mergeCount };
    }

    isGameOver() {
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                if (this.grid[row][col] === 0) {
                    return false;
                }
            }
        }
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const current = this.grid[row][col];
                if (row < this.size - 1 && this.grid[row + 1][col] === current) {
                    return false;
                }
                if (col < this.size - 1 && this.grid[row][col + 1] === current) {
                    return false;
                }
            }
        }
        
        return true;
    }

    undo() {
        if (this.history.length === 0) return;
        
        const previousState = this.history.pop();
        this.grid = previousState.grid;
        this.score = previousState.score;
        this.moves = previousState.moves;
        this.maxTile = previousState.maxTile;
        this.combo = previousState.combo;
        this.gameOver = false;
        this.gameWon = false;
        
        this.gameMessage.classList.remove('active', 'game-won');
        
        this.updateDisplay();
        this.updateUndoButton();
        this.playSound('undo');
    }

    updateUndoButton() {
        this.undoBtn.disabled = this.history.length === 0;
    }

    triggerShake() {
        if (!this.shakeEffectEnabled) return;
        this.gameContainer.classList.add('shake');
        setTimeout(() => {
            this.gameContainer.classList.remove('shake');
        }, 300);
    }

    updateDisplay(newTilePos = null, mergedPositions = []) {
        const cells = this.gridContainer.querySelectorAll('.grid-cell');
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const index = row * this.size + col;
                const cell = cells[index];
                const value = this.grid[row][col];
                
                cell.textContent = value || '';
                cell.setAttribute('data-value', value);
                
                cell.classList.remove('new', 'merged', 'flash');
                
                if (newTilePos && newTilePos.row === row && newTilePos.col === col) {
                    requestAnimationFrame(() => {
                        cell.classList.add('new');
                    });
                }
                
                if (mergedPositions.some(pos => pos.row === row && pos.col === col)) {
                    requestAnimationFrame(() => {
                        cell.classList.add('merged');
                        cell.classList.add('flash');
                    });
                }
            }
        }
        
        this.scoreElement.textContent = this.score;
        this.scoreElement.classList.add('bounce');
        setTimeout(() => this.scoreElement.classList.remove('bounce'), 300);
        
        this.bestScoreElement.textContent = this.bestScore;
        this.movesElement.textContent = this.moves;
        this.maxTileElement.textContent = this.maxTile;
        this.comboElement.textContent = `${this.combo}x`;
        
        if (this.combo > 0) {
            this.comboDisplay.textContent = `${this.combo}x`;
            this.comboDisplay.classList.add('active');
        } else {
            this.comboDisplay.classList.remove('active');
        }
    }

    showMessage(text, isWin = false) {
        const messageP = this.gameMessage.querySelector('p');
        messageP.textContent = text;
        
        this.gameMessage.classList.remove('game-won');
        if (isWin) {
            this.gameMessage.classList.add('game-won');
        }
        
        this.gameMessage.classList.add('active');
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
        }
    }

    saveGame() {
        const gameState = {
            grid: this.grid,
            score: this.score,
            moves: this.moves,
            maxTile: this.maxTile,
            timer: this.timer,
            size: this.size
        };
        localStorage.setItem('gameState2048', JSON.stringify(gameState));
    }

    saveGameResult() {
        if (this.gameResultSaved) return;
        this.gameResultSaved = true;
        
        const result = {
            score: this.score,
            maxTile: this.maxTile,
            moves: this.moves,
            time: this.timer,
            size: this.size,
            date: new Date().toISOString()
        };
        
        this.gameHistory.unshift(result);
        if (this.gameHistory.length > 20) {
            this.gameHistory.pop();
        }
        localStorage.setItem('gameHistory2048', JSON.stringify(this.gameHistory));
        
        this.leaderboard.push(result);
        this.leaderboard.sort((a, b) => b.score - a.score);
        this.leaderboard = this.leaderboard.slice(0, 10);
        localStorage.setItem('leaderboard2048', JSON.stringify(this.leaderboard));
        
        this.stats.totalScore += this.score;
        this.stats.totalMoves += this.moves;
        this.stats.totalTime += this.timer;
        this.saveStats();
        
        this.updateLeaderboard();
        this.updateHistoryDisplay();
    }

    saveStats() {
        localStorage.setItem('stats2048', JSON.stringify(this.stats));
        this.updateStatsDisplay();
    }

    updateAchievementsDisplay() {
        const grid = document.getElementById('achievements-grid');
        if (!grid) return;
        
        grid.innerHTML = '';
        
        this.achievements.forEach(achievement => {
            const item = document.createElement('div');
            item.className = `achievement-item ${this.unlockedAchievements.includes(achievement.id) ? 'unlocked' : ''}`;
            item.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-name">${achievement.name}</div>
            `;
            grid.appendChild(item);
        });
    }

    updateLeaderboard() {
        const list = document.getElementById('leaderboard-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.leaderboard.length === 0) {
            list.innerHTML = '<div class="empty-message">暂无记录</div>';
            return;
        }
        
        this.leaderboard.forEach((result, index) => {
            const item = document.createElement('div');
            item.className = 'leaderboard-item';
            item.innerHTML = `
                <span class="rank rank-${index + 1}">#${index + 1}</span>
                <span class="leaderboard-score">${result.score}</span>
                <span class="leaderboard-info">${result.maxTile} | ${result.size}×${result.size}</span>
            `;
            list.appendChild(item);
        });
    }

    updateStatsDisplay() {
        const grid = document.getElementById('stats-grid');
        if (!grid) return;
        
        const avgScore = this.stats.gamesPlayed > 0 ? Math.floor(this.stats.totalScore / this.stats.gamesPlayed) : 0;
        const avgTime = this.stats.gamesPlayed > 0 ? Math.floor(this.stats.totalTime / this.stats.gamesPlayed) : 0;
        
        grid.innerHTML = `
            <div class="stat-card">
                <div class="stat-card-label">游戏次数</div>
                <div class="stat-card-value">${this.stats.gamesPlayed}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">胜利次数</div>
                <div class="stat-card-value">${this.stats.gamesWon}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">最高分</div>
                <div class="stat-card-value">${this.bestScore}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">最大方块</div>
                <div class="stat-card-value">${this.stats.maxTileEver}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">平均分</div>
                <div class="stat-card-value">${avgScore}</div>
            </div>
            <div class="stat-card">
                <div class="stat-card-label">平均时间</div>
                <div class="stat-card-value">${Math.floor(avgTime / 60)}:${(avgTime % 60).toString().padStart(2, '0')}</div>
            </div>
        `;
    }

    updateHistoryDisplay() {
        const list = document.getElementById('history-list');
        if (!list) return;
        
        list.innerHTML = '';
        
        if (this.gameHistory.length === 0) {
            list.innerHTML = '<div class="empty-message">暂无历史记录</div>';
            return;
        }
        
        this.gameHistory.slice(0, 10).forEach(result => {
            const item = document.createElement('div');
            item.className = 'history-item';
            const date = new Date(result.date);
            item.innerHTML = `
                <span class="history-score">${result.score}</span>
                <span class="history-info">${result.maxTile} | ${result.size}×${result.size}</span>
                <span class="history-date">${date.toLocaleDateString()} ${date.toLocaleTimeString()}</span>
            `;
            list.appendChild(item);
        });
    }

    checkAchievement(id, condition) {
        if (condition && !this.unlockedAchievements.includes(id)) {
            this.unlockedAchievements.push(id);
            localStorage.setItem('achievements2048', JSON.stringify(this.unlockedAchievements));
            
            const achievement = this.achievements.find(a => a.id === id);
            if (achievement) {
                this.showAchievementPopup(achievement);
            }
            
            this.updateAchievementsDisplay();
        }
    }

    showAchievementPopup(achievement) {
        const popup = document.getElementById('achievement-popup');
        if (!popup) return;
        
        popup.querySelector('.achievement-title').textContent = achievement.name;
        popup.querySelector('.achievement-desc').textContent = achievement.desc;
        popup.querySelector('.achievement-icon').textContent = achievement.icon;
        
        popup.classList.add('active');
        
        setTimeout(() => {
            popup.classList.remove('active');
        }, 3000);
    }

    showShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.add('active');
            this.generateShareImage();
        }
    }

    hideShareModal() {
        const modal = document.getElementById('share-modal');
        if (modal) {
            modal.classList.remove('active');
        }
    }

    generateShareImage() {
        const canvas = document.getElementById('share-canvas');
        const ctx = canvas.getContext('2d');
        
        canvas.width = 400;
        canvas.height = 550;
        
        const roundRect = (x, y, w, h, r) => {
            if (w < 2 * r) r = w / 2;
            if (h < 2 * r) r = h / 2;
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.arcTo(x + w, y, x + w, y + h, r);
            ctx.arcTo(x + w, y + h, x, y + h, r);
            ctx.arcTo(x, y + h, x, y, r);
            ctx.arcTo(x, y, x + w, y, r);
            ctx.closePath();
            return ctx;
        };
        
        const gradient = ctx.createLinearGradient(0, 0, 400, 550);
        gradient.addColorStop(0, '#faf8ef');
        gradient.addColorStop(1, '#f5f1e8');
        ctx.fillStyle = gradient;
        
        roundRect(0, 0, 400, 550, 12);
        ctx.fill();
        
        ctx.fillStyle = '#776e65';
        ctx.font = 'bold 50px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('2048', 200, 70);
        
        ctx.font = '16px Arial';
        ctx.fillStyle = '#a0908a';
        ctx.fillText('迷你2048 - 终极版', 200, 95);
        
        ctx.fillStyle = '#8f7a66';
        roundRect(50, 115, 300, 80, 8);
        ctx.fill();
        
        ctx.fillStyle = 'white';
        ctx.font = 'bold 36px Arial';
        ctx.fillText(`得分: ${this.score}`, 200, 165);
        
        ctx.fillStyle = '#776e65';
        ctx.font = '20px Arial';
        ctx.textAlign = 'left';
        ctx.fillText(`最大方块: ${this.maxTile}`, 60, 230);
        ctx.fillText(`移动次数: ${this.moves}`, 60, 260);
        
        const minutes = Math.floor(this.timer / 60);
        const seconds = this.timer % 60;
        ctx.fillText(`用时: ${minutes}分${seconds.toString().padStart(2, '0')}秒`, 60, 290);
        
        ctx.textAlign = 'center';
        
        const tileSize = this.size === 3 ? 80 : this.size === 4 ? 70 : 55;
        const gap = 8;
        const gridWidth = this.size * tileSize + (this.size - 1) * gap;
        const startX = (400 - gridWidth) / 2;
        const startY = 320;
        
        ctx.fillStyle = '#bbada0';
        roundRect(startX - 10, startY - 10, gridWidth + 20, gridWidth + 20, 8);
        ctx.fill();
        
        const tileColors = {
            2: '#eee4da',
            4: '#ede0c8',
            8: '#f2b179',
            16: '#f59563',
            32: '#f67c5f',
            64: '#f65e3b',
            128: '#edcf72',
            256: '#edcc61',
            512: '#edc850',
            1024: '#edc53f',
            2048: '#edc22e'
        };
        
        for (let row = 0; row < this.size; row++) {
            for (let col = 0; col < this.size; col++) {
                const value = this.grid[row][col];
                const x = startX + col * (tileSize + gap);
                const y = startY + row * (tileSize + gap);
                
                ctx.fillStyle = value ? (tileColors[value] || '#3c3a32') : 'rgba(238, 228, 218, 0.35)';
                roundRect(x, y, tileSize, tileSize, 4);
                ctx.fill();
                
                if (value) {
                    ctx.fillStyle = value <= 4 ? '#776e65' : '#f9f6f2';
                    ctx.font = `bold ${value >= 1000 ? 20 : value >= 100 ? 24 : 28}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(value, x + tileSize / 2, y + tileSize / 2);
                }
            }
        }
        
        ctx.fillStyle = '#a0908a';
        ctx.font = '14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'alphabetic';
        ctx.fillText('扫码或分享给好友挑战吧！', 200, 530);
    }

    downloadShareImage() {
        const canvas = document.getElementById('share-canvas');
        const link = document.createElement('a');
        link.download = `2048-score-${this.score}.png`;
        link.href = canvas.toDataURL();
        link.click();
    }

    copyShareLink() {
        const text = `我在2048游戏中获得了${this.score}分！最大方块${this.maxTile}，用时${Math.floor(this.timer / 60)}分${this.timer % 60}秒！`;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(text).then(() => {
                const btn = document.getElementById('copy-link');
                const originalText = btn.textContent;
                btn.textContent = '已复制！';
                btn.style.background = '#4CAF50';
                setTimeout(() => {
                    btn.textContent = originalText;
                    btn.style.background = '';
                }, 2000);
            }).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            const btn = document.getElementById('copy-link');
            const originalText = btn.textContent;
            btn.textContent = '已复制！';
            btn.style.background = '#4CAF50';
            setTimeout(() => {
                btn.textContent = originalText;
                btn.style.background = '';
            }, 2000);
        } catch (err) {
            alert('复制失败，请手动复制：\n' + text);
        }
        document.body.removeChild(textarea);
    }

    playSound(type) {
        if (!this.soundEnabled) return;
        
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        const playNote = (frequency, duration, type = 'sine', volume = 0.15, delay = 0) => {
            const oscillator = this.audioContext.createOscillator();
            const gainNode = this.audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            oscillator.type = type;
            oscillator.frequency.setValueAtTime(frequency, this.audioContext.currentTime + delay);
            
            const startTime = this.audioContext.currentTime + delay;
            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + duration);
            
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        };
        
        const playChord = (frequencies, duration, type = 'sine', volume = 0.1) => {
            frequencies.forEach(freq => playNote(freq, duration, type, volume));
        };
        
        switch(type) {
            case 'move':
                playNote(523.25, 0.08, 'sine', 0.12);
                playNote(659.25, 0.06, 'sine', 0.08, 0.02);
                break;
                
            case 'merge':
                playChord([523.25, 659.25, 783.99], 0.15, 'sine', 0.08);
                playNote(1046.50, 0.2, 'sine', 0.06, 0.05);
                break;
                
            case 'start':
                playNote(523.25, 0.1, 'sine', 0.1);
                playNote(659.25, 0.1, 'sine', 0.1, 0.1);
                playNote(783.99, 0.15, 'sine', 0.12, 0.2);
                break;
                
            case 'undo':
                playNote(392.00, 0.1, 'triangle', 0.1);
                playNote(329.63, 0.12, 'triangle', 0.08, 0.05);
                break;
                
            case 'win':
                const winNotes = [523.25, 659.25, 783.99, 1046.50];
                winNotes.forEach((freq, i) => {
                    playNote(freq, 0.4, 'sine', 0.1, i * 0.1);
                });
                playChord([1046.50, 1318.51], 0.6, 'sine', 0.08);
                break;
                
            case 'gameover':
                playNote(196.00, 0.15, 'sawtooth', 0.08);
                playNote(174.61, 0.2, 'sawtooth', 0.08, 0.15);
                playNote(164.81, 0.3, 'sawtooth', 0.1, 0.3);
                break;
                
            case 'pause':
                playNote(329.63, 0.1, 'sine', 0.1);
                break;
        }
    }

    startBackgroundMusic() {
        if (this.musicPlaying) return;
        
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        
        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().then(() => {
                this.musicPlaying = true;
                this.playBackgroundLoop();
            });
        } else {
            this.musicPlaying = true;
            this.playBackgroundLoop();
        }
    }

    playBackgroundLoop() {
        if (!this.musicPlaying || !this.musicEnabled) return;
        
        if (!this.audioContext || this.audioContext.state === 'suspended') {
            return;
        }
        
        const playNote = (freq, startTime, duration) => {
            if (!this.audioContext || !this.musicPlaying || this.audioContext.state === 'suspended') return;
            
            try {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();
                
                osc.connect(gain);
                gain.connect(this.audioContext.destination);
                
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                
                gain.gain.setValueAtTime(0, startTime);
                gain.gain.linearRampToValueAtTime(0.03, startTime + 0.1);
                gain.gain.linearRampToValueAtTime(0.02, startTime + duration - 0.1);
                gain.gain.linearRampToValueAtTime(0, startTime + duration);
                
                osc.start(startTime);
                osc.stop(startTime + duration);
            } catch (e) {
                console.log('Music note error:', e);
            }
        };
        
        const melody = [
            523.25, 587.33, 659.25, 698.46, 783.99, 698.46, 659.25, 587.33,
            523.25, 493.88, 440.00, 493.88, 523.25, 587.33, 523.25, 493.88
        ];
        
        const now = this.audioContext.currentTime;
        const noteDuration = 0.5;
        
        melody.forEach((freq, i) => {
            playNote(freq, now + i * noteDuration, noteDuration);
        });
        
        const totalDuration = melody.length * noteDuration * 1000;
        this.musicTimeout = setTimeout(() => {
            if (this.musicPlaying && this.musicEnabled) {
                this.playBackgroundLoop();
            }
        }, totalDuration);
    }

    stopBackgroundMusic() {
        this.musicPlaying = false;
        if (this.musicTimeout) {
            clearTimeout(this.musicTimeout);
            this.musicTimeout = null;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new Game2048();
});
