// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAMI3pmtZN4KiqQR9k6g670c6u_5DXFxu8",
  authDomain: "ecosmart-demo.firebaseapp.com",
  databaseURL: "https://ecosmart-demo-default-rtdb.asia-southeast1.firebasedatabase.app/",
  projectId: "ecosmart-demo",
  storageBucket: "ecosmart-demo.firebasestorage.app",
  messagingSenderId: "865470218525",
  appId: "1:865470218525:web:d022f9831384f9c97fe1f4"
};

class EcoSmartApp {
    constructor() {
        this.firebaseReady = false;
        this.connectionMonitorInterval = null;
        this.lastConnectionCheck = Date.now();
        this.deferredPrompt = null;

        // Register PWA Service Worker FIRST
        this.registerServiceWorker();

        // Setup PWA install prompt
        this.setupPWAInstall();

        // Then initialize Firebase
        this.initFirebase();
        this.init();
    }

    // 🚀 PWA Service Worker Registration
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('/sw.js');
                console.log('🚀 EcoSmart PWA: Service Worker registered successfully');

                // Listen for updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });
            } catch (error) {
                console.error('❌ EcoSmart PWA: Service Worker registration failed:', error);
            }
        }
    }

    // 🚀 PWA Install Prompt Setup
    setupPWAInstall() {
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            this.deferredPrompt = e;
            this.showInstallButton();
        });
    }

    showInstallButton() {
        // Remove existing install button
        const existing = document.getElementById('pwa-install-btn');
        if (existing) existing.remove();

        const installBtn = document.createElement('button');
        installBtn.id = 'pwa-install-btn';
        installBtn.innerHTML = '📱 Install App';
        installBtn.className = 'btn';
        installBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            z-index: 10000;
            animation: pulse 2s infinite;
            background: linear-gradient(135deg, #00ff87, #60efff);
            color: #000;
            border: none;
        `;

        installBtn.addEventListener('click', async () => {
            if (this.deferredPrompt) {
                this.deferredPrompt.prompt();
                const { outcome } = await this.deferredPrompt.userChoice;
                console.log('PWA Install prompt:', outcome);
                this.deferredPrompt = null;
                installBtn.remove();

                if (outcome === 'accepted') {
                    this.showToast('App installed successfully! 📱');
                }
            }
        });

        document.body.appendChild(installBtn);
    }

    showUpdateAvailable() {
        const updateBanner = document.createElement('div');
        updateBanner.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: linear-gradient(135deg, #667eea, #764ba2);
            color: white;
            padding: 1rem;
            text-align: center;
            z-index: 10001;
            font-weight: 600;
        `;
        updateBanner.innerHTML = `
            🔄 New version available!
            <button onclick="location.reload()" style="background: white; color: #764ba2; border: none; padding: 0.5rem 1rem; border-radius: 5px; margin-left: 1rem; cursor: pointer;">
                Update Now
            </button>
        `;
        document.body.appendChild(updateBanner);
    }

    // 🔥 Firebase Initialization
    async initFirebase() {
        try {
            console.log("🔥 Initializing Firebase...");
            const { initializeApp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js');
            const { getDatabase, ref, set, get, onValue, serverTimestamp } = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js');

            this.app = initializeApp(firebaseConfig);
            this.database = getDatabase(this.app);
            this.dbRef = ref;
            this.dbSet = set;
            this.dbGet = get;
            this.dbOnValue = onValue;
            this.serverTimestamp = serverTimestamp;

            await this.simpleConnectionTest();

            console.log("🔥 Firebase initialized successfully!");
            this.firebaseReady = true;
            this.showFirebaseStatus(true);
            this.startConnectionMonitoring();

        } catch (error) {
            console.error("Firebase initialization error:", error);
            this.firebaseReady = false;
            this.showFirebaseStatus(false);

            setTimeout(() => {
                console.log("🔥 Retrying Firebase initialization...");
                this.initFirebase();
            }, 3000);
        }
    }

    async simpleConnectionTest() {
        try {
            const testRef = this.dbRef(this.database, 'connectionTest');
            await this.dbSet(testRef, {
                timestamp: Date.now(),
                test: "connection"
            });
            console.log("🔥 Firebase connection test successful");
            await this.dbSet(testRef, null);
            return true;
        } catch (error) {
            console.error("🔥 Firebase connection test failed:", error);
            throw error;
        }
    }

    startConnectionMonitoring() {
        if (this.connectionMonitorInterval) {
            clearInterval(this.connectionMonitorInterval);
        }

        this.connectionMonitorInterval = setInterval(() => {
            if (this.firebaseReady) {
                this.checkConnectionHealth();
            }
        }, 30000);

        console.log("🔥 Connection monitoring started");
    }

    async checkConnectionHealth() {
        try {
            const healthRef = this.dbRef(this.database, 'healthCheck');
            await this.dbSet(healthRef, Date.now());
            await this.dbSet(healthRef, null);
            console.log("🔥 Firebase connection healthy");
        } catch (error) {
            console.warn("🔥 Connection health check failed:", error);
            this.reconnectFirebase();
        }
    }

    async reconnectFirebase() {
        console.log("🔥 Attempting Firebase reconnection...");
        this.firebaseReady = false;
        this.showFirebaseStatus(false);

        setTimeout(() => {
            this.initFirebase();
        }, 2000);
    }

    showFirebaseStatus(isReady) {
        const statusDiv = document.createElement('div');
        statusDiv.id = 'firebase-status';
        statusDiv.style.cssText = `
            position: fixed;
            top: 10px;
            left: 10px;
            background: ${isReady ? '#00ff87' : '#ff6b6b'};
            color: ${isReady ? '#000' : '#fff'};
            padding: 0.5rem 1rem;
            border-radius: 20px;
            font-size: 0.8rem;
            font-weight: bold;
            z-index: 10000;
            animation: ${isReady ? 'pulse' : 'blink'} 2s infinite;
        `;
        statusDiv.innerHTML = isReady ? '🔥 REAL-TIME ACTIVE' : '💾 RECONNECTING...';

        const existing = document.getElementById('firebase-status');
        if (existing) existing.remove();

        document.body.appendChild(statusDiv);
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        document.addEventListener('DOMContentLoaded', () => {
            this.animateElements();
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                console.log("🔥 Page hidden");
            } else {
                console.log("🔥 Page visible, checking connection");
                if (this.firebaseReady) {
                    this.checkConnectionHealth();
                }
            }
        });
    }

    animateElements() {
        const cards = document.querySelectorAll('.glass-card');
        cards.forEach((card, index) => {
            setTimeout(() => {
                card.style.opacity = '0';
                card.style.transform = 'translateY(30px)';
                card.style.transition = 'all 0.6s ease';

                setTimeout(() => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 100);
            }, index * 200);
        });
    }

    getUsers() {
        return {
            'WRK001': {
                name: 'Rajesh Kumar',
                type: 'worker',
                area: 'Zone A',
                id: 'WRK001'
            },
            'WRK002': {
                name: 'Priya Sharma',
                type: 'worker',
                area: 'Zone B',
                id: 'WRK002'
            },
            'WRK003': {
                name: 'Amit Singh',
                type: 'worker',
                area: 'Zone C',
                id: 'WRK003'
            },
            'USR1234': {
                name: 'Green Family',
                credits: 0,
                type: 'user',
                id: 'USR1234',
                address: 'Apartment 101, Green Society',
                phone: '+91 98765 43210',
                history: []
            },
            'USR5678': {
                name: 'Eco Household',
                credits: 0,
                type: 'user',
                id: 'USR5678',
                address: 'House 24, Eco Street',
                phone: '+91 87654 32109',
                history: []
            },
            'USR9101': {
                name: 'Smart Home',
                credits: 0,
                type: 'user',
                id: 'USR9101',
                address: 'Villa 7, Smart City',
                phone: '+91 76543 21098',
                history: []
            }
        };
    }

    loginUser(userId, type) {
        const users = this.getUsers();
        const user = users[userId];

        if (user && user.type === type) {
            localStorage.setItem('currentUser', JSON.stringify(user));
            return { success: true, user };
        }

        return { success: false, message: 'Invalid credentials' };
    }

    getCurrentUser() {
        const userStr = localStorage.getItem('currentUser');
        return userStr ? JSON.parse(userStr) : null;
    }

    processQRData(qrData) {
        try {
            const parts = qrData.split('|');

            if (parts.length !== 7) {
                throw new Error('Invalid QR code format');
            }

            return {
                userId: parts[0],
                wasteType: parts[1],
                weight: parts[2],
                compostYield: parts[3],
                accuracy: parts[4],
                date: parts[5],
                binId: parts[6]
            };
        } catch (error) {
            console.error('Error processing QR data:', error);
            return null;
        }
    }

    calculateCredits(wasteData) {
        const { wasteType, weight, accuracy } = wasteData;
        const weightNum = parseFloat(weight.replace('kg', ''));
        const accuracyNum = parseFloat(accuracy.replace('%', ''));

        let basePoints = 0;

        switch (wasteType.toLowerCase()) {
            case 'organic':
                basePoints = weightNum * 4;
                break;
            case 'plastic':
                basePoints = weightNum * 6;
                break;
            case 'paper':
                basePoints = weightNum * 3;
                break;
            case 'metal':
                basePoints = weightNum * 8;
                break;
            case 'glass':
                basePoints = weightNum * 5;
                break;
            default:
                basePoints = weightNum * 2;
        }

        const accuracyBonus = accuracyNum > 90 ? 1.2 : accuracyNum > 80 ? 1.1 : 1.0;
        return Math.round(basePoints * accuracyBonus);
    }

    async addTransaction(userId, wasteData, credits) {
        console.log(`🔥 Adding transaction for ${userId}: ${credits} credits`);

        try {
            if (!this.firebaseReady) {
                console.log("Firebase not ready, using local storage");
                return this.addTransactionLocal(userId, wasteData, credits);
            }

            const transaction = {
                id: 'TXN' + Date.now(),
                date: new Date().toISOString(),
                wasteType: wasteData.wasteType,
                weight: wasteData.weight,
                compostYield: wasteData.compostYield,
                accuracy: wasteData.accuracy,
                credits: credits,
                binId: wasteData.binId,
                timestamp: new Date().toLocaleString()
            };

            const userRef = this.dbRef(this.database, 'users/' + userId);
            const snapshot = await this.dbGet(userRef);
            let userData = snapshot.val();

            if (!userData) {
                userData = this.getUsers()[userId] || {
                    id: userId,
                    name: `User ${userId}`,
                    credits: 0,
                    type: 'user',
                    history: []
                };
            }

            userData.credits = (userData.credits || 0) + credits;
            userData.history = userData.history || [];
            userData.history.unshift(transaction);
            userData.lastUpdated = new Date().toISOString();

            const writePromise = this.dbSet(userRef, userData);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Write timeout')), 10000);
            });

            await Promise.race([writePromise, timeoutPromise]);

            console.log(`🔥 Successfully synced ${credits} credits to Firebase for ${userId}`);
            localStorage.setItem('userData_' + userId, JSON.stringify(userData));

            return {
                success: true,
                user: userData,
                transaction,
                message: `Successfully added ${credits} credits! (Real-time synced)`
            };
        } catch (error) {
            console.error('Firebase write error, falling back to local:', error);
            return this.addTransactionLocal(userId, wasteData, credits);
        }
    }

    addTransactionLocal(userId, wasteData, credits) {
        const users = this.getUsers();
        let userData = users[userId];

        if (!userData) {
            return { success: false, message: 'User not found' };
        }

        const existingData = localStorage.getItem('userData_' + userId);
        if (existingData) {
            userData = JSON.parse(existingData);
        }

        const transaction = {
            id: 'TXN' + Date.now(),
            date: new Date().toISOString(),
            wasteType: wasteData.wasteType,
            weight: wasteData.weight,
            compostYield: wasteData.compostYield,
            accuracy: wasteData.accuracy,
            credits: credits,
            binId: wasteData.binId,
            timestamp: new Date().toLocaleString()
        };

        userData.credits = (userData.credits || 0) + credits;
        userData.history = userData.history || [];
        userData.history.unshift(transaction);

        localStorage.setItem('userData_' + userId, JSON.stringify(userData));

        return {
            success: true,
            user: userData,
            transaction,
            message: `Successfully added ${credits} credits! (Local storage)`
        };
    }

    async getUserData(userId) {
        try {
            if (!this.firebaseReady) {
                return this.getUserDataLocal(userId);
            }

            const userRef = this.dbRef(this.database, 'users/' + userId);
            const dataPromise = this.dbGet(userRef);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Read timeout')), 8000);
            });

            const snapshot = await Promise.race([dataPromise, timeoutPromise]);
            const firebaseData = snapshot.val();

            if (firebaseData) {
                localStorage.setItem('userData_' + userId, JSON.stringify(firebaseData));
                return firebaseData;
            }

            return this.getUserDataLocal(userId);

        } catch (error) {
            console.error('Firebase read error, using local data:', error);
            return this.getUserDataLocal(userId);
        }
    }

    getUserDataLocal(userId) {
        const users = this.getUsers();
        let userData = users[userId];

        const existingData = localStorage.getItem('userData_' + userId);
        if (existingData) {
            userData = JSON.parse(existingData);
        }

        return userData || null;
    }

    listenToUserUpdates(userId, callback) {
        console.log("🔥 Setting up real-time listener for:", userId);

        if (!this.firebaseReady) {
            console.log("Firebase not ready, using polling");
            return this.setupPollingListener(userId, callback);
        }

        const userRef = this.dbRef(this.database, 'users/' + userId);

        const unsubscribe = this.dbOnValue(userRef,
            (snapshot) => {
                const userData = snapshot.val();

                if (userData) {
                    console.log("🔥 Real-time update received for", userId, "at", new Date().toLocaleTimeString());
                    console.log("Credits:", userData.credits, "| Transactions:", userData.history?.length || 0);

                    localStorage.setItem('userData_' + userId, JSON.stringify(userData));
                    callback(userData);
                    this.showLiveUpdateNotification();
                }
            },
            (error) => {
                console.error("🔥 Firebase listener error:", error);
                this.showToast("Real-time connection lost, switching to polling mode", 'error');
                return this.setupPollingListener(userId, callback);
            }
        );

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }

    setupPollingListener(userId, callback) {
        console.log("🔥 Setting up polling listener for", userId);

        let lastKnownCredits = null;

        const pollInterval = setInterval(async () => {
            try {
                const userData = await this.getUserData(userId);
                if (userData) {
                    if (lastKnownCredits !== userData.credits) {
                        console.log("🔥 Polling detected change for", userId, "- Credits:", userData.credits);
                        lastKnownCredits = userData.credits;
                        callback(userData);
                        this.showLiveUpdateNotification();
                    }
                }
            } catch (error) {
                console.error("🔥 Polling error:", error);
            }
        }, 5000);

        return () => clearInterval(pollInterval);
    }

    showLiveUpdateNotification() {
        const existing = document.querySelector('.live-update-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'live-update-notification';
        notification.style.cssText = `
            position: fixed;
            top: 60px;
            left: 50%;
            transform: translateX(-50%);
            background: linear-gradient(45deg, #00ff87, #60efff);
            color: #000;
            padding: 0.8rem 1.5rem;
            border-radius: 25px;
            font-weight: bold;
            z-index: 10000;
            animation: slideDown 0.5s ease;
            box-shadow: 0 4px 20px rgba(0, 255, 135, 0.3);
        `;
        notification.innerHTML = '⚡ LIVE UPDATE RECEIVED';

        document.body.appendChild(notification);
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }

    formatCurrency(amount) {
        return `₹${(amount * 0.30).toFixed(2)}`;
    }

    showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const firebaseStatus = this.firebaseReady ? '🔥 REAL-TIME' : '💾 LOCAL';
        const timestamp = new Date().toLocaleTimeString();

        toast.innerHTML = `
            <div class="toast-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : 'exclamation-circle'}"></i>
                <span>${message}</span>
                <div style="font-size: 0.8rem; opacity: 0.8; margin-top: 0.2rem;">
                    ${firebaseStatus} | ${timestamp}
                </div>
            </div>
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 100);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if (toast.parentNode) {
                    document.body.removeChild(toast);
                }
            }, 300);
        }, 4000);
    }

    generateSampleQRs() {
        return [
            'USR1234|Organic|5.0kg|2.0kg|92%|2025-09-07|BIN001',
            'USR5678|Plastic|3.0kg|--|88%|2025-09-07|BIN002',
            'USR9101|Paper|2.5kg|--|95%|2025-09-07|BIN003',
            'USR1234|Metal|1.0kg|--|90%|2025-09-07|BIN001',
            'USR5678|Glass|4.0kg|--|85%|2025-09-07|BIN002'
        ];
    }
}

// Initialize App
const app = new EcoSmartApp();

// Enhanced CSS with animations
const enhancedCSS = `
<style>
@keyframes slideDown {
    from {
        transform: translateX(-50%) translateY(-100px);
        opacity: 0;
    }
    to {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
    }
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

@keyframes blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.5; }
}

.toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: rgba(0, 255, 135, 0.95);
    color: white;
    padding: 1rem 1.5rem;
    border-radius: 15px;
    backdrop-filter: blur(20px);
    border: 1px solid rgba(255, 255, 255, 0.3);
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
    z-index: 10000;
    transform: translateX(400px);
    transition: transform 0.3s ease;
    min-width: 280px;
    max-width: 400px;
}

.toast.show {
    transform: translateX(0);
}

.toast-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.3rem;
}

.toast-error {
    background: rgba(255, 67, 67, 0.95);
}

.live-update-notification {
    animation: slideDown 0.5s ease !important;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', enhancedCSS);
