# Secure Bluetooth Chat

A modern, professional Bluetooth-based end-to-end encrypted messaging application that allows two nearby devices to connect directly over Bluetooth and exchange text messages without requiring the internet.

## Features

### 🔐 End-to-End Encryption
- **AES-256-GCM** encryption for message confidentiality
- **ECDH (Elliptic Curve Diffie-Hellman)** key exchange for secure key establishment
- Authenticated encryption with message integrity protection
- Unique nonces/IVs for each encrypted message
- Replay protection using message counters
- Ephemeral session keys for forward secrecy

### 📡 Bluetooth Connection
- Scan for nearby Bluetooth devices
- Connect/disconnect functionality
- Real-time connection status indicators
- Automatic disconnection handling

### 🔒 Device Verification
- Security fingerprint/code generation for both devices
- Manual code comparison for man-in-the-middle attack prevention
- Verification status tracking

### 💬 Secure Chat Interface
- Modern glassmorphism design
- Dark navy/black cybersecurity theme
- Responsive design for mobile, tablet, and desktop
- Real-time message encryption and decryption
- Message timestamps and delivery status
- Clear conversation functionality

### 🛡️ Security Information
- Detailed security panel showing:
  - Encryption status
  - Connection type
  - Key exchange method
  - Device verification status
  - Session security
  - Message encryption status

## Technology Stack

- **HTML5** - Structure and layout
- **CSS3** - Modern styling with glassmorphism effects
- **JavaScript (ES6+)** - Application logic
- **Web Bluetooth API** - Bluetooth device communication
- **Web Crypto API** - Cryptographic operations

## Security Architecture

### Encryption Flow
1. **Key Generation**: ECDH key pair generated on each device
2. **Key Exchange**: Public keys exchanged over Bluetooth
3. **Shared Secret**: ECDH used to derive shared secret
4. **Session Key**: HKDF derives AES-256-GCM session key from shared secret
5. **Message Encryption**: Each message encrypted with unique nonce
6. **Message Decryption**: Receiver decrypts using session key and nonce

### Security Guarantees
- ✅ Messages encrypted before transmission
- ✅ No plaintext messages sent over Bluetooth
- ✅ No encryption keys stored in localStorage
- ✅ No keys exposed in UI
- ✅ Authenticated encryption (AES-256-GCM)
- ✅ Replay attack protection
- ✅ Secure random number generation
- ✅ Proper key cleanup on session end

## Installation

### Prerequisites
- A modern web browser that supports:
  - Web Bluetooth API (Chrome, Edge, Opera)
  - Web Crypto API (all modern browsers)

### Setup
1. Clone or download this repository
2. Open `index.html` in a supported web browser
3. Grant Bluetooth permissions when prompted

**Note**: Web Bluetooth API requires HTTPS or localhost. For local development, use a local server.

### Running Locally
```bash
# Using Python 3
python -m http.server 8000

# Using Node.js (with http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then open `http://localhost:8000` in your browser.

## Usage

### 1. Start the Application
- Click "Start Secure Chat" on the welcome screen

### 2. Scan for Devices
- Click "Scan for Devices" to find nearby Bluetooth devices
- Select a device from the list to connect

### 3. Establish Connection
- Wait for the connection to be established
- Connection status will show as "Connected" when successful

### 4. Verify Device
- Compare the security codes on both devices
- Enter your partner's security code
- Click "Verify Device" to confirm
- Proceed to chat only after successful verification

### 5. Secure Chat
- Type your message in the input field
- Press Enter or click the send button
- Messages are automatically encrypted before transmission
- Incoming messages are decrypted and displayed

### 6. View Security Information
- Click the shield icon (🛡️) in the chat header
- View detailed security information about the connection

## Platform Limitations

### Web Bluetooth API
The Web Bluetooth API has certain limitations:
- **Browser Support**: Only available in Chrome, Edge, and Opera
- **HTTPS Required**: Requires HTTPS or localhost for security
- **User Gesture**: Device scanning must be triggered by user action
- **Central Role**: Web pages can only act as Bluetooth Central (cannot advertise as Peripheral)
- **GATT Only**: Only GATT (Generic Attribute Profile) services are accessible

### Simulation Mode
If Web Bluetooth API is not available, the application falls back to simulation mode for demonstration purposes. In simulation mode:
- Device scanning is simulated
- Connection is simulated
- Messages are encrypted/decrypted but not actually transmitted
- Useful for testing the UI and encryption flow

### Native Implementation
For production use on mobile devices, consider implementing a native application using:
- **Android**: Android Bluetooth API with similar encryption
- **iOS**: Core Bluetooth framework with similar encryption

The encryption module (`crypto.js`) can be reused in native implementations with minimal changes.

## File Structure

```
BLE/
├── index.html          # Main HTML structure
├── styles.css          # CSS styling with glassmorphism
├── crypto.js           # Encryption module (AES-256-GCM + ECDH)
├── bluetooth.js        # Bluetooth connection manager
├── app.js              # Main application controller
└── README.md           # This file
```

## Security Best Practices

### For Users
- Always verify security codes before chatting
- Only connect to trusted devices
- Be aware of your physical surroundings
- Disconnect when not in use

### For Developers
- Never hard-code encryption keys
- Never store private keys in localStorage
- Always use secure random number generation
- Validate all received encrypted packets
- Reject invalid authentication tags
- Implement proper error handling
- Clean up sensitive data on session end

## Troubleshooting

### Bluetooth Not Available
- Ensure you're using a supported browser (Chrome, Edge, Opera)
- Check if Bluetooth is enabled on your device
- Grant Bluetooth permissions when prompted

### No Devices Found
- Ensure the other device is in discoverable mode
- Check if devices are within Bluetooth range
- Try restarting Bluetooth on both devices

### Connection Failed
- Ensure the other device is running compatible software
- Check if the device is already connected to another device
- Try disconnecting and reconnecting

### Encryption Errors
- Refresh the page to reinitialize encryption
- Ensure both devices support Web Crypto API
- Check browser console for detailed error messages

## Development

### Adding New Features
- Modify `app.js` for UI logic
- Extend `crypto.js` for new cryptographic features
- Update `bluetooth.js` for Bluetooth functionality
- Adjust `styles.css` for styling changes

### Testing
- Use simulation mode for UI testing
- Test with real Bluetooth devices for integration testing
- Verify encryption/decryption with test vectors
- Test error handling and edge cases

## License

This project is provided as-is for educational and demonstration purposes.

## Disclaimer

This application is a demonstration of secure messaging principles. For production use, additional security audits, penetration testing, and hardening should be performed. The developers are not responsible for any security breaches or data loss resulting from the use of this software.

## Credits

Built with modern web technologies and cryptographic best practices.
- Encryption: Web Crypto API (AES-256-GCM, ECDH)
- Bluetooth: Web Bluetooth API
- Design: Glassmorphism with cybersecurity aesthetics
