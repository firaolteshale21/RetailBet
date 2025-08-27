// Game Sync Dashboard - Simplified Version
// Only handles sync controls and timers

class GameSyncDashboard {
    constructor() {
        this.isMultiGameSyncActive = false;
        this.gameTimers = new Map();
        this.updateInterval = null;
        
        // Backend API configuration
        this.backendUrl = 'http://localhost:4000'; // Match backend server port
        
        this.initializeElements();
        this.bindEvents();
        this.startStatusUpdates();
    }

    initializeElements() {
        this.manualSyncBtn = document.getElementById('manualSyncBtn');
        this.multiGameSyncBtn = document.getElementById('multiGameSyncBtn');
        this.multiGameSyncStatus = document.getElementById('multiGameSyncStatus');
        this.gameTimersContainer = document.getElementById('gameTimers');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.notification = document.getElementById('notification');
    }

    bindEvents() {
        this.manualSyncBtn.addEventListener('click', () => this.performManualSync());
        this.multiGameSyncBtn.addEventListener('click', () => this.toggleMultiGameSync());
    }

    async performManualSync() {
        try {
            this.showLoading('Performing manual sync...');
            
            // Get the first enabled game for manual sync
            const gamesResponse = await fetch(`${this.backendUrl}/api/games`);
            const gamesResult = await gamesResponse.json();
            
            if (!gamesResult.success || !gamesResult.games || gamesResult.games.length === 0) {
                throw new Error('No enabled games found');
            }
            
            const firstGame = gamesResult.games[0];
            const response = await fetch(`${this.backendUrl}/api/robust-auto-sync/manual/${firstGame.TYPE_NAME}`, {
                method: 'POST',
            headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.showNotification(`Manual sync completed for ${firstGame.TYPE_NAME}!`, 'success');
            } else {
                this.showNotification(`Manual sync failed: ${result.error}`, 'error');
            }
    } catch (error) {
            this.showNotification(`Manual sync error: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    async toggleMultiGameSync() {
        try {
            this.showLoading('Toggling multi-game sync...');
            
            const endpoint = this.isMultiGameSyncActive ? `${this.backendUrl}/api/robust-auto-sync/stop` : `${this.backendUrl}/api/robust-auto-sync/start`;
            const method = 'POST';
            
            const response = await fetch(endpoint, {
                method,
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const result = await response.json();
            
            if (result.success) {
                this.isMultiGameSyncActive = !this.isMultiGameSyncActive;
                this.updateMultiGameSyncStatus();
                this.updateMultiGameSyncButton();
                
                const message = this.isMultiGameSyncActive ? 
                    'Multi-game auto-sync started!' : 
                    'Multi-game auto-sync stopped!';
                this.showNotification(message, 'success');
            } else {
                this.showNotification(`Multi-game sync failed: ${result.error}`, 'error');
            }
    } catch (error) {
            this.showNotification(`Multi-game sync error: ${error.message}`, 'error');
        } finally {
            this.hideLoading();
        }
    }

    updateMultiGameSyncStatus() {
        const statusText = this.multiGameSyncStatus.querySelector('.status-text');
        const syncIcon = this.multiGameSyncStatus.querySelector('.sync-icon');
        
        if (this.isMultiGameSyncActive) {
            statusText.textContent = 'Multi-Game Auto-Sync ON';
            statusText.classList.add('active');
            syncIcon.textContent = '🔄';
        } else {
            statusText.textContent = 'Multi-Game Auto-Sync OFF';
            statusText.classList.remove('active');
            syncIcon.textContent = '⏸️';
        }
    }

    updateMultiGameSyncButton() {
        if (this.isMultiGameSyncActive) {
            this.multiGameSyncBtn.textContent = '⏹️ Stop Multi-Game Auto-Sync';
            this.multiGameSyncBtn.classList.remove('btn-success');
            this.multiGameSyncBtn.classList.add('btn-warning');
        } else {
            this.multiGameSyncBtn.textContent = '🎮 Multi-Game Auto-Sync';
            this.multiGameSyncBtn.classList.remove('btn-warning');
            this.multiGameSyncBtn.classList.add('btn-success');
        }
    }

    async updateGameTimers() {
        try {
            const response = await fetch(`${this.backendUrl}/api/robust-auto-sync/status`);
            const status = await response.json();
            
            if (status.active) {
                this.isMultiGameSyncActive = true;
                this.updateMultiGameSyncStatus();
                this.updateMultiGameSyncButton();
                this.renderGameTimers(status.games);
            } else {
                this.isMultiGameSyncActive = false;
                this.updateMultiGameSyncStatus();
                this.updateMultiGameSyncButton();
                this.clearGameTimers();
                }
            } catch (error) {
            console.error('Failed to update game timers:', error);
        }
    }

    renderGameTimers(games) {
        this.gameTimersContainer.innerHTML = '';
        
        games.forEach(game => {
            const timerElement = this.createGameTimerElement(game);
            this.gameTimersContainer.appendChild(timerElement);
        });
    }

    createGameTimerElement(game) {
        const timerDiv = document.createElement('div');
        timerDiv.className = `game-timer ${game.hasTimer ? 'active' : ''}`;
        
        const lastSyncTime = game.lastSyncTime ? new Date(game.lastSyncTime) : null;
        const nextSyncTime = game.nextSyncTime ? new Date(game.nextSyncTime) : null;
        const now = new Date();
        
        let countdownText = 'N/A';
        if (nextSyncTime && nextSyncTime > now) {
            const diffMs = nextSyncTime - now;
            const diffSeconds = Math.floor(diffMs / 1000);
            const minutes = Math.floor(diffSeconds / 60);
            const seconds = diffSeconds % 60;
            countdownText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
        
        const lastSyncText = lastSyncTime ? 
            lastSyncTime.toLocaleTimeString() : 'Never';
        
        timerDiv.innerHTML = `
            <div class="game-name">${game.type}</div>
            <div class="timer-info">
                <div class="timer-details">
                    <div class="timer-item">
                        <div class="timer-label">Interval</div>
                        <div class="timer-value">${game.syncIntervalSeconds}s</div>
        </div>
                    <div class="timer-item">
                        <div class="timer-label">Last Sync</div>
                        <div class="timer-value">${lastSyncText}</div>
        </div>
                    <div class="timer-item">
                        <div class="timer-label">Next Sync</div>
                        <div class="countdown">${countdownText}</div>
        </div>
            </div>
        </div>
    `;
    
        return timerDiv;
    }

    clearGameTimers() {
        this.gameTimersContainer.innerHTML = '<p style="text-align: center; color: #6c757d; font-style: italic;">No active timers</p>';
    }

    startStatusUpdates() {
        // Update status every 5 seconds
        this.updateInterval = setInterval(() => {
            this.updateGameTimers();
        }, 5000);
        
        // Initial update
        this.updateGameTimers();
    }

    showLoading(message = 'Loading...') {
        this.loadingOverlay.querySelector('p').textContent = message;
        this.loadingOverlay.classList.remove('hidden');
    }

    hideLoading() {
        this.loadingOverlay.classList.add('hidden');
    }

    showNotification(message, type = 'info') {
        this.notification.textContent = message;
        this.notification.className = `notification ${type}`;
        this.notification.classList.remove('hidden');
        
        // Show the notification
        setTimeout(() => {
            this.notification.classList.add('show');
        }, 100);
        
        // Hide after 5 seconds
        setTimeout(() => {
            this.notification.classList.remove('show');
            setTimeout(() => {
                this.notification.classList.add('hidden');
            }, 300);
        }, 5000);
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new GameSyncDashboard();
});

