// SafeSarthi - Emergency Safety Assistant
// College Mini Project - JavaScript Functionality

// ============================================
// LOCAL STORAGE KEYS
// ============================================
const STORAGE_KEYS = {
    CONTACTS: 'safesarthi_contacts',
    HISTORY: 'safesarthi_history',
    SETTINGS: 'safesarthi_settings',
    CACHED_LOCATION: 'safesarthi_cached_location'
};

// ============================================
// GLOBAL VARIABLES
// ============================================
let currentLocation = null;
let countdownInterval = null;
let recognition = null;
let isOnline = navigator.onLine;

// ============================================
// HELPER FUNCTIONS
// ============================================
function sendSMS(phoneNumber, message) {
    // Use sms: URL scheme to open native messaging app
    // Try different formats for mobile compatibility
    const smsUrl = `sms:${phoneNumber}&body=${message}`;
    console.log('SMS URL:', smsUrl);
    console.log('Message length:', message.length);
    window.location.href = smsUrl;
}

// ============================================
// INITIALIZATION
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    // Initialize based on current page
    initializePage();
    
    // Setup online/offline listeners
    setupNetworkListeners();
    
    // Initialize voice recognition if on home page
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        initializeVoiceRecognition();
    }
    
    // Load settings
    loadSettings();
});

// ============================================
// PAGE INITIALIZATION
// ============================================
function initializePage() {
    const currentPage = window.location.pathname;
    
    if (currentPage.endsWith('index.html') || currentPage === '/') {
        initializeHomePage();
    } else if (currentPage.endsWith('contacts.html')) {
        initializeContactsPage();
    } else if (currentPage.endsWith('history.html')) {
        initializeHistoryPage();
    } else if (currentPage.endsWith('settings.html')) {
        initializeSettingsPage();
    }
}

// ============================================
// LOCATION PERMISSION FUNCTIONS
// ============================================
function requestLocationPermission() {
    const modal = document.getElementById('locationPermissionModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function handleLocationPermission(allow) {
    const modal = document.getElementById('locationPermissionModal');
    if (modal) {
        modal.classList.remove('active');
    }
    
    // Update settings to remember user's choice
    const settings = getSettings();
    settings.locationPermissionAsked = true;
    settings.locationPermission = allow;
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    
    if (allow) {
        // Request browser location permission
        getCurrentLocation();
    }
}

// ============================================
// HOME PAGE FUNCTIONS
// ============================================
function initializeHomePage() {
    // Check if location permission has been granted
    const settings = getSettings();
    if (!settings.locationPermissionAsked) {
        // Show location permission request on first visit
        requestLocationPermission();
    } else {
        // Get initial location if permission already granted
        getCurrentLocation();
    }
    
    // Setup SOS button
    const sosButton = document.getElementById('sosButton');
    if (sosButton) {
        sosButton.addEventListener('click', handleSOSButton);
    }
    
    // Setup voice button
    const voiceButton = document.getElementById('voiceButton');
    if (voiceButton) {
        voiceButton.addEventListener('click', handleVoiceButton);
    }
    
    // Setup modal buttons
    setupModalButtons();
    
    // Update connection status
    updateConnectionStatus();
}

function handleSOSButton() {
    // Directly trigger emergency alert without countdown
    triggerEmergencyAlert('SOS Button');
}

function handleVoiceButton() {
    if (!recognition) {
        document.getElementById('voiceStatus').textContent = 
            'Voice recognition is not supported in this browser. Please use the SOS button.';
        return;
    }
    
    const voiceButton = document.getElementById('voiceButton');
    const voiceStatus = document.getElementById('voiceStatus');
    
    if (voiceButton.classList.contains('listening')) {
        recognition.stop();
        return;
    }
    
    voiceButton.classList.add('listening');
    voiceButton.textContent = 'STOP LISTENING';
    voiceStatus.textContent = '🎤 Listening...';
    
    recognition.start();
}

function initializeVoiceRecognition() {
    // Check if browser supports speech recognition
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
        const voiceStatus = document.getElementById('voiceStatus');
        if (voiceStatus) {
            voiceStatus.textContent = 
                'Voice recognition is not supported in this browser. Please use the SOS button.';
        }
        return;
    }
    
    recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    
    recognition.onresult = function(event) {
        const transcript = event.results[0][0].transcript.toLowerCase();
        const voiceStatus = document.getElementById('voiceStatus');
        
        if (transcript.includes('help') || transcript.includes('help me')) {
            voiceStatus.textContent = 'HELP DETECTED! 🚨 Emergency alert triggered.';
            
            // Stop recognition
            recognition.stop();
            
            // Trigger emergency alert after short delay
            setTimeout(() => {
                triggerEmergencyAlert('Voice HELP');
            }, 1000);
        } else {
            voiceStatus.textContent = 'Not recognized. Please say "HELP".';
        }
    };
    
    recognition.onerror = function(event) {
        const voiceStatus = document.getElementById('voiceStatus');
        voiceStatus.textContent = 'Error: ' + event.error;
        resetVoiceButton();
    };
    
    recognition.onend = function() {
        resetVoiceButton();
    };
}

function resetVoiceButton() {
    const voiceButton = document.getElementById('voiceButton');
    if (voiceButton) {
        voiceButton.classList.remove('listening');
        voiceButton.textContent = 'START LISTENING';
    }
}

function setupModalButtons() {
    // Send Now button
    const sendNowButton = document.getElementById('sendNowButton');
    if (sendNowButton) {
        sendNowButton.addEventListener('click', () => {
            clearInterval(countdownInterval);
            triggerEmergencyAlert('SOS Button');
        });
    }
    
    // Cancel button
    const cancelButton = document.getElementById('cancelButton');
    if (cancelButton) {
        cancelButton.addEventListener('click', cancelSOS);
    }
    
    // Close Alert button
    const closeAlertButton = document.getElementById('closeAlertButton');
    if (closeAlertButton) {
        closeAlertButton.addEventListener('click', closeAlertModal);
    }
    
    // Cancel Alert button (for compact modal)
    const cancelAlertButton = document.getElementById('cancelAlertButton');
    if (cancelAlertButton) {
        cancelAlertButton.addEventListener('click', closeAlertModal);
    }
    
    // Location Permission buttons
    const allowLocationButton = document.getElementById('allowLocationButton');
    if (allowLocationButton) {
        allowLocationButton.addEventListener('click', () => handleLocationPermission(true));
    }
    
    const denyLocationButton = document.getElementById('denyLocationButton');
    if (denyLocationButton) {
        denyLocationButton.addEventListener('click', () => handleLocationPermission(false));
    }
    
    // Retry Location button
    const retryLocationButton = document.getElementById('retryLocationButton');
    if (retryLocationButton) {
        retryLocationButton.addEventListener('click', retryLocation);
    }
}

function cancelSOS() {
    clearInterval(countdownInterval);
    const modal = document.getElementById('sosModal');
    modal.classList.remove('active');
}

function closeAlertModal() {
    const modal = document.getElementById('alertModal');
    modal.classList.remove('active');
}

function retryLocation() {
    console.log('Retrying location...');
    const retryButton = document.getElementById('retryLocationButton');
    retryButton.textContent = '📍 Getting location...';
    retryButton.disabled = true;
    
    getCurrentLocationWithRetry().then(() => {
        console.log('✓ Location obtained on retry:', currentLocation);
        
        // Update the alert modal with location
        const mapLink = document.getElementById('alertMapLink');
        if (mapLink && currentLocation) {
            const mapUrl = `https://www.google.com/maps?q=${currentLocation.latitude},${currentLocation.longitude}`;
            mapLink.href = mapUrl;
            mapLink.innerHTML = 'View on Google Maps';
        }
        
        // Send SMS with location
        const contacts = getContacts();
        const settings = getSettings();
        
        let locationText = '';
        if (currentLocation && currentLocation.latitude && currentLocation.longitude) {
            locationText = ` Location: https://maps.google.com/?q=${currentLocation.latitude},${currentLocation.longitude}`;
        }
        
        const fullMessage = settings.message + locationText;
        const encodedMessage = encodeURIComponent(fullMessage);
        
        contacts.forEach((contact, index) => {
            setTimeout(() => {
                sendSMS(contact.phone, encodedMessage);
            }, index * 500);
        });
        
        // Hide retry button
        retryButton.style.display = 'none';
        retryButton.textContent = '📍 Retry Location';
        retryButton.disabled = false;
        
        // Update SMS container
        const smsButtonsContainer = document.getElementById('smsButtonsContainer');
        smsButtonsContainer.innerHTML = `
            <h3>📱 SMS sent to ${contacts.length} contact(s) with location</h3>
        `;
        
    }).catch((error) => {
        console.log('✗ Location retry failed:', error);
        retryButton.textContent = '📍 Retry Location';
        retryButton.disabled = false;
        alert('Could not get location. Please enable location permissions in your browser settings and try again.');
    });
}


// ============================================
// EMERGENCY ALERT FUNCTIONS
// ============================================
function triggerEmergencyAlert(triggerMethod) {
    // Close countdown modal
    const sosModal = document.getElementById('sosModal');
    sosModal.classList.remove('active');
    
    // Get current location with retry for mobile
    getCurrentLocationWithRetry().then(() => {
        // Get contacts
        const contacts = getContacts();
        const settings = getSettings();
        
        // Create alert data
        const alertData = {
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            trigger: triggerMethod,
            location: currentLocation,
            message: settings.message || 'I need help. Please contact me immediately.',
            status: isOnline ? 'Alert Created' : 'Alert Created (Offline)'
        };
        
        // Show alert modal
        showAlertModal(contacts, alertData);
        
        // Save to history
        saveToHistory(alertData);
    }).catch(() => {
        // Location failed - show permission modal to request it
        console.log('Location failed, showing permission modal');
        requestLocationPermission();
        
        // Still proceed with alert without location
        const contacts = getContacts();
        const settings = getSettings();
        
        const alertData = {
            date: new Date().toLocaleDateString(),
            time: new Date().toLocaleTimeString(),
            trigger: triggerMethod,
            location: null,
            message: settings.message || 'I need help. Please contact me immediately.',
            status: isOnline ? 'Alert Created' : 'Alert Created (Offline)'
        };
        
        showAlertModal(contacts, alertData);
        saveToHistory(alertData);
    });
}

function getCurrentLocationWithRetry(maxRetries = 3) {
    return new Promise((resolve, reject) => {
        let retryCount = 0;
        
        function attemptLocation() {
            getCurrentLocation()
                .then((location) => {
                    if (location) {
                        resolve(location);
                    } else if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Location retry ${retryCount}/${maxRetries}`);
                        setTimeout(attemptLocation, 1000); // Retry after 1 second
                    } else {
                        reject(new Error('Max retries reached'));
                    }
                })
                .catch((error) => {
                    if (retryCount < maxRetries) {
                        retryCount++;
                        console.log(`Location retry ${retryCount}/${maxRetries} after error:`, error.message);
                        setTimeout(attemptLocation, 1000);
                    } else {
                        reject(error);
                    }
                });
        }
        
        attemptLocation();
    });
}

function showAlertModal(contacts, alertData) {
    const modal = document.getElementById('alertModal');
    const compactContactInfo = document.getElementById('compactContactInfo');
    const compactMessage = document.getElementById('compactMessage');
    const mapLink = document.getElementById('alertMapLink');
    const smsButtonsContainer = document.getElementById('smsButtonsContainer');
    const retryLocationButton = document.getElementById('retryLocationButton');
    
    console.log('=== ALERT DATA ===');
    console.log('Alert data:', alertData);
    console.log('Location:', alertData.location);
    console.log('Current location global:', currentLocation);
    
    // Show retry button if location is not available
    if (!alertData.location) {
        retryLocationButton.style.display = 'block';
    } else {
        retryLocationButton.style.display = 'none';
    }
    
    // Display contact info in compact format
    if (contacts.length === 0) {
        compactContactInfo.textContent = 'No contacts';
        smsButtonsContainer.innerHTML = '';
    } else {
        // Show first contact in compact format
        const firstContact = contacts[0];
        compactContactInfo.textContent = `${firstContact.name} • ${firstContact.phone}`;
        
        if (contacts.length > 1) {
            compactContactInfo.textContent += ` (+${contacts.length - 1} more)`;
        }
        
        // Automatically send SMS to all contacts
        let locationText = '';
        if (alertData.location && alertData.location.latitude && alertData.location.longitude) {
            locationText = ` Location: https://maps.google.com/?q=${alertData.location.latitude},${alertData.location.longitude}`;
            console.log('✓ Location included in SMS:', locationText);
        } else {
            console.warn('✗ Location NOT available for SMS');
            console.warn('alertData.location:', alertData.location);
        }
        
        const fullMessage = alertData.message + locationText;
        console.log('Full message before encoding:', fullMessage);
        const encodedMessage = encodeURIComponent(fullMessage);
        console.log('Encoded message length:', encodedMessage.length);
        
        // Send SMS to each contact
        contacts.forEach((contact, index) => {
            setTimeout(() => {
                console.log(`Sending SMS to ${contact.phone}`);
                sendSMS(contact.phone, encodedMessage);
            }, index * 500); // Stagger SMS sending by 500ms
        });
        
        smsButtonsContainer.innerHTML = `
            <h3>📱 SMS sent to ${contacts.length} contact(s)</h3>
        `;
    }
    
    // Display message
    compactMessage.textContent = alertData.message;
    
    // Create Google Maps link
    if (alertData.location) {
        const mapUrl = `https://www.google.com/maps?q=${alertData.location.latitude},${alertData.location.longitude}`;
        mapLink.href = mapUrl;
        mapLink.innerHTML = 'View on Google Maps';
    } else {
        mapLink.href = '#';
        mapLink.innerHTML = 'Location not available';
    }
    
    // Show modal
    modal.classList.add('active');
}


// ============================================
// GEOLOCATION FUNCTIONS
// ============================================
function getCurrentLocation() {
    return new Promise((resolve, reject) => {
        console.log('=== GETTING LOCATION ===');
        const settings = getSettings();
        
        // Check if location permission is remembered and we have cached location
        if (settings.locationPermission) {
            const cachedLocation = localStorage.getItem(STORAGE_KEYS.CACHED_LOCATION);
            if (cachedLocation) {
                try {
                    const parsedLocation = JSON.parse(cachedLocation);
                    // Check if cached location is less than 5 minutes old
                    const cacheAge = Date.now() - parsedLocation.timestamp;
                    if (cacheAge < 300000) { // 5 minutes
                        currentLocation = {
                            latitude: parsedLocation.latitude,
                            longitude: parsedLocation.longitude
                        };
                        console.log('✓ Using cached location:', currentLocation);
                        
                        const locationStatus = document.getElementById('locationStatus');
                        if (locationStatus) {
                            locationStatus.innerHTML = '📍 Location Available';
                        }
                        
                        resolve(currentLocation);
                        return;
                    }
                } catch (e) {
                    console.log('Invalid cache, getting fresh location');
                    // Invalid cache, continue to get fresh location
                }
            }
        }
        
        // Get fresh location
        if (!navigator.geolocation) {
            console.log('✗ Geolocation is not supported by this browser.');
            reject('Geolocation not supported');
            return;
        }
        
        console.log('Requesting fresh GPS location...');
        const options = {
            enableHighAccuracy: true,  // Required for mobile GPS
            timeout: 15000,            // 15 seconds timeout for mobile GPS
            maximumAge: 0             // Don't use cached position
        };
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                currentLocation = {
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                };
                console.log('✓ Fresh location obtained:', currentLocation);
                console.log('Position coords:', position.coords);
                
                // Cache the location if permission is remembered
                if (settings.locationPermission) {
                    localStorage.setItem(STORAGE_KEYS.CACHED_LOCATION, JSON.stringify({
                        latitude: currentLocation.latitude,
                        longitude: currentLocation.longitude,
                        timestamp: Date.now()
                    }));
                }
                
                // Update location display
                const locationStatus = document.getElementById('locationStatus');
                if (locationStatus) {
                    locationStatus.innerHTML = '📍 Location Available';
                }
                
                resolve(currentLocation);
            },
            (error) => {
                console.log('✗ Error getting location:', error.message);
                console.log('Error code:', error.code);
                console.log('Error details:', error);
                const locationStatus = document.getElementById('locationStatus');
                if (locationStatus) {
                    locationStatus.innerHTML = '📍 Location Not Available';
                }
                reject(error);
            },
            options
        );
    });
}

// ============================================
// NETWORK STATUS FUNCTIONS
// ============================================
function setupNetworkListeners() {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

function handleOnline() {
    isOnline = true;
    updateConnectionStatus();
    
    // Process pending alerts
    processPendingAlerts();
}

function handleOffline() {
    isOnline = false;
    updateConnectionStatus();
}

function updateConnectionStatus() {
    const statusElement = document.getElementById('connectionStatus');
    if (statusElement) {
        if (isOnline) {
            statusElement.innerHTML = '🟢 Online';
        } else {
            statusElement.innerHTML = '🔴 Offline';
        }
    }
}

function processPendingAlerts() {
    // SMS works offline, so no need to process pending alerts
    // This function is kept for compatibility but does nothing
}

// ============================================
// CONTACTS PAGE FUNCTIONS
// ============================================
function initializeContactsPage() {
    loadContacts();
    
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', handleAddContact);
    }
}

function handleAddContact(event) {
    event.preventDefault();
    
    const name = document.getElementById('contactName').value.trim();
    const phone = document.getElementById('contactPhone').value.trim();
    const relation = document.getElementById('contactRelation').value.trim();
    
    if (!name || !phone || !relation) {
        alert('Please fill in all fields.');
        return;
    }
    
    const contacts = getContacts();
    const newContact = {
        id: Date.now(),
        name: name,
        phone: phone,
        relation: relation
    };
    
    contacts.push(newContact);
    saveContacts(contacts);
    
    // Clear form
    document.getElementById('contactForm').reset();
    
    // Reload contacts display
    loadContacts();
}

function getContacts() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.CONTACTS) || '[]');
}

function saveContacts(contacts) {
    localStorage.setItem(STORAGE_KEYS.CONTACTS, JSON.stringify(contacts));
}

function loadContacts() {
    const contacts = getContacts();
    const container = document.getElementById('contactsContainer');
    
    if (contacts.length === 0) {
        container.innerHTML = '<p class="no-contacts">No emergency contacts added yet.</p>';
        return;
    }
    
    container.innerHTML = contacts.map(contact => `
        <div class="contact-item-list">
            <h4>👤 ${contact.name}</h4>
            <p>📞 ${contact.phone}</p>
            <p>🔗 ${contact.relation}</p>
            <div class="contact-actions">
                <button class="btn-edit" onclick="editContact(${contact.id})">Edit</button>
                <button class="btn-delete" onclick="deleteContact(${contact.id})">Delete</button>
            </div>
        </div>
    `).join('');
}

function deleteContact(id) {
    if (!confirm('Are you sure you want to delete this contact?')) {
        return;
    }
    
    const contacts = getContacts();
    const filteredContacts = contacts.filter(contact => contact.id !== id);
    saveContacts(filteredContacts);
    loadContacts();
}

function editContact(id) {
    const contacts = getContacts();
    const contact = contacts.find(c => c.id === id);
    
    if (contact) {
        document.getElementById('contactName').value = contact.name;
        document.getElementById('contactPhone').value = contact.phone;
        document.getElementById('contactRelation').value = contact.relation;
        
        // Remove the contact so it can be updated
        deleteContact(id);
    }
}

// ============================================
// HISTORY PAGE FUNCTIONS
// ============================================
function initializeHistoryPage() {
    loadHistory();
    
    const clearButton = document.getElementById('clearHistoryButton');
    if (clearButton) {
        clearButton.addEventListener('click', clearHistory);
    }
}

function getHistory() {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.HISTORY) || '[]');
}

function saveToHistory(alertData) {
    const history = getHistory();
    history.unshift(alertData); // Add to beginning
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
}

function loadHistory() {
    const history = getHistory();
    const container = document.getElementById('historyContainer');
    
    if (history.length === 0) {
        container.innerHTML = '<p class="no-history">No alert history yet.</p>';
        return;
    }
    
    container.innerHTML = history.map(alert => `
        <div class="history-item">
            <p class="history-date">� SOS Alert</p>
            <p>${alert.date} • ${alert.time}</p>
            <p>📍 ${alert.location ? 'Location Available' : 'Location Not Available'}</p>
            <p class="${alert.status.includes('Pending') ? 'history-pending' : 'history-status'}">
                ✓ ${alert.status}
            </p>
        </div>
    `).join('');
}

function clearHistory() {
    if (!confirm('Are you sure you want to clear all alert history?')) {
        return;
    }
    
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
    loadHistory();
}

// ============================================
// SETTINGS PAGE FUNCTIONS
// ============================================
function initializeSettingsPage() {
    loadSettingsToForm();
    
    const saveButton = document.getElementById('saveSettingsButton');
    if (saveButton) {
        saveButton.addEventListener('click', handleSaveSettings);
    }
}

function getSettings() {
    const defaultSettings = {
        voiceHelp: 'on',
        locationPermission: true,
        locationPermissionAsked: false,
        countdown: 5,
        message: 'I need help. Please contact me immediately.'
    };
    
    const savedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    return savedSettings ? JSON.parse(savedSettings) : defaultSettings;
}

function loadSettings() {
    // This function is called on page load to ensure settings are loaded
    getSettings();
}

function loadSettingsToForm() {
    const settings = getSettings();
    
    const voiceHelp = document.getElementById('voiceHelp');
    const locationPermission = document.getElementById('locationPermission');
    const countdown = document.getElementById('sosCountdown');
    const message = document.getElementById('emergencyMessage');
    
    if (voiceHelp) voiceHelp.checked = settings.voiceHelp === 'on';
    if (locationPermission) locationPermission.checked = settings.locationPermission;
    if (countdown) countdown.value = settings.countdown;
    if (message) message.value = settings.message;
}

function handleSaveSettings() {
    const voiceHelp = document.getElementById('voiceHelp').checked ? 'on' : 'off';
    const locationPermission = document.getElementById('locationPermission').checked;
    const countdown = parseInt(document.getElementById('sosCountdown').value);
    const message = document.getElementById('emergencyMessage').value.trim();
    
    const settings = {
        voiceHelp: voiceHelp,
        locationPermission: locationPermission,
        countdown: countdown,
        message: message
    };
    
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
    
    // Show success message
    const successMessage = document.getElementById('settingsSaved');
    successMessage.classList.add('show');
    
    // Hide success message after 3 seconds
    setTimeout(() => {
        successMessage.classList.remove('show');
    }, 3000);
}
