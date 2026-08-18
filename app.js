/**
 * Main Application Controller for Secure Bluetooth Chat
 * Manages UI state, Bluetooth connection, encryption, and messaging
 */

class SecureChatApp {
    constructor() {
        this.cryptoManager = new CryptoManager();
        this.bluetoothManager = new BluetoothManager();
        
        // App state
        this.currentScreen = 'welcome';
        this.connectedDevice = null;
        this.isDeviceVerified = false;
        this.messages = [];
        
        // Initialize
        this.init();
    }

    async init() {
        // Check Bluetooth availability
        if (!this.bluetoothManager.isAvailable()) {
            this.showError('Web Bluetooth API is not available in this browser. Please use Chrome, Edge, or Opera.');
            return;
        }

        // Set up Bluetooth callbacks
        this.bluetoothManager.setCallbacks({
            onConnected: this.handleBluetoothConnected.bind(this),
            onDisconnected: this.handleBluetoothDisconnected.bind(this),
            onMessageReceived: this.handleMessageReceived.bind(this),
            onError: this.handleError.bind(this)
        });

        // Set up UI event listeners
        this.setupEventListeners();

        // Initialize crypto manager
        try {
            await this.cryptoManager.initialize();
        } catch (error) {
            this.showError('Failed to initialize encryption: ' + error.message);
        }
    }

    setupEventListeners() {
        // Welcome screen
        document.getElementById('start-btn').addEventListener('click', () => this.showScreen('scan'));

        // Scan screen
        document.getElementById('scan-btn').addEventListener('click', () => this.scanForDevices());
        document.getElementById('back-to-welcome-btn').addEventListener('click', () => this.showScreen('welcome'));

        // Connection screen
        document.getElementById('disconnect-btn').addEventListener('click', () => this.disconnect());
        document.getElementById('proceed-btn').addEventListener('click', () => this.proceedToVerification());

        // Verification screen
        document.getElementById('verify-btn').addEventListener('click', () => this.verifyDevice());
        document.getElementById('cancel-verification-btn').addEventListener('click', () => this.cancelVerification());

        // Chat screen
        document.getElementById('send-btn').addEventListener('click', () => this.sendMessage());
        document.getElementById('message-input').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.sendMessage();
        });
        document.getElementById('message-input').addEventListener('input', (e) => {
            document.getElementById('send-btn').disabled = !e.target.value.trim();
        });
        document.getElementById('clear-chat-btn').addEventListener('click', () => this.clearChat());
        document.getElementById('security-info-btn').addEventListener('click', () => this.showSecurityModal());

        // Security modal
        document.getElementById('close-modal-btn').addEventListener('click', () => this.hideSecurityModal());
        document.querySelector('.modal-overlay').addEventListener('click', () => this.hideSecurityModal());

        // Error toast
        document.getElementById('close-toast-btn').addEventListener('click', () => this.hideError());
    }

    showScreen(screenName) {
        // Hide all screens
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });

        // Show target screen
        const targetScreen = document.getElementById(`${screenName}-screen`);
        if (targetScreen) {
            targetScreen.classList.add('active');
            this.currentScreen = screenName;
        }
    }

    async scanForDevices() {
        const scanBtn = document.getElementById('scan-btn');
        const scanProgress = document.getElementById('scan-progress');
        const devicesList = document.getElementById('devices-list');

        // Show scanning state
        scanBtn.disabled = true;
        scanProgress.classList.remove('hidden');
        devicesList.innerHTML = '<div class="empty-state"><p>Opening Bluetooth device picker...</p></div>';

        try {
            // Real Bluetooth - browser will show native picker
            const device = await this.bluetoothManager.scanForDevices();
            
            // Device selected from picker, proceed directly to connection
            this.selectDevice(device);
        } catch (error) {
            devicesList.innerHTML = `<div class="empty-state"><p>${error.message}</p></div>`;
            this.showError(error.message);
        } finally {
            scanBtn.disabled = false;
            scanProgress.classList.add('hidden');
        }
    }

    selectDevice(device) {
        this.connectedDevice = device;
        
        // Show connection screen
        this.showScreen('connection');
        this.connectToDevice(device);
    }

    async connectToDevice(device) {
        const connectionStatus = document.getElementById('connection-status');
        const deviceName = document.getElementById('connected-device-name');
        const deviceId = document.getElementById('connected-device-id');
        const proceedBtn = document.getElementById('proceed-btn');

        deviceName.textContent = device.name;
        deviceId.textContent = `ID: ${device.id}`;

        connectionStatus.className = 'status-indicator connecting';
        connectionStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Connecting...</span>';
        proceedBtn.disabled = true;

        try {
            await this.bluetoothManager.connect(device);

            connectionStatus.className = 'status-indicator connected';
            connectionStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Connected</span>';
            proceedBtn.disabled = false;
        } catch (error) {
            connectionStatus.className = 'status-indicator disconnected';
            connectionStatus.innerHTML = '<span class="status-dot"></span><span class="status-text">Connection Failed</span>';
            this.showError(error.message);
        }
    }

    handleBluetoothConnected(device) {
        console.log('Bluetooth connected:', device);
        this.connectedDevice = device;
        
        // Perform key exchange
        this.performKeyExchange();
    }

    async performKeyExchange() {
        try {
            // Export our public key
            const publicKey = await this.cryptoManager.exportPublicKey();
            
            // In a real implementation, we would send this to the peer
            // For simulation, we'll just proceed
            console.log('Public key exported for key exchange');
            
            // Simulate receiving peer's public key
            // In real implementation, this would come from the peer device
            if (this.useSimulation) {
                // Use the same key for simulation (both sides have same keys)
                await this.cryptoManager.importPeerPublicKey(publicKey);
            }
            
            // Derive shared secret and session key
            await this.cryptoManager.deriveSharedSecret();
            await this.cryptoManager.deriveSessionKey();
            
            console.log('Key exchange completed');
        } catch (error) {
            console.error('Key exchange failed:', error);
            this.showError('Key exchange failed: ' + error.message);
        }
    }

    handleBluetoothDisconnected() {
        console.log('Bluetooth disconnected');
        this.connectedDevice = null;
        this.isDeviceVerified = false;
        this.showScreen('welcome');
        this.showError('Device disconnected');
    }

    proceedToVerification() {
        this.showScreen('verification');
        this.generateSecurityCode();
    }

    async generateSecurityCode() {
        try {
            const securityCode = await this.cryptoManager.generateSecurityCode();
            document.getElementById('your-security-code').textContent = securityCode;
        } catch (error) {
            this.showError('Failed to generate security code: ' + error.message);
        }
    }

    async verifyDevice() {
        const partnerCode = document.getElementById('partner-code').value.trim();
        const yourCode = document.getElementById('your-security-code').textContent;
        const verificationResult = document.getElementById('verification-result');
        const resultMessage = verificationResult.querySelector('.result-message');

        if (!partnerCode) {
            this.showError('Please enter the partner\'s security code');
            return;
        }

        verificationResult.classList.remove('hidden', 'success', 'error');

        // Verify codes match
        const isVerified = this.cryptoManager.verifySecurityCode(yourCode, partnerCode);

        if (isVerified) {
            this.isDeviceVerified = true;
            verificationResult.classList.add('success');
            resultMessage.textContent = '✓ Device verified successfully!';
            
            // Update security status
            document.getElementById('verification-status-item').textContent = '✓ Verified';
            document.getElementById('verification-status-item').classList.add('enabled');
            
            // Proceed to chat after delay
            setTimeout(() => {
                this.showScreen('chat');
                this.updateChatHeader();
            }, 1500);
        } else {
            this.isDeviceVerified = false;
            verificationResult.classList.add('error');
            resultMessage.textContent = '⚠️ Verification failed. Codes do not match.';
        }
    }

    cancelVerification() {
        this.disconnect();
        this.showScreen('scan');
    }

    async disconnect() {
        await this.bluetoothManager.disconnect();
        this.connectedDevice = null;
        this.isDeviceVerified = false;
        this.cryptoManager.cleanup();
        this.showScreen('welcome');
    }

    updateChatHeader() {
        if (this.connectedDevice) {
            document.getElementById('chat-device-name').textContent = this.connectedDevice.name;
        }
    }

    async sendMessage() {
        const messageInput = document.getElementById('message-input');
        const message = messageInput.value.trim();

        if (!message) return;

        if (!this.cryptoManager.isReady()) {
            this.showError('Encryption not ready. Please verify device first.');
            return;
        }

        try {
            // Encrypt message
            const encryptedData = await this.cryptoManager.encryptMessage(message);
            
            // Add to local messages
            this.addMessage(message, 'outgoing');
            
            // Send encrypted data
            const payload = JSON.stringify({
                type: 'message',
                data: encryptedData,
                timestamp: Date.now()
            });

            await this.bluetoothManager.sendData(payload);

            // Clear input
            messageInput.value = '';
            document.getElementById('send-btn').disabled = true;
        } catch (error) {
            this.showError('Failed to send message: ' + error.message);
            // Mark message as failed
            this.updateMessageStatus(this.messages.length - 1, 'failed');
        }
    }

    async handleMessageReceived(data) {
        console.log('Message received:', data);

        if (data.type === 'message') {
            try {
                // Decrypt message
                const decryptedMessage = await this.cryptoManager.decryptMessage(data.data);
                this.addMessage(decryptedMessage, 'incoming');
            } catch (error) {
                console.error('Failed to decrypt message:', error);
                this.showError('Failed to decrypt received message');
            }
        }
    }

    addMessage(text, direction) {
        const messagesContainer = document.getElementById('messages-container');
        
        // Remove empty state if present
        const emptyChat = messagesContainer.querySelector('.empty-chat');
        if (emptyChat) {
            emptyChat.remove();
        }

        const message = document.createElement('div');
        message.className = `message ${direction}`;
        
        const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        message.innerHTML = `
            <div class="message-text">${this.escapeHtml(text)}</div>
            <div class="message-time">
                ${time}
                ${direction === 'outgoing' ? '<span class="message-status sent">✓</span>' : ''}
            </div>
        `;

        messagesContainer.appendChild(message);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

        // Store message
        this.messages.push({
            text,
            direction,
            time,
            status: direction === 'outgoing' ? 'sent' : null
        });
    }

    updateMessageStatus(index, status) {
        const messages = document.querySelectorAll('.message.outgoing');
        if (messages[index]) {
            const statusElement = messages[index].querySelector('.message-status');
            if (statusElement) {
                statusElement.className = `message-status ${status}`;
                statusElement.textContent = status === 'failed' ? '✗' : '✓';
            }
        }
    }

    clearChat() {
        if (confirm('Are you sure you want to clear the conversation?')) {
            const messagesContainer = document.getElementById('messages-container');
            messagesContainer.innerHTML = `
                <div class="empty-chat">
                    <div class="empty-icon">🔐</div>
                    <p>Start a secure conversation</p>
                    <p class="empty-subtext">Messages are encrypted before transmission</p>
                </div>
            `;
            this.messages = [];
        }
    }

    showSecurityModal() {
        document.getElementById('security-modal').classList.remove('hidden');
    }

    hideSecurityModal() {
        document.getElementById('security-modal').classList.add('hidden');
    }

    showError(message) {
        const errorToast = document.getElementById('error-toast');
        const errorMessage = document.getElementById('error-message');
        
        errorMessage.textContent = message;
        errorToast.classList.remove('hidden');

        // Auto-hide after 5 seconds
        setTimeout(() => {
            this.hideError();
        }, 5000);
    }

    hideError() {
        document.getElementById('error-toast').classList.add('hidden');
    }

    handleError(error) {
        console.error('Bluetooth error:', error);
        this.showError(error.message || 'An error occurred');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.app = new SecureChatApp();
});
