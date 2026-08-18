/**
 * Bluetooth Manager for Secure Bluetooth Chat
 * Handles device scanning, connection, and data transmission using Web Bluetooth API
 */

class BluetoothManager {
    constructor() {
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        this.isScanning = false;
        
        // Custom UUIDs for our chat service (using random UUIDs)
        this.SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
        this.CHARACTERISTIC_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
        
        // Event callbacks
        this.onDeviceFound = null;
        this.onConnected = null;
        this.onDisconnected = null;
        this.onMessageReceived = null;
        this.onError = null;
    }

    /**
     * Check if Web Bluetooth API is available
     */
    isAvailable() {
        return 'bluetooth' in navigator;
    }

    /**
     * Scan for nearby Bluetooth devices
     */
    async scanForDevices() {
        if (!this.isAvailable()) {
            throw new Error('Bluetooth is not available in this browser');
        }

        this.isScanning = true;

        try {
            // Request device - accept all devices to show browser picker
            this.device = await navigator.bluetooth.requestDevice({
                acceptAllDevices: true,
                optionalServices: [this.SERVICE_UUID]
            });

            this.isScanning = false;

            // Add event listeners
            this.device.addEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));

            // Return the actual device object
            return this.device;
        } catch (error) {
            this.isScanning = false;
            
            if (error.name === 'NotFoundError') {
                throw new Error('No device selected');
            } else if (error.name === 'NetworkError') {
                throw new Error('Bluetooth device not found or out of range');
            } else {
                throw new Error(`Bluetooth scan failed: ${error.message}`);
            }
        }
    }

    /**
     * Connect to a Bluetooth device
     */
    async connect(device) {
        if (!this.device) {
            throw new Error('No device available. Please scan for devices first.');
        }

        try {
            // Use the device object already stored from scan
            console.log('Connecting to GATT server...');
            this.server = await this.device.gatt.connect();
            
            // Verify the connection is actually established
            if (!this.server.connected) {
                throw new Error('GATT server connection failed');
            }

            // Try to get our custom service
            try {
                console.log('Getting service...');
                this.service = await this.server.getPrimaryService(this.SERVICE_UUID);

                // Get the characteristic
                console.log('Getting characteristic...');
                this.characteristic = await this.service.getCharacteristic(this.CHARACTERISTIC_UUID);

                // Start receiving notifications
                await this.characteristic.startNotifications();
                this.characteristic.addEventListener('characteristicvaluechanged', this.handleMessageReceived.bind(this));
            } catch (serviceError) {
                console.warn('Custom service not found on device:', serviceError);
                // Disconnect since device doesn't support our chat service
                this.device.gatt.disconnect();
                throw new Error('Device does not support the required chat service. Both devices need to run this application.');
            }

            this.isConnected = true;

            if (this.onConnected) {
                this.onConnected({
                    id: this.device.id,
                    name: this.device.name || 'Unknown Device'
                });
            }

            console.log('Bluetooth connected successfully');
            return true;
        } catch (error) {
            console.error('Bluetooth connection failed:', error);
            this.isConnected = false;
            
            if (error.name === 'NetworkError') {
                throw new Error('Failed to connect to device - it may be out of range or already connected to another app');
            } else {
                throw new Error(`Connection failed: ${error.message}`);
            }
        }
    }

    /**
     * Disconnect from the current device
     */
    async disconnect() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;

        console.log('Bluetooth disconnected');
    }

    /**
     * Handle disconnection event
     */
    handleDisconnect(event) {
        console.log('Device disconnected');
        this.isConnected = false;
        
        if (this.onDisconnected) {
            this.onDisconnected();
        }
    }

    /**
     * Send data over Bluetooth
     * @param {string} data - JSON stringified data to send
     */
    async sendData(data) {
        if (!this.isConnected || !this.characteristic) {
            throw new Error('Not connected to a device');
        }

        try {
            const encoder = new TextEncoder();
            const dataArray = encoder.encode(data);

            // Split data into chunks if needed (MTU is typically 20-512 bytes)
            const chunkSize = 20; // Conservative chunk size
            for (let i = 0; i < dataArray.length; i += chunkSize) {
                const chunk = dataArray.slice(i, i + chunkSize);
                await this.characteristic.writeValue(chunk);
                // Small delay between chunks
                await new Promise(resolve => setTimeout(resolve, 10));
            }

            console.log('Data sent successfully');
            return true;
        } catch (error) {
            console.error('Failed to send data:', error);
            throw new Error(`Failed to send data: ${error.message}`);
        }
    }

    /**
     * Handle incoming message from Bluetooth
     */
    handleMessageReceived(event) {
        const value = event.target.value;
        const decoder = new TextDecoder();
        const data = decoder.decode(value);

        console.log('Data received:', data);

        if (this.onMessageReceived) {
            try {
                const parsedData = JSON.parse(data);
                this.onMessageReceived(parsedData);
            } catch (error) {
                console.error('Failed to parse received data:', error);
                // Send raw data if parsing fails
                this.onMessageReceived({ raw: data });
            }
        }
    }


    /**
     * Get connection status
     */
    getConnectionStatus() {
        return {
            isConnected: this.isConnected,
            device: this.device ? {
                id: this.device.id,
                name: this.device.name
            } : null
        };
    }

    /**
     * Set event callbacks
     */
    setCallbacks(callbacks) {
        if (callbacks.onDeviceFound) this.onDeviceFound = callbacks.onDeviceFound;
        if (callbacks.onConnected) this.onConnected = callbacks.onConnected;
        if (callbacks.onDisconnected) this.onDisconnected = callbacks.onDisconnected;
        if (callbacks.onMessageReceived) this.onMessageReceived = callbacks.onMessageReceived;
        if (callbacks.onError) this.onError = callbacks.onError;
    }

    /**
     * Clean up resources
     */
    cleanup() {
        if (this.isConnected) {
            this.disconnect();
        }
        
        if (this.device) {
            this.device.removeEventListener('gattserverdisconnected', this.handleDisconnect.bind(this));
        }
        
        if (this.characteristic) {
            this.characteristic.removeEventListener('characteristicvaluechanged', this.handleMessageReceived.bind(this));
        }

        this.onDeviceFound = null;
        this.onConnected = null;
        this.onDisconnected = null;
        this.onMessageReceived = null;
        this.onError = null;
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = BluetoothManager;
}
