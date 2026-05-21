// script.js

// App State
const state = {
    currentUser: null,
    currentTool: 'pen',
    currentColor: '#000000',
    brushSize: 3,
    isDrawing: false,
    isMuted: false,
    isVideoOff: false,
    whiteboardVisible: false,
    chatVisible: false,
    xp: 650,
    level: 5,
    streak: 7,
    currentWeekOffset: 0,
    selectedDate: new Date(),
    currentCallTutor: null,

};

// DOM Elements
const screens = {
    splash: document.getElementById('splash-screen'),
    auth: document.getElementById('auth-screen'),
    main: document.getElementById('main-screen'),
    call: document.getElementById('call-screen') // NEW: Added call screen
};

const views = {
    dashboard: document.getElementById('dashboard-view'),
    tutors: document.getElementById('tutors-view'),
    whiteboard: document.getElementById('whiteboard-view'),
    // videoCall removed from views - now it's a separate screen
    quests: document.getElementById('quests-view'),
    profile: document.getElementById('profile-view'),
    schedule: document.getElementById('schedule-view'),
    'all-sessions': document.getElementById('all-sessions-view')
};

// Canvas Setup
let canvas, ctx, callCanvas, callCtx;
let lastX = 0;
let lastY = 0;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
    setupEventListeners();
    setupCanvas();
    updateTimeGreeting();
    setupProfileListeners();
});

function initializeApp() {
    // Check for saved dark mode preference
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
        document.body.classList.add('dark-mode');
        // Update the toggle switch in profile if it exists
        const darkModeToggle = document.querySelector('.setting-item:has(.fa-moon) .toggle-switch');
        if (darkModeToggle) darkModeToggle.classList.add('active');
    }

    // Load saved profile
    loadSavedProfile();

    // Render dashboard upcoming sessions on initial load
    setTimeout(() => {
        renderDashboardUpcoming();
    }, 100);

    // Simulate loading
    setTimeout(() => {
        screens.splash.classList.remove('active');
        screens.auth.classList.add('active');
    }, 2500);
}

function setupEventListeners() {
    // Auth Tabs
    document.querySelectorAll('.auth-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            const targetTab = e.target.dataset.tab;
            switchAuthTab(targetTab);
        });
    });

    // Role Selection
    document.querySelectorAll('.role-option').forEach(option => {
        option.addEventListener('click', () => {
            document.querySelectorAll('.role-option').forEach(opt => opt.classList.remove('active'));
            option.classList.add('active');
            option.querySelector('input').checked = true;
        });
    });

    // Auth Forms
    document.getElementById('login-form').addEventListener('submit', handleLogin);
    document.getElementById('register-form').addEventListener('submit', handleRegister);

    // Bottom Navigation
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', () => {
            document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
            item.classList.add('active');
        });
    });

    // Subject Chips
    document.querySelectorAll('.subject-chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.subject-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
        });
    });

    // Canvas Events
    setupCanvasEvents();

    // Chat Input
    const chatInput = document.getElementById('chat-input-field');
    if (chatInput) {
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });
    }

    // Booking Form - add submit event listener (attach once)
    const bookingForm = document.getElementById('add-session-form');
    if (bookingForm) {
        bookingForm.addEventListener('submit', handleAddSession);
    }
}

function switchAuthTab(tab) {
    document.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.auth-form').forEach(f => f.classList.remove('active'));
    
    document.querySelector(`.auth-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`${tab}-form`).classList.add('active');
}

function handleLogin(e) {
    e.preventDefault();
    // Simulate login
    const email = e.target.querySelector('input[type="email"]').value;
    
    state.currentUser = {
        name: 'Alex Johnson',
        email: email,
        role: 'learner'
    };
    
    showToast('Welcome back, Alex!');
    setTimeout(() => {
        screens.auth.classList.remove('active');
        screens.main.classList.add('active');
        gainXP(50); // Login bonus
    }, 1000);
}

function handleRegister(e) {
    e.preventDefault();
    const name = e.target.querySelector('input[type="text"]').value;
    const role = e.target.querySelector('input[name="role"]:checked').value;
    
    state.currentUser = {
        name: name,
        email: e.target.querySelector('input[type="email"]').value,
        role: role
    };
    
    showToast('Account created successfully!');
    setTimeout(() => {
        screens.auth.classList.remove('active');
        screens.main.classList.add('active');
        gainXP(100); // Registration bonus
    }, 1000);
}






// ==========================================

function toggleNotification(type, element) {
    element.classList.toggle('active');
    const isActive = element.classList.contains('active');
    state.notifications[type] = isActive;

    // Save to localStorage
    localStorage.setItem('notifications', JSON.stringify(state.notifications));

    const labels = {
        lessons: 'Lesson Reminders',
        messages: 'New Messages',
        quests: 'Quest Updates',
        promos: 'Promotional Offers'
    };

    showToast(`${labels[type]} ${isActive ? 'enabled' : 'disabled'}`);
}

function loadNotificationSettings() {
    const saved = localStorage.getItem('notifications');
    if (saved) {
        state.notifications = JSON.parse(saved);

        // Update toggle states in modal
        const toggles = {
            lessons: document.getElementById('notif-lessons'),
            messages: document.getElementById('notif-messages'),
            quests: document.getElementById('notif-quests'),
            promos: document.getElementById('notif-promos')
        };

        for (const [type, el] of Object.entries(toggles)) {
            if (el) {
                el.classList.toggle('active', state.notifications[type]);
            }
        }
    }
}

function shouldNotify(type) {
    return state.notifications[type] !== false;
}

function sendNotification(title, body, type = 'general') {
    // Check if this notification type is enabled
    const typeMap = {
        'lesson': 'lessons',
        'message': 'messages',
        'quest': 'quests',
        'promo': 'promos'
    };

    if (!shouldNotify(typeMap[type] || type)) return;

    // Show in-app toast
    showToast(`${title}: ${body}`);

    // Update badge count on notification bell
    updateNotificationBadge();
}

let notificationCount = 0;

function updateNotificationBadge() {
    notificationCount++;
    const badge = document.querySelector('.notification-btn .badge');
    if (badge) {
        badge.textContent = notificationCount;
        badge.style.display = 'flex';
    }
}

function clearNotificationBadge() {
    notificationCount = 0;
    const badge = document.querySelector('.notification-btn .badge');
    if (badge) {
        badge.style.display = 'none';
    }
}

// Notification badge click
document.querySelector('.notification-btn')?.addEventListener('click', () => {
    showToast('No new notifications');
    const badge = document.querySelector('.badge');
    if (badge) badge.style.display = 'none';
});

function showNotificationPanel() {
    // Create a simple notification panel if it doesn't exist
    let panel = document.getElementById('notification-panel');
    if (!panel) {
        panel = document.createElement('div');
        panel.id = 'notification-panel';
        panel.className = 'notification-panel hidden';
        panel.innerHTML = `
            <div class="notification-panel-header">
                <h4>Notifications</h4>
                <button onclick="hideNotificationPanel()"><i class="fas fa-times"></i></button>
            </div>
            <div class="notification-list" id="notification-list">
                <div class="notification-empty">No new notifications</div>
            </div>
        `;
        document.getElementById('app').appendChild(panel);
    }
    panel.classList.remove('hidden');
}

function hideNotificationPanel() {
    const panel = document.getElementById('notification-panel');
    if (panel) panel.classList.add('hidden');
}

function addNotificationItem(title, body, time, icon = 'fa-bell') {
    const list = document.getElementById('notification-list');
    if (!list) return;

    const empty = list.querySelector('.notification-empty');
    if (empty) empty.remove();

    const item = document.createElement('div');
    item.className = 'notification-item';
    item.innerHTML = `
        <div class="notification-icon"><i class="fas ${icon}"></i></div>
        <div class="notification-content">
            <span class="notification-title">${title}</span>
            <span class="notification-body">${body}</span>
            <span class="notification-time">${time}</span>
        </div>
    `;
    list.insertBefore(item, list.firstChild);

    updateNotificationBadge();
}

// ==========================================
// SETTINGS MODAL FUNCTIONS
// ==========================================

function openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) {
        // Sync dark mode toggle state
        const darkModeToggle = document.getElementById('settings-dark-mode-toggle');
        if (darkModeToggle) {
            const isDark = document.body.classList.contains('dark-mode');
            darkModeToggle.classList.toggle('active', isDark);
        }
        modal.classList.remove('hidden');
    }
}

function closeSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (modal) modal.classList.add('hidden');
}

function toggleDarkModeFromSettings() {
    const isDark = document.body.classList.contains('dark-mode');
    const darkModeToggle = document.getElementById('settings-dark-mode-toggle');

    if (isDark) {
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
        if (darkModeToggle) darkModeToggle.classList.remove('active');
        showToast('Dark mode disabled');
    } else {
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
        if (darkModeToggle) darkModeToggle.classList.add('active');
        showToast('Dark mode enabled');
    }

    // Also sync the profile page toggle if it exists
    const profileToggle = document.querySelector('.setting-item:has(.fa-moon) .toggle-switch');
    if (profileToggle) {
        profileToggle.classList.toggle('active', !isDark);
    }
}

// ==========================================
// NOTIFICATIONS MODAL FUNCTIONS
// ==========================================

function openNotificationsModal() {
    document.getElementById('notifications-modal').classList.remove('hidden');
}

function closeNotificationsModal() {
    document.getElementById('notifications-modal').classList.add('hidden');
}

// ==========================================
// PRIVACY MODAL FUNCTIONS
// ==========================================

function openPrivacyModal() {
    document.getElementById('privacy-modal').classList.remove('hidden');
}

function closePrivacyModal() {
    document.getElementById('privacy-modal').classList.add('hidden');
}

// ==========================================
// SUBSCRIPTION MODAL FUNCTIONS
// ==========================================

function openSubscriptionModal() {
    document.getElementById('subscription-modal').classList.remove('hidden');
}

function closeSubscriptionModal() {
    document.getElementById('subscription-modal').classList.add('hidden');
}

// ==========================================
// ABOUT MODAL FUNCTIONS
// ==========================================

function openAboutModal() {
    document.getElementById('about-modal').classList.remove('hidden');
}

function closeAboutModal() {
    document.getElementById('about-modal').classList.add('hidden');
}

// ==========================================
// HELP MODAL FUNCTIONS
// ==========================================

function openHelpModal() {
    document.getElementById('help-modal').classList.remove('hidden');
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.add('hidden');
}

// ==========================================
// SETTINGS MODAL FUNCTIONS
// ==========================================

function openNotificationsModal() {
    document.getElementById('notifications-modal').classList.remove('hidden');
}

function closeNotificationsModal() {
    document.getElementById('notifications-modal').classList.add('hidden');
}

function openSubscriptionModal() {
    document.getElementById('subscription-modal').classList.remove('hidden');
}

function closeSubscriptionModal() {
    document.getElementById('subscription-modal').classList.add('hidden');
}

function openAboutModal() {
    document.getElementById('about-modal').classList.remove('hidden');
}

function closeAboutModal() {
    document.getElementById('about-modal').classList.add('hidden');
}

function openHelpModal() {
    document.getElementById('help-modal').classList.remove('hidden');
}

function closeHelpModal() {
    document.getElementById('help-modal').classList.add('hidden');
}

function openPrivacyModal() {
    document.getElementById('privacy-modal').classList.remove('hidden');
}

function closePrivacyModal() {
    document.getElementById('privacy-modal').classList.add('hidden');
}

// ==========================================
// SCREEN MANAGEMENT - NEW FUNCTIONS
// ==========================================

// Show a screen (splash, auth, main, call)
function showScreen(screenName) {
    // Hide all screens
    Object.values(screens).forEach(screen => {
        if (screen) screen.classList.remove('active');
    });
    
    // Show target screen
    const targetScreen = screens[screenName];
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

// View Management - FIXED WITH SCROLL TO TOP
function showView(viewName) {
    // Only works within main-screen
    if (!screens.main.classList.contains('active')) {
        return;
    }
    
    // Scroll to top of main content area FIRST
    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
        mainContent.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }
    
    // Also scroll window to top as backup
    window.scrollTo(0, 0);
    
    // Hide all views
    Object.values(views).forEach(view => {
        if (view) view.classList.remove('active');
    });
    
    // Show selected view
    if (views[viewName]) {
        views[viewName].classList.add('active');
    }
    
    // Update navigation
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach((item, index) => {
        item.classList.remove('active');
        const viewMap = ['dashboard', 'tutors', 'whiteboard', 'quests', 'profile'];
        if (viewMap[index] === viewName) {
            item.classList.add('active');
        }
    });
    
    // Special handling for specific views
    if (viewName === 'whiteboard') {
        setTimeout(resizeCanvas, 100);
    }
    
    if (viewName === 'profile') {
        animateProfileStats();
    }
}

// ==========================================
// CANVAS FUNCTIONS
// ==========================================

function setupCanvas() {
    canvas = document.getElementById('whiteboard-canvas');
    ctx = canvas.getContext('2d');
    
    callCanvas = document.getElementById('call-canvas');
    if (callCanvas) {
        callCtx = callCanvas.getContext('2d');
    }
    
    // Set initial canvas size
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
}

function resizeCanvas() {
    if (!canvas) return;
    
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = container.clientHeight;
    
    // Set default styles
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = state.currentColor;
    ctx.lineWidth = state.brushSize;
    
    if (callCanvas && callCanvas.parentElement) {
        const callContainer = callCanvas.parentElement;
        callCanvas.width = callContainer.clientWidth;
        callCanvas.height = callContainer.clientHeight;
        callCtx.lineCap = 'round';
        callCtx.lineJoin = 'round';
    }
}

function setupCanvasEvents() {
    if (!canvas) return;

    // Mouse events
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseout', stopDrawing);

    // Touch events for mobile - dispatch as mouse events for unified handling
    canvas.addEventListener('touchstart', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousedown', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchmove', function(e) {
        e.preventDefault();
        const touch = e.touches[0];
        const mouseEvent = new MouseEvent('mousemove', {
            clientX: touch.clientX,
            clientY: touch.clientY,
            bubbles: true
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchend', function(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {
            bubbles: true
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });

    canvas.addEventListener('touchcancel', function(e) {
        e.preventDefault();
        const mouseEvent = new MouseEvent('mouseup', {
            bubbles: true
        });
        canvas.dispatchEvent(mouseEvent);
    }, { passive: false });
}

function getCoordinates(e) {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX || (e.touches && e.touches[0].clientX);
    const clientY = e.clientY || (e.touches && e.touches[0].clientY);
    
    return {
        x: clientX - rect.left,
        y: clientY - rect.top
    };
}

function startDrawing(e) {
    state.isDrawing = true;
    const coords = getCoordinates(e);
    lastX = coords.x;
    lastY = coords.y;
    
    // Draw a single dot if it's just a click
    draw(e);
}

function draw(e) {
    if (!state.isDrawing) return;
    
    const coords = getCoordinates(e);
    
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();
    
    lastX = coords.x;
    lastY = coords.y;
    
    // Also draw on call whiteboard if visible
    if (state.whiteboardVisible && callCtx) {
        callCtx.beginPath();
        callCtx.moveTo(lastX, lastY);
        callCtx.lineTo(coords.x, coords.y);
        callCtx.strokeStyle = state.currentColor;
        callCtx.lineWidth = state.brushSize;
        callCtx.stroke();
    }
}

function stopDrawing() {
    state.isDrawing = false;
    ctx.beginPath(); // Reset path
}

function selectTool(tool) {
    state.currentTool = tool;
    
    // Update UI
    document.querySelectorAll('.tool').forEach(t => t.classList.remove('active'));
    document.querySelector(`.tool[data-tool="${tool}"]`).classList.add('active');
    
    // Set cursor and mode
    if (tool === 'eraser') {
        ctx.globalCompositeOperation = 'destination-out';
        if (callCtx) callCtx.globalCompositeOperation = 'destination-out';
    } else {
        ctx.globalCompositeOperation = 'source-over';
        if (callCtx) callCtx.globalCompositeOperation = 'source-over';
    }
}

function selectColor(color) {
    state.currentColor = color;
    ctx.strokeStyle = color;
    
    // Update UI
    document.querySelectorAll('.color').forEach(c => c.classList.remove('active'));
    event.target.classList.add('active');
}

function updateBrushSize(size) {
    state.brushSize = size;
    ctx.lineWidth = size;
}

function clearWhiteboard() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    showToast('Whiteboard cleared!');
    gainXP(30); // Quest progress
}

// ==========================================
// VIDEO CALL FUNCTIONS - UPDATED
// ==========================================

function joinSession(tutorName) {
    // Determine which tutor to show
    let tutor = null;

    if (tutorName && tutorData[tutorName]) {
        tutor = tutorData[tutorName];
    } else if (selectedSessionId) {
        const session = scheduleSessions.find(s => s.id === selectedSessionId);
        if (session && tutorData[session.tutor]) {
            tutor = tutorData[session.tutor];
        }
    }

    // Default to Dr. Sarah Chen if no tutor found
    if (!tutor) {
        tutor = tutorData['Dr. Sarah Chen'];
    }

    state.currentCallTutor = tutor;

    // Update call screen with tutor info BEFORE showing screen
    const avatarImg = document.getElementById('call-tutor-avatar');
    const nameEl = document.getElementById('call-tutor-name');
    const chatAvatar = document.getElementById('chat-tutor-avatar');
    const welcomeMsg = document.getElementById('chat-welcome-msg');

    if (avatarImg) avatarImg.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tutor.seed}`;
    if (nameEl) nameEl.textContent = tutor.name;
    if (chatAvatar) chatAvatar.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tutor.seed}`;
    if (welcomeMsg) welcomeMsg.textContent = tutor.welcomeMsg;

    // Use showScreen instead of showView
    showScreen('call');
    resetCallState();
    showToast(`Joining session with ${tutor.name}...`);

    // Simulate connection delay
    setTimeout(() => {
        const indicator = document.querySelector('#call-screen .connecting-indicator');
        if (indicator) indicator.style.display = 'none';
        showToast(`Connected to ${tutor.name}`);
    }, 2000);
}

function resetCallState() {
    state.isMuted = false;
    state.isVideoOff = false;
    state.whiteboardVisible = false;
    state.chatVisible = false;
    
    // Reset UI elements
    const chatPanel = document.getElementById('chat-panel');
    const localVideo = document.querySelector('#call-screen .local-video');
    const callWhiteboard = document.getElementById('call-whiteboard');
    const indicator = document.querySelector('#call-screen .connecting-indicator');
    
    if (chatPanel) chatPanel.classList.add('hidden');
    if (localVideo) {
        localVideo.style.bottom = '100px';
        localVideo.style.zIndex = '10';
    }
    if (callWhiteboard) callWhiteboard.classList.add('hidden');
    if (indicator) indicator.style.display = 'flex';
    
    // Reset buttons
    document.querySelectorAll('#call-screen .call-btn').forEach(btn => {
        btn.classList.remove('active');
    });
}

function toggleMute() {
    state.isMuted = !state.isMuted;
    const btn = document.querySelector('#call-screen .call-btn.mute');
    if (btn) {
        btn.classList.toggle('active', state.isMuted);
        btn.innerHTML = state.isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
    }
    showToast(state.isMuted ? 'Microphone muted' : 'Microphone unmuted');
}

function toggleVideo() {
    state.isVideoOff = !state.isVideoOff;
    const btn = document.querySelector('#call-screen .call-btn.video');
    if (btn) {
        btn.classList.toggle('active', state.isVideoOff);
        btn.innerHTML = state.isVideoOff ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
    }
    showToast(state.isVideoOff ? 'Camera turned off' : 'Camera turned on');
}

function toggleCallWhiteboard() {
    state.whiteboardVisible = !state.whiteboardVisible;
    const whiteboard = document.getElementById('call-whiteboard');
    const btn = document.querySelector('#call-screen .call-btn.whiteboard');

    if (state.whiteboardVisible) {
        // Close chat if open
        if (state.chatVisible) {
            toggleChat();
        }

        if (whiteboard) whiteboard.classList.remove('hidden');
        if (btn) btn.classList.add('active');
        showToast('Whiteboard enabled');

        // Initialize call canvas
        if (callCanvas) {
            const container = callCanvas.parentElement;
            if (container) {
                callCanvas.width = container.clientWidth;
                callCanvas.height = container.clientHeight;
            }
            callCtx.lineCap = 'round';
            callCtx.lineJoin = 'round';
            callCtx.strokeStyle = state.currentColor;
            callCtx.lineWidth = state.brushSize;

            // Add drawing events to call canvas
            callCanvas.addEventListener('mousedown', (e) => {
                const rect = callCanvas.getBoundingClientRect();
                callCtx.beginPath();
                callCtx.moveTo(e.clientX - rect.left, e.clientY - rect.top);

                function drawOnCall(e) {
                    callCtx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
                    callCtx.stroke();
                }

                function stopDrawOnCall() {
                    callCanvas.removeEventListener('mousemove', drawOnCall);
                    callCanvas.removeEventListener('mouseup', stopDrawOnCall);
                }

                callCanvas.addEventListener('mousemove', drawOnCall);
                callCanvas.addEventListener('mouseup', stopDrawOnCall);
            });
        }
    } else {
        if (whiteboard) whiteboard.classList.add('hidden');
        if (btn) btn.classList.remove('active');
    }
}

function toggleChat() {
    state.chatVisible = !state.chatVisible;
    const chatPanel = document.getElementById('chat-panel');
    const localVideo = document.querySelector('#call-screen .local-video');

    if (state.chatVisible) {
        // Close whiteboard if open
        if (state.whiteboardVisible) {
            toggleCallWhiteboard();
        }

        if (chatPanel) chatPanel.classList.remove('hidden');
        if (localVideo) localVideo.style.bottom = '420px';
    } else {
        if (chatPanel) chatPanel.classList.add('hidden');
        if (localVideo) localVideo.style.bottom = '100px';
    }
}

function sendMessage() {
    const input = document.getElementById('chat-input-field');
    const message = input.value.trim();
    
    if (!message) return;
    
    const chatMessages = document.getElementById('chat-messages');
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    const messageHTML = `
        <div class="message sent">
            <div class="message-content">
                <p>${escapeHtml(message)}</p>
                <span class="time">${time}</span>
            </div>
        </div>
    `;
    
    chatMessages.insertAdjacentHTML('beforeend', messageHTML);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    input.value = '';
    
    // Simulate tutor reply
    setTimeout(() => {
        const replies = [
            "Great question! Let me explain that.",
            "Exactly! You're getting it.",
            "That's correct! Well done.",
            "Let's work through this together."
        ];
        const randomReply = replies[Math.floor(Math.random() * replies.length)];
        
        const replyHTML = `
            <div class="message received">
                <img src="https://api.dicebear.com/7.x/avataaars/svg?seed=${state.currentCallTutor ? state.currentCallTutor.seed : 'Sarah'}" alt="Tutor">
                <div class="message-content">
                    <p>${randomReply}</p>
                    <span class="time">${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
            </div>
        `;
        
        chatMessages.insertAdjacentHTML('beforeend', replyHTML);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }, 1500);
}

function endCall() {
    if (confirm('End this session? You will earn XP for completed time.')) {
        // Return to main screen and dashboard
        showScreen('main');
        showView('dashboard');
        gainXP(100); // Session completion bonus
        showToast('Session ended. +100 XP earned!');
        
        // Reset call state
        resetCallState();
    }
}

function startBooking(tutorName) {
    openAddSessionModal(tutorName);
}

// ==========================================
// GAMIFICATION FUNCTIONS
// ==========================================

function gainXP(amount) {
    state.xp += amount;
    
    // Show XP popup
    const popup = document.getElementById('xp-popup');
    if (popup) {
        popup.querySelector('span').textContent = `+${amount} XP`;
        popup.classList.add('show');
        
        setTimeout(() => {
            popup.classList.remove('show');
        }, 1500);
    }
    
    // Update XP bar
    const maxXP = 1000;
    const progress = (state.xp / maxXP) * 100;
    const xpProgress = document.querySelector('.xp-progress');
    const xpText = document.querySelector('.xp-text');
    
    if (xpProgress) xpProgress.style.width = `${Math.min(progress, 100)}%`;
    if (xpText) xpText.textContent = `${state.xp}/${maxXP} XP`;
    
    // Check for level up
    if (state.xp >= maxXP) {
        levelUp();
    }
    
    // Update quests if applicable
    updateQuestProgress();
}

function levelUp() {
    state.level++;
    state.xp = state.xp - 1000;
    
    const levelNum = document.querySelector('.level-num');
    if (levelNum) levelNum.textContent = `Level ${state.level}`;
    
    // Celebration effect
    showToast(`🎉 Level Up! You're now Level ${state.level}!`);
    
    // Update XP bar
    const xpProgress = document.querySelector('.xp-progress');
    const xpText = document.querySelector('.xp-text');
    if (xpProgress) xpProgress.style.width = `${(state.xp / 1000) * 100}%`;
    if (xpText) xpText.textContent = `${state.xp}/1000 XP`;
}

function updateQuestProgress() {
    // Simulate quest completion check
    const quests = document.querySelectorAll('.quest-card');
    quests.forEach(quest => {
        if (!quest.classList.contains('completed') && Math.random() > 0.7) {
            quest.classList.add('completed');
            const icon = quest.querySelector('.quest-icon');
            if (icon) {
                icon.innerHTML = '<i class="fas fa-check-circle"></i>';
                icon.style.background = 'var(--success)';
                icon.style.color = 'white';
            }
        }
    });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function showToast(message) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    if (toast && toastMessage) {
        toastMessage.textContent = message;
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function updateTimeGreeting() {
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    
    if (hour >= 12 && hour < 17) {
        greeting = 'Good Afternoon';
    } else if (hour >= 17) {
        greeting = 'Good Evening';
    }
    
    const greetingElement = document.querySelector('.time-greeting');
    if (greetingElement) {
        greetingElement.textContent = greeting;
    }
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==========================================
// EVENT LISTENERS SETUP
// ==========================================

// Notification badge click
document.querySelector('.notification-btn')?.addEventListener('click', () => {
    showToast('No new notifications');
    const badge = document.querySelector('.badge');
    if (badge) badge.style.display = 'none';
});

// Settings button - opens settings modal
document.querySelector('.settings-btn')?.addEventListener('click', () => {
    openSettingsModal();
});

// Quest action buttons
document.querySelectorAll('.quest-action').forEach(btn => {
    btn.addEventListener('click', () => {
        joinSession('Dr. Sarah Chen'); // Use new joinSession function
        gainXP(100);
    });
});

// Handle window resize for canvas
window.addEventListener('resize', () => {
    if (views.whiteboard && views.whiteboard.classList.contains('active')) {
        resizeCanvas();
    }
});

// Prevent double-tap zoom on mobile
let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
    const now = Date.now();
    if (now - lastTouchEnd <= 300) {
        e.preventDefault();
    }
    lastTouchEnd = now;
}, false);

// ==========================================
// PROFILE PAGE FUNCTIONS
// ==========================================

function toggleSwitch(element) {
    element.classList.toggle('active');
    const isActive = element.classList.contains('active');
    const settingName = element.closest('.setting-item').querySelector('span').textContent;

    // Handle dark mode toggle
    if (settingName === 'Dark Mode') {
        if (isActive) {
            document.body.classList.add('dark-mode');
            localStorage.setItem('darkMode', 'true');
            showToast('Dark mode enabled');
        } else {
            document.body.classList.remove('dark-mode');
            localStorage.setItem('darkMode', 'false');
            showToast('Dark mode disabled');
        }
        // Sync the settings modal toggle too
        const settingsToggle = document.getElementById('settings-dark-mode-toggle');
        if (settingsToggle) {
            settingsToggle.classList.toggle('active', isActive);
        }
        return;
    }

    showToast(`${settingName} ${isActive ? 'enabled' : 'disabled'}`);
}

function logout() {
    if (confirm('Are you sure you want to log out?')) {
        // Reset state
        state.currentUser = null;
        state.xp = 650;
        state.level = 5;
        
        // Show splash screen again
        screens.main.classList.remove('active');
        screens.splash.classList.add('active');
        
        // Reset forms
        document.getElementById('login-form').reset();
        document.getElementById('register-form').reset();
        
        // Reload after animation
        setTimeout(() => {
            location.reload();
        }, 2000);
        
        showToast('Logged out successfully');
    }
}

function animateProfileStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    statNumbers.forEach(stat => {
        const finalValue = stat.textContent;
        stat.style.opacity = '0';
        stat.style.transform = 'translateY(10px)';
        
        setTimeout(() => {
            stat.style.transition = 'all 0.5s ease';
            stat.style.opacity = '1';
            stat.style.transform = 'translateY(0)';
        }, 100);
    });
}

function setupProfileListeners() {
    // Edit profile buttons
    document.querySelectorAll('.edit-avatar-btn, .edit-cover-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            showToast('Photo upload coming soon!');
        });
    });

    // Preference tags
    document.querySelectorAll('.preference-tag').forEach(tag => {
        tag.addEventListener('click', () => {
            tag.classList.toggle('active');
            const name = tag.querySelector('span').textContent;
            const isActive = tag.classList.contains('active');
            showToast(`${name} ${isActive ? 'added to' : 'removed from'} preferences`);
        });
    });

    // Setting items (non-toggle, non-badge) on profile page
    document.querySelectorAll('#profile-view .setting-item').forEach(item => {
        const hasToggle = item.querySelector('.toggle-switch');
        const hasBadge = item.querySelector('.badge-premium');
        const spanText = item.querySelector('span')?.textContent || '';

        if (!hasToggle && !hasBadge) {
            item.addEventListener('click', () => {
                if (spanText === 'Edit Profile') {
                    openEditProfileModal();
                } else if (spanText === 'Subscription') {
                    openSubscriptionModal();
                } else {
                    showToast(`${spanText} - Coming soon!`);
                }
            });
        }
    });
}


// ==========================================
// TUTOR DATA
// ==========================================

const tutorData = {
    'Dr. Sarah Chen': {
        name: 'Dr. Sarah Chen',
        subject: 'Mathematics',
        seed: 'Sarah',
        welcomeMsg: 'Hi! Ready to start our Calculus session?'
    },
    'Prof. Michael Brown': {
        name: 'Prof. Michael Brown',
        subject: 'Physics',
        seed: 'Mike',
        welcomeMsg: 'Hello! Ready to explore Quantum Mechanics?'
    },
    'Emma Wilson': {
        name: 'Emma Wilson',
        subject: 'Coding',
        seed: 'Emma',
        welcomeMsg: 'Hey there! Let\'s dive into some JavaScript!'
    },
    'Dr. James Lee': {
        name: 'Dr. James Lee',
        subject: 'Languages',
        seed: 'James',
        welcomeMsg: 'Welcome! Ready to practice your language skills?'
    }
};

// ==========================================
// SCHEDULE FUNCTIONS
// ==========================================

let scheduleSessions = [
    {
        id: 1,
        subject: 'Mathematics',
        title: 'Advanced Calculus',
        tutor: 'Dr. Sarah Chen',
        date: new Date(new Date().setHours(14, 0, 0, 0)),
        duration: 45,
        notes: 'Derivatives and integrals review',
        status: 'upcoming'
    },
    {
        id: 2,
        subject: 'Physics',
        title: 'Quantum Mechanics Basics',
        tutor: 'Prof. Michael Brown',
        date: new Date(new Date().setHours(16, 30, 0, 0)),
        duration: 60,
        notes: '',
        status: 'upcoming'
    },
    {
        id: 3,
        subject: 'Coding',
        title: 'JavaScript Advanced',
        tutor: 'Emma Wilson',
        date: new Date(new Date(new Date().setDate(new Date().getDate() + 1)).setHours(10, 0, 0, 0)),
        duration: 60,
        notes: 'Async/await patterns',
        status: 'upcoming'
    }
];

let selectedSessionId = null;

function initSchedule() {
    renderDaysStrip();
    renderTimeline();
    updateWeekDisplay();
}

function changeWeek(offset) {
    state.currentWeekOffset += offset;
    renderDaysStrip();
    updateWeekDisplay();
}

function updateWeekDisplay() {
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + state.currentWeekOffset * 7);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);

    const options = { month: 'short', day: 'numeric' };
    document.getElementById('week-range').textContent = 
        `${startOfWeek.toLocaleDateString('en-US', options)} - ${endOfWeek.toLocaleDateString('en-US', options)}`;

    const weekLabel = document.querySelector('.week-label');
    if (state.currentWeekOffset === 0) weekLabel.textContent = 'This Week';
    else if (state.currentWeekOffset === -1) weekLabel.textContent = 'Last Week';
    else if (state.currentWeekOffset === 1) weekLabel.textContent = 'Next Week';
    else weekLabel.textContent = `${state.currentWeekOffset > 0 ? '+' : ''}${state.currentWeekOffset} Weeks`;
}

function renderDaysStrip() {
    const strip = document.getElementById('days-strip');
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + state.currentWeekOffset * 7);

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    let html = '';

    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        const isSelected = isSameDay(date, state.selectedDate);
        const isToday = isSameDay(date, today);

        html += `
            <button class="day-chip ${isSelected ? 'active' : ''} ${isToday ? 'today' : ''}" onclick="selectDate('${date.toISOString()}')">
                <span class="day-name">${days[i]}</span>
                <span class="day-num">${date.getDate()}</span>
                ${hasSessions(date) ? '<span class="day-dot"></span>' : ''}
            </button>
        `;
    }
    strip.innerHTML = html;
}

function selectDate(dateStr) {
    state.selectedDate = new Date(dateStr);
    renderDaysStrip();
    renderTimeline();
}

function isSameDay(d1, d2) {
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
}

function hasSessions(date) {
    return scheduleSessions.some(s => isSameDay(new Date(s.date), date));
}

function renderTimeline() {
    const timeline = document.getElementById('timeline');
    const emptyState = document.getElementById('schedule-empty');

    const daySessions = scheduleSessions
        .filter(s => isSameDay(new Date(s.date), state.selectedDate))
        .sort((a, b) => new Date(a.date) - new Date(b.date));

    if (daySessions.length === 0) {
        timeline.innerHTML = '';
        emptyState.classList.remove('hidden');
        return;
    }

    emptyState.classList.add('hidden');

    let html = '<div class="time-column">';
    for (let h = 8; h <= 20; h++) {
        html += `<div class="time-slot">${h}:00</div>`;
    }
    html += '</div><div class="events-column">';

    // Calculate overlapping groups for side-by-side layout
    const sessionsWithLayout = calculateSessionLayout(daySessions);

    sessionsWithLayout.forEach(({ session, column, totalColumns }) => {
        const date = new Date(session.date);
        const startHour = date.getHours() + date.getMinutes() / 60;
        const top = (startHour - 8) * 60;
        const height = session.duration;
        const isPast = new Date() > new Date(date.getTime() + session.duration * 60000);
        const isLive = !isPast && new Date() >= date;

        const subjectColors = {
            'Mathematics': { bg: '#E0ECF5', border: '#7EB8E0', icon: 'fa-calculator' },
            'Physics': { bg: '#E0ECF5', border: '#A8D0F0', icon: 'fa-atom' },
            'Coding': { bg: '#F5ECD0', border: '#E8B84B', icon: 'fa-code' },
            'Languages': { bg: '#D6E2EC', border: '#3B82F6', icon: 'fa-language' }
        };
        const colors = subjectColors[session.subject] || subjectColors['Mathematics'];

        // Calculate width and left position based on column
        const widthPercent = 100 / totalColumns;
        const leftPercent = column * widthPercent;

        html += `
            <div class="session-event ${isPast ? 'past' : ''} ${isLive ? 'live' : ''}" 
                 style="top: ${top}px; height: ${Math.max(height, 50)}px; 
                        left: calc(10px + ${leftPercent}%); 
                        width: calc(${widthPercent}% - 15px); 
                        border-left-color: ${colors.border}; background: ${colors.bg};"
                 onclick="openSessionDetails(${session.id})">
                <div class="event-content">
                    <div class="event-header">
                        <i class="fas ${colors.icon}" style="color: ${colors.border}"></i>
                        ${isLive ? '<span class="event-live-badge">LIVE</span>' : ''}
                    </div>
                    <h5 class="event-title">${session.title}</h5>
                    <p class="event-tutor"><i class="fas fa-user"></i> ${session.tutor}</p>
                    <span class="event-time">${formatTime(date)} · ${session.duration} min</span>
                </div>
            </div>
        `;
    });

    html += '</div>';
    timeline.innerHTML = html;
}

function calculateSessionLayout(sessions) {
    // Group overlapping sessions so they appear side-by-side
    const result = [];
    const overlaps = [];

    // Find overlapping sessions
    for (let i = 0; i < sessions.length; i++) {
        const s1 = sessions[i];
        const s1Start = new Date(s1.date).getTime();
        const s1End = s1Start + s1.duration * 60000;

        overlaps[i] = [];
        for (let j = 0; j < sessions.length; j++) {
            if (i === j) continue;
            const s2 = sessions[j];
            const s2Start = new Date(s2.date).getTime();
            const s2End = s2Start + s2.duration * 60000;

            // Check if sessions overlap
            if (s1Start < s2End && s2Start < s1End) {
                overlaps[i].push(j);
            }
        }
    }

    // Assign columns using greedy algorithm
    const assigned = new Array(sessions.length).fill(-1);

    for (let i = 0; i < sessions.length; i++) {
        if (assigned[i] !== -1) continue;

        // Find all sessions in this overlap group
        const group = [i];
        const queue = [...overlaps[i]];
        const visited = new Set([i]);

        while (queue.length > 0) {
            const idx = queue.shift();
            if (visited.has(idx)) continue;
            visited.add(idx);
            group.push(idx);
            queue.push(...overlaps[idx]);
        }

        // Assign columns within group
        const groupSize = group.length;
        for (let g = 0; g < group.length; g++) {
            const sessionIdx = group[g];
            assigned[sessionIdx] = g;
        }

        // Store layout info for each session in group
        for (let g = 0; g < group.length; g++) {
            const sessionIdx = group[g];
            result.push({
                session: sessions[sessionIdx],
                column: g,
                totalColumns: groupSize
            });
        }
    }

    return result;
}

function formatTime(date) {
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function openAddSessionModal(tutorName) {
    const modal = document.getElementById('add-session-modal');
    const dateInput = document.getElementById('session-date');
    const subjectSection = document.getElementById('booking-subject-section');
    const tutorSection = document.getElementById('booking-tutor-section');
    const selectedTutorDisplay = document.getElementById('booking-selected-tutor');
    const modalTitle = document.getElementById('booking-modal-title');

    // Default to today if no date selected
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${year}-${month}-${day}`;
    dateInput.min = new Date().toISOString().split('T')[0];

    if (tutorName && tutorData[tutorName]) {
        // Coming from a specific tutor card - hide subject/tutor selection, show selected tutor
        const tutor = tutorData[tutorName];

        subjectSection.classList.add('hidden');
        tutorSection.classList.add('hidden');
        selectedTutorDisplay.classList.remove('hidden');

        // Update display
        document.getElementById('selected-tutor-img').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${tutor.seed}`;
        document.getElementById('selected-tutor-name').textContent = tutor.name;
        document.getElementById('selected-tutor-subject').textContent = tutor.subject;
        document.getElementById('preselected-tutor-name').value = tutor.name;
        document.getElementById('preselected-subject').value = tutor.subject;

        modalTitle.textContent = `Book with ${tutor.name}`;
    } else {
        // General booking from Explore header - show subject + tutor selection
        subjectSection.classList.remove('hidden');
        tutorSection.classList.remove('hidden');
        selectedTutorDisplay.classList.add('hidden');

        // Clear preselected values
        document.getElementById('preselected-tutor-name').value = '';
        document.getElementById('preselected-subject').value = '';

        modalTitle.textContent = 'Book a Session';
    }

    // Show modal (form fields are managed individually, not via reset)
    modal.classList.remove('hidden');
}

function closeAddSessionModal() {
    document.getElementById('add-session-modal').classList.add('hidden');
    document.getElementById('add-session-form').reset();

    // Reset sections to default state
    document.getElementById('booking-subject-section').classList.remove('hidden');
    document.getElementById('booking-tutor-section').classList.remove('hidden');
    document.getElementById('booking-selected-tutor').classList.add('hidden');
    document.getElementById('booking-modal-title').textContent = 'Book a Session';
    document.getElementById('preselected-tutor-name').value = '';
    document.getElementById('preselected-subject').value = '';
}

function handleAddSession(e) {
    // Handle both event-driven and direct calls
    if (e && e.preventDefault) {
        e.preventDefault();
        e.stopPropagation();
    }

    // Check if tutor was pre-selected from a tutor card
    const preselectedTutor = document.getElementById('preselected-tutor-name').value;
    const preselectedSubject = document.getElementById('preselected-subject').value;

    let subject, tutor;

    if (preselectedTutor && preselectedSubject) {
        // Coming from a specific tutor card
        subject = preselectedSubject;
        tutor = preselectedTutor;
    } else {
        // General booking - get from form
        const subjectInput = document.querySelector('#add-session-form input[name="subject"]:checked');
        subject = subjectInput ? subjectInput.value : 'Mathematics';
        tutor = document.getElementById('session-tutor').value;

        if (!tutor) {
            showToast('Please select a tutor');
            return;
        }
    }

    const dateStr = document.getElementById('session-date').value;
    const timeStr = document.getElementById('session-time').value;
    const durationInput = document.querySelector('#add-session-form input[name="duration"]:checked');
    const duration = durationInput ? parseInt(durationInput.value) : 30;
    const notes = document.getElementById('session-notes').value;

    if (!dateStr || !timeStr) {
        showToast('Please select date and time');
        return;
    }

    const [hours, minutes] = timeStr.split(':');
    const date = new Date(dateStr);
    date.setHours(parseInt(hours), parseInt(minutes), 0, 0);

    const newSession = {
        id: Date.now(),
        subject: subject,
        title: `${subject} Session`,
        tutor: tutor,
        date: date,
        duration: duration,
        notes: notes,
        status: 'upcoming'
    };

    scheduleSessions.push(newSession);
    scheduleSessions.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Close modal first
    closeAddSessionModal();

    // Show success message
    showToast(`Session booked with ${tutor}! +25 XP`);
    gainXP(25);

    // Update dashboard upcoming (so it shows when user goes back to home)
    renderDashboardUpcoming();

    // Redirect to schedule view
    showView('schedule');

    // Set the selected date to the booked session's date and refresh schedule
    state.selectedDate = new Date(dateStr);
    state.currentWeekOffset = 0;
    initSchedule();
}

function openSessionDetails(sessionId) {
    selectedSessionId = sessionId;
    const session = scheduleSessions.find(s => s.id === sessionId);
    if (!session) return;

    const subjectIcons = {
        'Mathematics': 'fa-calculator',
        'Physics': 'fa-atom',
        'Coding': 'fa-code',
        'Languages': 'fa-language'
    };
    const subjectColors = {
        'Mathematics': '#7EB8E0',
        'Physics': '#A8D0F0',
        'Coding': '#E8B84B',
        'Languages': '#3B82F6'
    };

    document.getElementById('details-icon').innerHTML = `<i class="fas ${subjectIcons[session.subject] || 'fa-book'}"></i>`;
    document.getElementById('details-icon').style.background = subjectColors[session.subject] || '#7EB8E0';
    document.getElementById('details-subject').textContent = session.title;
    document.getElementById('details-tutor').textContent = `with ${session.tutor}`;

    const date = new Date(session.date);
    document.getElementById('details-date').textContent = date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

    const endTime = new Date(date.getTime() + session.duration * 60000);
    document.getElementById('details-time').textContent = `${formatTime(date)} - ${formatTime(endTime)}`;
    document.getElementById('details-duration').textContent = `${session.duration} minutes`;

    const notesRow = document.getElementById('details-notes-row');
    if (session.notes) {
        document.getElementById('details-notes').textContent = session.notes;
        notesRow.classList.remove('hidden');
    } else {
        notesRow.classList.add('hidden');
    }

    document.getElementById('session-details-modal').classList.remove('hidden');
}

function closeSessionDetails() {
    document.getElementById('session-details-modal').classList.add('hidden');
    selectedSessionId = null;
}

function joinFromDetails() {
    const session = scheduleSessions.find(s => s.id === selectedSessionId);
    closeSessionDetails();
    joinSession(session ? session.tutor : null);
}

function cancelSession() {
    if (!selectedSessionId) return;
    if (!confirm('Cancel this session?')) return;

    scheduleSessions = scheduleSessions.filter(s => s.id !== selectedSessionId);
    closeSessionDetails();
    renderDaysStrip();
    renderTimeline();
    showToast('Session cancelled');
}

const originalShowView = showView;
window.showView = function(viewName) {
    originalShowView(viewName);
    if (viewName === 'schedule') {
        setTimeout(initSchedule, 50);
    }
    if (viewName === 'dashboard') {
        setTimeout(renderDashboardUpcoming, 50);
    }
};



// ==========================================
// EDIT PROFILE FUNCTIONS
// ==========================================

let currentAvatarSeed = 'Felix';

function openEditProfileModal() {
    const modal = document.getElementById('edit-profile-modal');

    // Load current values
    const nameEl = document.querySelector('.profile-name-section h2');
    const currentName = nameEl ? nameEl.textContent : 'Alex Johnson';
    document.getElementById('edit-name').value = currentName;

    // Load saved values from localStorage if they exist
    const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (savedProfile.name) document.getElementById('edit-name').value = savedProfile.name;
    if (savedProfile.email) document.getElementById('edit-email').value = savedProfile.email;
    if (savedProfile.bio) document.getElementById('edit-bio').value = savedProfile.bio;
    if (savedProfile.goal) document.getElementById('edit-goal').value = savedProfile.goal;
    if (savedProfile.avatarSeed) {
        currentAvatarSeed = savedProfile.avatarSeed;
        document.getElementById('edit-avatar-img').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentAvatarSeed}`;
    }

    modal.classList.remove('hidden');
}

function closeEditProfileModal() {
    document.getElementById('edit-profile-modal').classList.add('hidden');
    document.getElementById('avatar-options').classList.remove('show');
}

function changeAvatar() {
    const options = document.getElementById('avatar-options');
    options.classList.toggle('show');
}

function selectAvatarSeed(seed) {
    currentAvatarSeed = seed;
    document.getElementById('edit-avatar-img').src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}`;
    document.getElementById('avatar-options').classList.remove('show');
}

function handleEditProfile(e) {
    e.preventDefault();

    const name = document.getElementById('edit-name').value.trim();
    const email = document.getElementById('edit-email').value.trim();
    const bio = document.getElementById('edit-bio').value.trim();
    const goal = document.getElementById('edit-goal').value;

    if (!name || !email) {
        showToast('Please fill in all required fields');
        return;
    }

    // Save to localStorage
    const profile = {
        name: name,
        email: email,
        bio: bio,
        goal: goal,
        avatarSeed: currentAvatarSeed
    };
    localStorage.setItem('userProfile', JSON.stringify(profile));

    // Update UI immediately
    updateProfileUI(profile);

    closeEditProfileModal();
    showToast('Profile updated successfully! +50 XP');
    gainXP(50);
}

function updateProfileUI(profile) {
    // Update profile page
    const profileName = document.querySelector('.profile-name-section h2');
    const headerName = document.querySelector('.greeting h3');
    const profileAvatar = document.querySelector('.profile-avatar-large img');
    const headerAvatar = document.querySelector('.avatar img');
    const localVideo = document.querySelector('#call-screen .local-video img');

    if (profileName) profileName.textContent = profile.name;
    if (headerName) headerName.textContent = profile.name;

    const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.avatarSeed}`;
    if (profileAvatar) profileAvatar.src = avatarUrl;
    if (headerAvatar) headerAvatar.src = avatarUrl;
    if (localVideo) localVideo.src = avatarUrl;

    // Update greeting
    const greetingEl = document.querySelector('.profile-name-section p');
    if (greetingEl) {
        const goalLabels = {
            'beginner': 'Beginner Learner',
            'intermediate': 'Intermediate Learner',
            'advanced': 'Advanced Learner',
            'expert': 'Expert Learner'
        };
        greetingEl.textContent = `${goalLabels[profile.goal] || 'Learner'} • Level ${state.level}`;
    }

    // Update state
    if (state.currentUser) {
        state.currentUser.name = profile.name;
        state.currentUser.email = profile.email;
    }
}

function loadSavedProfile() {
    const savedProfile = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (savedProfile.name) {
        updateProfileUI(savedProfile);
    }
}



// ==========================================
// ALL SESSIONS VIEW FUNCTIONS
// ==========================================

function showAllSessions(defaultTab) {
    showView('all-sessions');
    switchSessionsTab(defaultTab);
    renderAllSessions();
}

function switchSessionsTab(tab) {
    document.querySelectorAll('.session-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.sessions-tab-content').forEach(c => c.classList.remove('active'));

    document.querySelector(`.session-tab[data-tab="${tab}"]`).classList.add('active');
    document.getElementById(`all-${tab}-sessions`).classList.add('active');
}

function renderAllSessions() {
    const now = new Date();

    // Active sessions - currently live or about to start
    const activeContainer = document.getElementById('all-active-sessions');
    const activeSessions = scheduleSessions.filter(s => {
        const sessionDate = new Date(s.date);
        const endTime = new Date(sessionDate.getTime() + s.duration * 60000);
        return now >= sessionDate && now <= endTime;
    });

    if (activeSessions.length === 0) {
        activeContainer.innerHTML = `
            <div class="schedule-empty">
                <div class="empty-icon">
                    <i class="fas fa-broadcast-tower"></i>
                </div>
                <h4>No active sessions</h4>
                <p>Sessions will appear here when they go live</p>
            </div>
        `;
    } else {
        activeContainer.innerHTML = activeSessions.map(session => createSessionCard(session, true)).join('');
    }

    // Upcoming sessions - future sessions
    const upcomingContainer = document.getElementById('all-upcoming-sessions');
    const upcomingSessions = scheduleSessions.filter(s => {
        const sessionDate = new Date(s.date);
        return sessionDate > now;
    }).sort((a, b) => new Date(a.date) - new Date(b.date));

    if (upcomingSessions.length === 0) {
        upcomingContainer.innerHTML = `
            <div class="schedule-empty">
                <div class="empty-icon">
                    <i class="fas fa-calendar-plus"></i>
                </div>
                <h4>No upcoming sessions</h4>
                <p>Book a session to get started</p>
            </div>
        `;
    } else {
        // Group by date
        const grouped = {};
        upcomingSessions.forEach(session => {
            const date = new Date(session.date);
            const dateKey = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(session);
        });

        let html = '';
        for (const [dateKey, sessions] of Object.entries(grouped)) {
            html += `<div class="session-date-group"><h5 class="session-date-label">${dateKey}</h5>`;
            html += sessions.map(s => createSessionCard(s, false)).join('');
            html += '</div>';
        }
        upcomingContainer.innerHTML = html;
    }
}

function createSessionCard(session, isActive) {
    const date = new Date(session.date);
    const subjectColors = {
        'Mathematics': { bg: '#E0ECF5', border: '#7EB8E0', icon: 'fa-calculator', badge: 'math' },
        'Physics': { bg: '#E0ECF5', border: '#A8D0F0', icon: 'fa-atom', badge: 'physics' },
        'Coding': { bg: '#F5ECD0', border: '#E8B84B', icon: 'fa-code', badge: 'coding' },
        'Languages': { bg: '#D6E2EC', border: '#3B82F6', icon: 'fa-language', badge: 'languages' }
    };
    const colors = subjectColors[session.subject] || subjectColors['Mathematics'];

    const isLive = isActive;
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    return `
        <div class="session-card ${isLive ? 'live' : ''}" style="border-left-color: ${colors.border}; margin-bottom: 12px;">
            <div class="session-info">
                <div class="subject-icon ${colors.badge}" style="background: ${colors.bg}; color: ${colors.border};">
                    <i class="fas ${colors.icon}"></i>
                </div>
                <div class="session-details">
                    <h5>${session.title}</h5>
                    <p>with ${session.tutor}</p>
                    <div class="session-meta">
                        <span class="session-time"><i class="fas fa-clock"></i> ${timeStr}</span>
                        <span class="session-duration"><i class="fas fa-hourglass-half"></i> ${session.duration} min</span>
                    </div>
                    ${isLive ? '<span class="live-badge"><i class="fas fa-circle"></i> LIVE NOW</span>' : ''}
                </div>
            </div>
            <button class="join-btn" onclick="selectedSessionId = ${session.id}; joinSession('${session.tutor}')">
                ${isLive ? '<i class="fas fa-video"></i> Join' : 'View'}
            </button>
        </div>
    `;
}



// ==========================================
// DASHBOARD UPCOMING SECTION
// ==========================================

function renderDashboardUpcoming() {
    const container = document.getElementById('dashboard-upcoming-list');
    const emptyState = document.getElementById('dashboard-upcoming-empty');

    if (!container) return;

    const now = new Date();
    // Get upcoming sessions (future sessions, sorted by date)
    const upcoming = scheduleSessions
        .filter(s => new Date(s.date) > now)
        .sort((a, b) => new Date(a.date) - new Date(b.date))
        .slice(0, 3); // Show max 3 on dashboard

    if (upcoming.length === 0) {
        container.innerHTML = '';
        container.classList.add('hidden');
        if (emptyState) emptyState.classList.remove('hidden');
        return;
    }

    container.classList.remove('hidden');
    if (emptyState) emptyState.classList.add('hidden');

    const subjectBadges = {
        'Mathematics': { class: 'math', text: 'Math' },
        'Physics': { class: 'physics', text: 'Physics' },
        'Coding': { class: 'coding', text: 'Coding' },
        'Languages': { class: 'languages', text: 'Languages' }
    };

    container.innerHTML = upcoming.map(session => {
        const date = new Date(session.date);
        const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        const badge = subjectBadges[session.subject] || { class: '', text: session.subject };

        return `
            <div class="lesson-card" onclick="joinSession('${session.tutor}')">
                <div class="lesson-time">
                    <span class="time">${timeStr}</span>
                    <span class="duration">${session.duration} min</span>
                </div>
                <div class="lesson-info">
                    <div class="subject-badge ${badge.class}">${badge.text}</div>
                    <h5>${session.title}</h5>
                    <p>${session.tutor}</p>
                </div>
                <button class="more-btn">
                    <i class="fas fa-ellipsis-v"></i>
                </button>
            </div>
        `;
    }).join('');
}

// Also render upcoming when sessions change (after booking)
// Dashboard upcoming refresh helper
function refreshDashboardIfVisible() {
    setTimeout(() => {
        const dashboardView = document.getElementById('dashboard-view');
        if (dashboardView && dashboardView.classList.contains('active')) {
            renderDashboardUpcoming();
        }
    }, 200);
}

// ==========================================
// EXPORT ALL FUNCTIONS
// ==========================================

window.showScreen = showScreen;
window.showView = showView;
window.selectTool = selectTool;
window.selectColor = selectColor;
window.updateBrushSize = updateBrushSize;
window.clearWhiteboard = clearWhiteboard;
window.joinSession = joinSession;
window.toggleMute = toggleMute;
window.toggleVideo = toggleVideo;
window.toggleCallWhiteboard = toggleCallWhiteboard;
window.toggleChat = toggleChat;
window.sendMessage = sendMessage;
window.endCall = endCall;
window.startBooking = startBooking;
window.gainXP = gainXP;
window.toggleSwitch = toggleSwitch;
window.logout = logout;
window.changeWeek = changeWeek;
window.selectDate = selectDate;
window.openAddSessionModal = openAddSessionModal;
window.closeAddSessionModal = closeAddSessionModal;
window.handleAddSession = handleAddSession;
window.openSessionDetails = openSessionDetails;
window.closeSessionDetails = closeSessionDetails;
window.joinFromDetails = joinFromDetails;
window.cancelSession = cancelSession;
window.openEditProfileModal = openEditProfileModal;
window.closeEditProfileModal = closeEditProfileModal;
window.changeAvatar = changeAvatar;
window.selectAvatarSeed = selectAvatarSeed;
window.handleEditProfile = handleEditProfile;
window.showAllSessions = showAllSessions;
window.switchSessionsTab = switchSessionsTab;
window.renderAllSessions = renderAllSessions;
window.createSessionCard = createSessionCard;
window.renderDashboardUpcoming = renderDashboardUpcoming;
window.openSettingsModal = openSettingsModal;
window.closeSettingsModal = closeSettingsModal;
window.toggleDarkModeFromSettings = toggleDarkModeFromSettings;
window.openNotificationsModal = openNotificationsModal;
window.closeNotificationsModal = closeNotificationsModal;
window.openSubscriptionModal = openSubscriptionModal;
window.closeSubscriptionModal = closeSubscriptionModal;
window.openAboutModal = openAboutModal;
window.closeAboutModal = closeAboutModal;
window.openHelpModal = openHelpModal;
window.closeHelpModal = closeHelpModal;
window.openPrivacyModal = openPrivacyModal;
window.closePrivacyModal = closePrivacyModal;

console.log('🎓 Learn O\'Clock App Initialized');
console.log('📱 Mobile-first tutoring platform ready');
console.log('👤 Profile module loaded');
console.log('🎨 Custom logo integrated');
console.log('📞 Call screen separated'); // NEW