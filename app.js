// Aura Smart Home Control Center App Logic

// 1. Application State
const state = {
    currentScreen: 1,
    brightness: 70, // 10% to 100%
    lights: {
        livingRoom: false,
        kitchen: false,
        roomA: false,
        roomB: false,
        masterRoom: false,
        bathroom: false,
        masterBathroom: false
    },
    door: {
        status: 'locked', // 'locked' | 'unlocked'
        secureLockActive: false,
        secureLockDuration: 60, // in seconds
        secureLockTimeRemaining: 0
    },
    gas: {
        status: 'closed', // 'open' | 'closed'
        autoGasLock: true,
        autoSafeCut: true
    },
    temp: {
        current: 24.5, // House average (calculated)
        target: 22.0,
        mode: 'cooling', // 'cooling' | 'heating' | 'fan' | 'off'
        rooms: {
            livingRoom: 25.0,
            kitchen: 24.7,
            roomA: 24.0,
            roomB: 24.2,
            masterRoom: 24.6
        }
    },
    aircon: {
        active: false,
        wind: 'low' // 'low' | 'medium' | 'high'
    }
};

// Timer reference for countdowns and simulations
let secureLockInterval = null;
let kitchenHeatInterval = null;
let thermodynamicsInterval = null;

// 2. DOM Elements Cache
const elements = {
    // Navigation
    screensWrapper: document.getElementById('screens-wrapper'),
    themeToggleBtn: document.getElementById('theme-toggle'),

    // Light Screen
    brightnessSlider: document.getElementById('global-brightness-slider'),
    brightnessValText: document.getElementById('global-brightness-val'),
    sliderFill: document.getElementById('slider-fill'),
    btnAllLightsOff: document.getElementById('btn-all-lights-off'),
    lightToggleButtons: document.querySelectorAll('.light-toggle-btn'),
    lightSingleButtons: document.querySelectorAll('.light-toggle-single-btn'),

    // Door Lock Screen
    btnDoorUnlock: document.getElementById('btn-door-unlock'),
    btnDoorLock: document.getElementById('btn-door-lock'),
    secureLockSelect: document.getElementById('secure-lock-time-select'),
    btnToggleSecureLock: document.getElementById('btn-toggle-secure-lock'),
    secureCountdownContainer: document.getElementById('secure-countdown-container'),
    countdownRingFill: document.getElementById('countdown-ring-fill'),
    countdownText: document.getElementById('countdown-text'),

    // Gas Valve Screen
    btnGasOpen: document.getElementById('btn-gas-open'),
    btnGasClose: document.getElementById('btn-gas-close'),
    switchAutoGas: document.getElementById('switch-auto-gas'),
    switchAutoSafe: document.getElementById('switch-auto-safe'),
    badgeAutoGas: document.getElementById('badge-auto-gas'),
    badgeAutoSafe: document.getElementById('badge-auto-safe'),

    // Temp Screen & Aircon Controls
    targetTempDisplay: document.getElementById('target-temp-display'),
    currentTempDisplay: document.getElementById('current-temp-display'),
    btnTempMinus: document.getElementById('btn-temp-minus'),
    btnTempPlus: document.getElementById('btn-temp-plus'),
    modeButtons: document.querySelectorAll('.mode-btn'),
    btnToggleAircon: document.getElementById('btn-toggle-aircon'),
    badgeAircon: document.getElementById('badge-aircon'),
    airconWindContainer: document.getElementById('aircon-wind-container'),
    windLowBtn: document.getElementById('wind-low'),
    windMediumBtn: document.getElementById('wind-medium'),
    windHighBtn: document.getElementById('wind-high'),

    // Sim Panel Indicators
    simRooms: {
        livingRoom: document.getElementById('sim-livingRoom'),
        kitchen: document.getElementById('sim-kitchen'), // Added kitchen to simRooms
        roomA: document.getElementById('sim-roomA'),
        roomB: document.getElementById('sim-roomB'),
        masterRoom: document.getElementById('sim-masterRoom'),
        bathroom: document.getElementById('sim-bathroom'),
        masterBathroom: document.getElementById('sim-masterBathroom')
    },
    simGasValve: document.getElementById('sim-gas-valve'),
    simKitchenTemp: document.getElementById('sim-kitchen-temp'),
    simDoorStatus: document.getElementById('sim-door-status'),
    simDoorSecureLight: document.getElementById('sim-door-secure-active-light'),
    simAirconIndicator: document.getElementById('sim-aircon-indicator'),

    // Sim Scenarios
    btnTriggerLeaveHome: document.getElementById('trigger-leave-home'),
    btnTriggerKitchenHeat: document.getElementById('trigger-kitchen-heat'),
    btnTriggerResetSim: document.getElementById('trigger-reset-sim'),
    btnAwayModeHome: document.getElementById('btn-away-mode-home'), // Added Home Screen Away Button

    // Output Box
    systemLogOutput: document.getElementById('system-log-output'),
    toastContainer: document.getElementById('toast-container')
};

// 3. Navigation Engine
function navigateTo(screenIndex) {
    state.currentScreen = screenIndex;
    const translatePercentage = -(screenIndex - 1) * 20; // 5 screens = 20% width each
    elements.screensWrapper.style.transform = `translateX(${translatePercentage}%)`;

    // Log navigation
    const screenNames = {
        1: '홈 대시보드',
        2: '밝기 조절',
        3: '현관 잠금',
        4: '가스벨브',
        5: '온도 조절'
    };
    addLog(`화면 이동: ${screenNames[screenIndex]}`, 'action');
}

// 4. Utility Functions: Logging & Toasting
function addLog(message, type = 'system') {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    logLine.innerHTML = `[${time}] ${message}`;
    elements.systemLogOutput.appendChild(logLine);
    elements.systemLogOutput.scrollTop = elements.systemLogOutput.scrollHeight;
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <span class="toast-icon">${type === 'success' ? '✓' : '⚠'}</span>
        <span class="toast-message">${message}</span>
    `;
    elements.toastContainer.appendChild(toast);

    // Auto remove after animation completes
    setTimeout(() => {
        toast.remove();
    }, 3000);
}

// Shortcut function for notifications
function showNotification(message) {
    showToast(message, 'success');
    addLog(message, 'system');
}

// 5. Theme Toggle Logic (Light / Dark)
function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    elements.themeToggleBtn.querySelector('.theme-icon').textContent = savedTheme === 'dark' ? '☀️' : '🌙';
}

elements.themeToggleBtn.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    elements.themeToggleBtn.querySelector('.theme-icon').textContent = newTheme === 'dark' ? '☀️' : '🌙';
    addLog(`테마 모드가 ${newTheme === 'dark' ? '다크' : '라이트'} 모드로 전환되었습니다.`, 'action');
});

// 6. Lighting Control Features (Screen 2)
function updateLightingUI() {
    // Set Slider value and fill background
    elements.brightnessSlider.value = state.brightness;
    elements.brightnessValText.textContent = `${state.brightness}%`;
    elements.sliderFill.style.width = `${state.brightness}%`;

    // 1. Update multi-light buttons (if any)
    elements.lightToggleButtons.forEach(btn => {
        const room = btn.dataset.room;
        const index = parseInt(btn.dataset.index);
        if (Array.isArray(state.lights[room])) {
            const isActive = state.lights[room][index];
            if (isActive) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        }
    });

    // 2. Update single buttons
    elements.lightSingleButtons.forEach(btn => {
        const room = btn.dataset.room;
        const isActive = state.lights[room];
        if (isActive) {
            btn.classList.add('active');
            btn.textContent = '켜짐';
        } else {
            btn.classList.remove('active');
            btn.textContent = '꺼짐';
        }
    });

    // 3. Update floor plan visuals in the Simulator & 3D Model
    updateFloorPlanLights();
    update3DLights();
}

function updateFloorPlanLights() {
    Object.keys(state.lights).forEach(room => {
        const roomElement = elements.simRooms[room];
        const status = state.lights[room];
        let isAnyLightOn = false;

        if (Array.isArray(status)) {
            // Room has multiple lights
            status.forEach((isOn, idx) => {
                const indicator = document.getElementById(`sim-${room}-light-${idx}`);
                if (indicator) {
                    if (isOn) {
                        indicator.classList.add('active');
                        indicator.style.opacity = `${0.3 + 0.7 * (state.brightness / 100)}`;
                        indicator.style.boxShadow = `0 0 ${8 + 12 * (state.brightness / 100)}px rgba(46, 204, 113, 1)`;
                        isAnyLightOn = true;
                    } else {
                        indicator.classList.remove('active');
                        indicator.style.opacity = '1';
                        indicator.style.boxShadow = 'none';
                    }
                }
            });
        } else {
            // Bathroom (Single light)
            const indicator = document.getElementById(`sim-${room}-light`);
            if (indicator) {
                if (status) {
                    indicator.classList.add('active');
                    indicator.style.opacity = `${0.3 + 0.7 * (state.brightness / 100)}`;
                    indicator.style.boxShadow = `0 0 ${8 + 12 * (state.brightness / 100)}px rgba(46, 204, 113, 1)`;
                    isAnyLightOn = true;
                } else {
                    indicator.classList.remove('active');
                    indicator.style.opacity = '1';
                    indicator.style.boxShadow = 'none';
                }
            }
        }

        // Apply room-level lighting effect glow
        if (roomElement) {
            if (isAnyLightOn) {
                roomElement.classList.add('light-active');
                roomElement.style.background = `radial-gradient(circle, rgba(46, 204, 113, ${0.05 + 0.15 * (state.brightness / 100)}) 0%, transparent 80%)`;
            } else {
                roomElement.classList.remove('light-active');
                roomElement.style.background = 'none';
            }
        }
    });
}

// Bind Lighting events
elements.brightnessSlider.addEventListener('input', (e) => {
    state.brightness = parseInt(e.target.value);
    updateLightingUI();
});

elements.brightnessSlider.addEventListener('change', () => {
    addLog(`전체 조명 밝기가 ${state.brightness}%로 변경되었습니다.`, 'action');
});

// "All Lights Off" Button Action
elements.btnAllLightsOff.addEventListener('click', () => {
    let changed = false;

    // Turn off multi lights
    Object.keys(state.lights).forEach(room => {
        if (Array.isArray(state.lights[room])) {
            state.lights[room].forEach((isOn, idx) => {
                if (isOn) {
                    state.lights[room][idx] = false;
                    changed = true;
                }
            });
        } else {
            if (state.lights[room]) {
                state.lights[room] = false;
                changed = true;
            }
        }
    });

    if (changed) {
        updateLightingUI();
        showToast('모든 조명이 꺼졌습니다.');
        addLog('전체 조명 끄기 버튼이 작동되었습니다.', 'action');
    } else {
        showToast('이미 모든 조명이 꺼져 있습니다.', 'error');
    }
});

// Toggle individual room lights
// Toggle multi-button room lights (if any)
elements.lightToggleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const room = btn.dataset.room;
        const index = parseInt(btn.dataset.index);
        if (Array.isArray(state.lights[room])) {
            state.lights[room][index] = !state.lights[room][index];
            const krRoomNames = { livingRoom: '거실', kitchen: '주방', roomA: '방a', roomB: '방b', masterRoom: '안방' };
            addLog(`${krRoomNames[room]} ${index + 1}조명이 ${state.lights[room][index] ? '켜졌습니다' : '꺼졌습니다'}.`, 'action');
            updateLightingUI();
        }
    });
});

// Toggle single room lights (all rooms)
elements.lightSingleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const room = btn.dataset.room;
        state.lights[room] = !state.lights[room];

        const krRoomNames = {
            livingRoom: '거실',
            kitchen: '주방',
            roomA: '방a',
            roomB: '방b',
            masterRoom: '안방',
            bathroom: '화장실',
            masterBathroom: '안방 화장실'
        };
        addLog(`${krRoomNames[room]} 조명이 ${state.lights[room] ? '켜졌습니다' : '꺼졌습니다'}.`, 'action');

        updateLightingUI();
    });
});

// 7. Door Lock Logic (Screen 3)
function updateDoorUI() {
    if (state.door.status === 'unlocked') {
        elements.btnDoorUnlock.classList.add('active');
        elements.btnDoorLock.classList.remove('active');
    } else {
        elements.btnDoorUnlock.classList.remove('active');
        elements.btnDoorLock.classList.add('active');
    }

    if (elements.simDoorStatus) {
        const simDoor = elements.simDoorStatus;
        if (state.door.status === 'unlocked') {
            simDoor.className = 'entrance-door-graphic unlocked';
            simDoor.querySelector('.door-status-text').textContent = 'UNLOCKED';
        } else {
            simDoor.className = 'entrance-door-graphic';
            simDoor.querySelector('.door-status-text').textContent = 'LOCKED';
        }
    }

    update3DDoor();

    if (state.door.secureLockActive) {
        if (elements.simDoorSecureLight) elements.simDoorSecureLight.className = 'secure-lock-active-light active';
        if (elements.btnToggleSecureLock) {
            elements.btnToggleSecureLock.textContent = '완전잠금 해제';
            elements.btnToggleSecureLock.classList.add('active');
        }
        if (elements.secureCountdownContainer) elements.secureCountdownContainer.style.display = 'flex';

        if (elements.countdownText) elements.countdownText.textContent = `${state.door.secureLockTimeRemaining}s`;

        const circumference = 251.2;
        const percentLeft = state.door.secureLockTimeRemaining / state.door.secureLockDuration;
        const strokeOffset = circumference * (1 - percentLeft);
        if (elements.countdownRingFill) elements.countdownRingFill.style.strokeDashoffset = strokeOffset;
    } else {
        if (elements.simDoorSecureLight) elements.simDoorSecureLight.className = 'secure-lock-active-light';
        if (elements.btnToggleSecureLock) {
            elements.btnToggleSecureLock.textContent = '완전잠금 시작';
            elements.btnToggleSecureLock.classList.remove('active');
        }
        if (elements.secureCountdownContainer) elements.secureCountdownContainer.style.display = 'none';
    }
}

elements.btnDoorLock.addEventListener('click', () => {
    if (state.door.status === 'locked') {
        showToast('이미 문이 잠겨 있습니다.', 'error');
        return;
    }
    state.door.status = 'locked';
    updateDoorUI();
    showToast('현관문이 잠겼습니다.');
    addLog('현관문 잠금 명령 실행.', 'action');
});

elements.btnDoorUnlock.addEventListener('click', () => {
    if (state.door.secureLockActive) {
        const card = document.querySelector('.secure-lock-card');
        card.classList.add('shake-animation');
        setTimeout(() => card.classList.remove('shake-animation'), 500);

        showToast('완전잠금 상태입니다! 열림 실패.', 'error');
        addLog('경고: 완전잠금 동작 중 열기 시도가 차단되었습니다.', 'warning');
        return;
    }

    if (state.door.status === 'unlocked') {
        showToast('이미 잠금이 해제되어 있습니다.', 'error');
        return;
    }
    state.door.status = 'unlocked';
    updateDoorUI();
    showToast('현관문 잠금이 해제되었습니다.');
    addLog('현관문 잠금 해제(열림) 명령 실행.', 'action');
});

if (elements.btnToggleSecureLock) {
    elements.btnToggleSecureLock.addEventListener('click', () => {
        if (state.door.secureLockActive) {
            cancelSecureLock();
            showToast('완전잠금이 해제되었습니다.');
            addLog('완전잠금 상태 강제 해제.', 'action');
        } else {
            const duration = elements.secureLockSelect ? parseInt(elements.secureLockSelect.value) : 60;
            startSecureLock(duration);
        }
    });
}

function startSecureLock(seconds) {
    state.door.status = 'locked';
    state.door.secureLockActive = true;
    state.door.secureLockDuration = seconds;
    state.door.secureLockTimeRemaining = seconds;

    updateDoorUI();
    showToast(`${seconds}초 동안 안전 완전잠금이 유지됩니다.`);
    addLog(`완전잠금 모드 시작 (${seconds}초간 문 열림 차단).`, 'warning');

    if (secureLockInterval) clearInterval(secureLockInterval);

    secureLockInterval = setInterval(() => {
        state.door.secureLockTimeRemaining--;
        if (state.door.secureLockTimeRemaining <= 0) {
            clearInterval(secureLockInterval);
            state.door.secureLockActive = false;
            updateDoorUI();
            showToast('완전잠금이 만료되어 일반 대기 모드로 복귀합니다.');
            addLog('완전잠금 설정 시간 만료. 도어 정상 대기 상태.', 'success');
        } else {
            updateDoorUI();
        }
    }, 1000);
}

function cancelSecureLock() {
    if (secureLockInterval) clearInterval(secureLockInterval);
    state.door.secureLockActive = false;
    state.door.secureLockTimeRemaining = 0;
    updateDoorUI();
}

// 8. Gas Valve Control Logic (Screen 4)
function updateGasUI() {
    const cardIconOpen = elements.btnGasOpen.querySelector('.valve-card-icon');
    const cardIconClose = elements.btnGasClose.querySelector('.valve-card-icon');

    if (state.gas.status === 'open') {
        elements.btnGasOpen.classList.add('active');
        elements.btnGasClose.classList.remove('active');
        cardIconOpen.classList.add('open');
        cardIconClose.classList.remove('close');

        if (elements.simGasValve) {
            if (state.gas.status === 'open') {
                elements.simGasValve.className = 'gas-valve-graphic open';
            } else {
                elements.simGasValve.className = 'gas-valve-graphic closed';
            }
        }

        update3DStove();

        if (elements.switchAutoGas) elements.switchAutoGas.checked = state.gas.autoGasLock;
        if (elements.switchAutoSafe) elements.switchAutoSafe.checked = state.gas.autoSafeCut;

        if (elements.badgeAutoGas) {
            elements.badgeAutoGas.textContent = state.gas.autoGasLock ? 'ON' : 'OFF';
            elements.badgeAutoGas.className = `toggle-status-badge ${state.gas.autoGasLock ? '' : 'off'}`;
        }

        if (elements.badgeAutoSafe) {
            elements.badgeAutoSafe.textContent = state.gas.autoSafeCut ? 'ON' : 'OFF';
            elements.badgeAutoSafe.className = `toggle-status-badge ${state.gas.autoSafeCut ? '' : 'off'}`;
        }
    }

    elements.btnGasOpen.addEventListener('click', () => {
        if (state.gas.status === 'open') {
            showToast('가스 밸브가 이미 열려 있습니다.', 'error');
            return;
        }

        const svgIcon = elements.btnGasOpen.querySelector('.valve-svg');
        svgIcon.classList.add('spin');
        setTimeout(() => svgIcon.classList.remove('spin'), 600);

        state.gas.status = 'open';
        updateGasUI();
        showToast('가스 밸브를 열었습니다.');
        addLog('가스 밸브 개방 명령 실행.', 'action');
    });

    elements.btnGasClose.addEventListener('click', () => {
        if (state.gas.status === 'closed') {
            showToast('가스 밸브가 이미 닫혀 있습니다.', 'error');
            return;
        }

        const svgIcon = elements.btnGasClose.querySelector('.valve-svg');
        svgIcon.classList.add('spin');
        setTimeout(() => svgIcon.classList.remove('spin'), 600);

        state.gas.status = 'closed';
        updateGasUI();
        showToast('가스 밸브를 안전하게 잠갔습니다.');
        addLog('가스 밸브 차단 명령 실행.', 'action');
    });

    elements.switchAutoGas.addEventListener('change', (e) => {
        state.gas.autoGasLock = e.target.checked;
        updateGasUI();
        addLog(`오토 가스 락 옵션이 ${state.gas.autoGasLock ? '활성화' : '비활성화'}되었습니다.`, 'action');
    });

    if (elements.switchAutoSafe) {
        elements.switchAutoSafe.addEventListener('change', (e) => {
            state.gas.autoSafeCut = e.target.checked;
            updateGasUI();
            addLog(`오토 세이프 컷 옵션이 ${state.gas.autoSafeCut ? '활성화' : '비활성화'}되었습니다.`, 'action');
        });
    }

    // 9. Temperature Settings & Aircon Logic (Screen 5)
    function updateTempUI() {
        // 1. Calculate and update house average temp display
        calculateAverageTemp();
        elements.targetTempDisplay.textContent = `${state.temp.target.toFixed(1)}°C`;
        elements.currentTempDisplay.textContent = `집안 평균 ${state.temp.current.toFixed(1)}°C`;

        // Kitchen room display remains specific to kitchen for the simulation details
        elements.simKitchenTemp.textContent = `${state.temp.rooms.kitchen.toFixed(1)}°C`;

        // Alert color if kitchen temp gets very high
        if (state.temp.rooms.kitchen >= 50.0) {
            elements.simKitchenTemp.classList.add('hot');
        } else {
            elements.simKitchenTemp.classList.remove('hot');
        }

        // Highlight mode buttons
        elements.modeButtons.forEach(btn => {
            if (btn.dataset.mode === state.temp.mode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });

        // 2. Aircon Controls sync
        if (state.aircon.active) {
            elements.badgeAircon.textContent = 'ON';
            elements.badgeAircon.classList.add('active');
            elements.btnToggleAircon.textContent = '에어컨 끄기';
            elements.btnToggleAircon.classList.add('active');
            elements.airconWindContainer.style.display = 'grid';
            elements.simAirconIndicator.classList.add('active');
        } else {
            elements.badgeAircon.textContent = 'OFF';
            elements.badgeAircon.classList.remove('active');
            elements.btnToggleAircon.textContent = '에어컨 켜기';
            elements.btnToggleAircon.classList.remove('active');
            elements.airconWindContainer.style.display = 'none';
            elements.simAirconIndicator.classList.remove('active');
        }

        // Update wind speed buttons
        [elements.windLowBtn, elements.windMediumBtn, elements.windHighBtn].forEach(btn => {
            if (btn.dataset.wind === state.aircon.wind) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    function calculateAverageTemp() {
        const r = state.temp.rooms;
        const avg = (r.livingRoom + r.kitchen + r.roomA + r.roomB + r.masterRoom) / 5;
        state.temp.current = avg;
    }

    // Target Temp adjusts
    elements.btnTempMinus.addEventListener('click', () => {
        if (state.temp.target > 16.0) {
            state.temp.target -= 0.5;
            updateTempUI();
            showToast(`희망 온도가 ${state.temp.target.toFixed(1)}°C로 조정되었습니다.`);
        }
    });

    elements.btnTempPlus.addEventListener('click', () => {
        if (state.temp.target < 30.0) {
            state.temp.target += 0.5;
            updateTempUI();
            showToast(`희망 온도가 ${state.temp.target.toFixed(1)}°C로 조정되었습니다.`);
        }
    });

    elements.modeButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            state.temp.mode = btn.dataset.mode;
            updateTempUI();
            const krModes = { cooling: '냉방', heating: '난방', fan: '송풍', off: '꺼짐' };
            addLog(`냉난방 시스템 운행 모드가 ${krModes[state.temp.mode]} 모드로 변경되었습니다.`, 'action');
        });
    });

    // Aircon actions
    elements.btnToggleAircon.addEventListener('click', () => {
        state.aircon.active = !state.aircon.active;
        updateTempUI();
        addLog(`거실 에어컨을 ${state.aircon.active ? '켰습니다 (목표온도 자동화 동작)' : '껐습니다'}.`, 'action');
        showToast(`거실 에어컨 ${state.aircon.active ? 'ON' : 'OFF'}`);
    });

    [elements.windLowBtn, elements.windMediumBtn, elements.windHighBtn].forEach(btn => {
        btn.addEventListener('click', () => {
            state.aircon.wind = btn.dataset.wind;
            updateTempUI();
            const krWind = { low: '약풍', medium: '중풍', high: '강풍' };
            addLog(`에어컨 바람 세기를 ${krWind[state.aircon.wind]}으로 설정했습니다.`, 'action');
        });
    });

    // Thermodynamics Engine: Simulates room heating/cooling propagation in real-time
    function initThermodynamics() {
        if (thermodynamicsInterval) clearInterval(thermodynamicsInterval);

        thermodynamicsInterval = setInterval(() => {
            const rooms = state.temp.rooms;
            const target = state.temp.target;
            const mode = state.temp.mode;
            const airconOn = state.aircon.active;
            const wind = state.aircon.wind;

            // Ambient temperature (26.5°C in summer, drifts here when no AC)
            const ambientTemp = 26.5;

            // 1. Calculate Aircon cooling/heating in Living Room
            if (airconOn && mode !== 'off') {
                let speed = 0.05; // low wind
                if (wind === 'medium') speed = 0.12;
                if (wind === 'high') speed = 0.20;

                if (mode === 'cooling') {
                    if (rooms.livingRoom > target) {
                        rooms.livingRoom = Math.max(target, rooms.livingRoom - speed);
                    } else if (rooms.livingRoom < target - 0.5) {
                        // Let it warm up slightly back to target
                        rooms.livingRoom = Math.min(target, rooms.livingRoom + 0.02);
                    }
                } else if (mode === 'heating') {
                    if (rooms.livingRoom < target) {
                        rooms.livingRoom = Math.min(target, rooms.livingRoom + speed);
                    } else if (rooms.livingRoom > target + 0.5) {
                        rooms.livingRoom = Math.max(target, rooms.livingRoom - 0.02);
                    }
                }
            } else {
                // AC is off, rooms slowly drift back towards outdoor ambient temperature
                const driftSpeed = 0.01;
                if (rooms.livingRoom < ambientTemp) {
                    rooms.livingRoom = Math.min(ambientTemp, rooms.livingRoom + driftSpeed);
                } else if (rooms.livingRoom > ambientTemp) {
                    rooms.livingRoom = Math.max(ambientTemp, rooms.livingRoom - driftSpeed);
                }
            }

            // 2. Heat/Cool propagation to other rooms
            const propagationRate = 0.03; // speed at which temperature spreads to other rooms
            Object.keys(rooms).forEach(room => {
                if (room === 'livingRoom') return; // Living room is controlled directly by AC

                // If kitchen heater scenario is NOT currently running, kitchen drifts towards living room.
                // If kitchen is heating up, kitchen is simulated in the kitchen event block, but still spreads heat slightly.
                if (room === 'kitchen' && kitchenHeatInterval) {
                    // Kitchen heats up rapidly, spreads heat to livingRoom slightly
                    rooms.livingRoom += (rooms.kitchen - rooms.livingRoom) * 0.01;
                    return;
                }

                // Normal room propagation (rooms try to match living room temp)
                const diff = rooms.livingRoom - rooms[room];
                rooms[room] += diff * propagationRate;

                // Ambient drift for rooms (small factor trying to pull rooms to ambient)
                rooms[room] += (ambientTemp - rooms[room]) * 0.002;
            });

            // 3. Sync GUI
            updateTempUI();
        }, 1000);
    }

    // 10. Simulation Scenario Triggers (Right Panel)

    // Shared function to trigger Away Mode (외출 모드)
    function executeLeaveHome(source = 'sim') {
        const isHomeBtn = (source === 'home');
        addLog(`외출 이벤트가 실행되었습니다. (${isHomeBtn ? '홈 화면' : '시뮬레이터'}에서 기동)`, 'action');
        showToast('외출 모드 가동!');

        // 1. Shut off all lights
        let lightsShut = false;
        Object.keys(state.lights).forEach(room => {
            if (Array.isArray(state.lights[room])) {
                state.lights[room].forEach((isOn, idx) => {
                    if (isOn) {
                        state.lights[room][idx] = false;
                        lightsShut = true;
                    }
                });
            } else {
                if (state.lights[room]) {
                    state.lights[room] = false;
                    lightsShut = true;
                }
            }
        });
        if (lightsShut) {
            updateLightingUI();
            addLog('외출 자동화: 전 객실 조명을 일괄 소등했습니다.', 'success');
        }

        // 2. Auto lock door
        if (state.door.status === 'unlocked') {
            state.door.status = 'locked';
            updateDoorUI();
            addLog('외출 자동화: 현관문을 잠갔습니다.', 'success');
        }

        // 3. Auto Gas Lock Action
        if (state.gas.autoGasLock) {
            if (state.gas.status === 'open') {
                state.gas.status = 'closed';
                updateGasUI();
                addLog('외출 자동화 [오토 가스 락]: 가스밸브를 자동 차단했습니다.', 'success');
                showToast('오토 가스 락 동작: 가스밸브 잠금');
            } else {
                addLog('외출 자동화 [오토 가스 락]: 가스밸브가 이미 잠겨있어 유지합니다.', 'system');
            }
        } else {
            addLog('외출 이벤트: 오토 가스 락 비활성화 상태로 가스밸브 상태를 유지합니다.', 'warning');
        }

        // 4. Auto turn off AC
        if (state.aircon.active) {
            state.aircon.active = false;
            updateTempUI();
            addLog('외출 자동화: 전력 절감을 위해 에어컨 운행을 중지했습니다.', 'success');
        }
    }

    // Bind both Home screen button and Simulator button to executeLeaveHome
    if (elements.btnTriggerLeaveHome) {
        elements.btnTriggerLeaveHome.addEventListener('click', () => executeLeaveHome('sim'));
    }
    if (elements.btnAwayModeHome) {
        elements.btnAwayModeHome.addEventListener('click', () => executeLeaveHome('home'));
    }

    // Scenario 2: Heat Up Kitchen (주방 온도 급상승)
    if (elements.btnTriggerKitchenHeat) {
        elements.btnTriggerKitchenHeat.addEventListener('click', () => {
            if (kitchenHeatInterval) {
                clearInterval(kitchenHeatInterval);
                kitchenHeatInterval = null;
                elements.btnTriggerKitchenHeat.querySelector('strong').textContent = '인덕션 화력 상승 (온도↑)';
                addLog('시뮬레이션: 온도 가열을 수동 중지했습니다.', 'system');
                return;
            }

            addLog('시뮬레이션: 주방 조리기 가열 시작. 온도가 급상승합니다.', 'warning');
            elements.btnTriggerKitchenHeat.querySelector('strong').textContent = '가열 중지 (클릭)';

            kitchenHeatInterval = setInterval(() => {
                state.temp.rooms.kitchen += 5.0; // Rapid local heating in kitchen
                updateTempUI();

                // Check if exceeds safety temperature threshold (50°C)
                if (state.temp.rooms.kitchen >= 50.0) {
                    clearInterval(kitchenHeatInterval);
                    kitchenHeatInterval = null;
                    elements.btnTriggerKitchenHeat.querySelector('strong').textContent = '인덕션 화력 상승 (온도↑)';

                    addLog(`경고: 주방 온도가 위험 한계선(${state.temp.rooms.kitchen.toFixed(1)}°C)에 도달했습니다!`, 'warning');

                    // Auto Safe Cut triggering
                    if (state.gas.autoSafeCut) {
                        if (state.gas.status === 'open') {
                            state.gas.status = 'closed';
                            updateGasUI();
                            addLog('비상 조치 [오토 세이프 컷]: 과열 감지로 가스 밸브를 비상 자동 차단했습니다!', 'success');
                            showToast('오토 세이프 컷 발동: 가스 차단!', 'error');
                        } else {
                            addLog('오토 세이프 컷 감지: 가스 밸브가 이미 닫혀있어 안전 상태입니다.', 'system');
                        }
                    } else {
                        addLog('경고: 오토 세이프 컷이 꺼져있어 가스 밸브가 차단되지 않았습니다! 위험!', 'warning');
                    }
                }
            }, 800);
        });
    }

    // Scenario 3: Reset Simulation (초기 리셋)
    if (elements.btnTriggerResetSim) {
        elements.btnTriggerResetSim.addEventListener('click', () => {
            // Clear all simulation intervals
            if (kitchenHeatInterval) {
                clearInterval(kitchenHeatInterval);
                kitchenHeatInterval = null;
                if (elements.btnTriggerKitchenHeat) elements.btnTriggerKitchenHeat.querySelector('strong').textContent = '인덕션 화력 상승 (온도↑)';
            }
            cancelSecureLock();

            // Revert state values
            state.brightness = 70;
            Object.keys(state.lights).forEach(room => {
                if (Array.isArray(state.lights[room])) {
                    state.lights[room] = [false, false];
                } else {
                    state.lights[room] = false;
                }
            });
            state.door.status = 'locked';
            state.gas.status = 'closed';
            state.gas.autoGasLock = true;
            state.gas.autoSafeCut = true;

            // Reset temperatures
            state.temp.rooms.livingRoom = 25.0;
            state.temp.rooms.kitchen = 24.7;
            state.temp.rooms.roomA = 24.0;
            state.temp.rooms.roomB = 24.2;
            state.temp.rooms.masterRoom = 24.6;
            calculateAverageTemp();

            state.temp.target = 22.0;
            state.temp.mode = 'cooling';
            state.aircon.active = false;
            state.aircon.wind = 'low';

            // Synchronize UI
            updateLightingUI();
            updateDoorUI();
            updateGasUI();
            updateTempUI();

            // Log & Toast
            showToast('시뮬레이터가 초기화되었습니다.');
            elements.systemLogOutput.innerHTML = `
            <div class="log-line system">[시스템] Aura Smart Home 시스템 초기화 성공.</div>
            <div class="log-line system">[시스템] 모든 스마트 기기 감시 대기 중.</div>
        `;
        });
    }

    // 11. Network Device Management
    // Tracks per-category connection state (true = connected, false = disconnected)
    const networkState = {
        light: true,
        lock: true,
        gas: true,
        temp: true
    };

    // Per-category device counts (how many devices belong to each group)
    const deviceCounts = {
        light: 4,  // 거실, 주방, 방A, 방B, 안방 → simplified as 4 groups
        lock: 2,   // 현관 도어락 + 보안 잠금 모듈
        gas: 3,    // 가스밸브 센서 + 오토세이프 + 자동차단
        temp: 3    // 에어컨 본체 + 온도센서 × 2
    };

    function getTotalConnected() {
        return Object.keys(networkState).reduce((sum, key) => {
            return sum + (networkState[key] ? deviceCounts[key] : 0);
        }, 0);
    }

    function getTotalDevices() {
        return Object.values(deviceCounts).reduce((a, b) => a + b, 0);
    }

    // Update the home-screen card visuals based on network state
    function updateCardNetworkUI() {
        const cardMap = {
            light: document.getElementById('btn-to-light'),
            lock: document.getElementById('btn-to-lock'),
            gas: document.getElementById('btn-to-gas'),
            temp: document.getElementById('btn-to-temp')
        };

        Object.keys(networkState).forEach(key => {
            const card = cardMap[key];
            if (!card) return;
            if (networkState[key]) {
                card.classList.remove('card-offline');
                // Remove offline badge if present
                const badge = card.querySelector('.offline-badge');
                if (badge) badge.remove();
            } else {
                card.classList.add('card-offline');
                // Add offline badge if not already present
                if (!card.querySelector('.offline-badge')) {
                    const badge = document.createElement('span');
                    badge.className = 'offline-badge';
                    badge.textContent = 'OFFLINE';
                    card.appendChild(badge);
                }
            }
        });
    }

    // Toggle connection state for a device category
    function toggleNetworkDevice(deviceKey) {
        networkState[deviceKey] = !networkState[deviceKey];
        const isConnected = networkState[deviceKey];

        // Update the simulator panel button UI
        const btn = document.getElementById(`net-toggle-${deviceKey}`);
        const statusLabel = document.getElementById(`net-status-${deviceKey}`);

        if (btn && statusLabel) {
            if (isConnected) {
                btn.classList.add('active');
                statusLabel.textContent = 'ON (정상)';
                statusLabel.style.color = 'var(--accent-green)';
            } else {
                btn.classList.remove('active');
                statusLabel.textContent = 'OFF (연결 끊김)';
                statusLabel.style.color = 'var(--accent-red, #e53e3e)';
            }
        }

        // Reflect offline state on home cards & 3D model
        updateCardNetworkUI();
        update3DLights();
        update3DDoor();
        update3DStove();

        // Log and toast
        const labelMap = {
            light: '💡 조명',
            lock: '🔒 도어락',
            gas: '🔥 가스밸브',
            temp: '❄️ 에어컨'
        };
        const label = labelMap[deviceKey] || deviceKey;
        const msg = isConnected
            ? `${label} 연결이 복구되었습니다.`
            : `${label} 연결이 끊겼습니다. (OFFLINE)`;
        showToast(msg);
        addLog(isConnected ? 'system' : 'warning', msg);
    }

    // Show connected device count when "기기 호환" nav tab is clicked
    function showConnectedDevicesCount() {
        const connected = getTotalConnected();
        const total = getTotalDevices();

        const disconnectedCategories = Object.keys(networkState)
            .filter(k => !networkState[k])
            .map(k => ({ light: '조명', lock: '도어락', gas: '가스밸브', temp: '에어컨' }[k]));

        let message = `현재 ${connected}개 / ${total}개 기기가 연결되어 있습니다.`;
        if (disconnectedCategories.length > 0) {
            message += ` (연결 끊김: ${disconnectedCategories.join(', ')})`;
        }
        showToast(message);
        addLog('system', `[기기호환] ${message}`);
    }

    // Wire up the simulator panel network toggle buttons
    document.addEventListener('DOMContentLoaded', () => {
        const netBtns = document.querySelectorAll('.net-toggle-btn');
        netBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const deviceKey = btn.getAttribute('data-device');
                if (deviceKey) toggleNetworkDevice(deviceKey);
            });
        });
    });

    // 12. Initial Startup
    function init() {
        initTheme();
        init3D(); // Initialize Three.js 3D House Simulator
        updateLightingUI();
        updateDoorUI();
        updateGasUI();
        updateTempUI();
        initThermodynamics(); // Start temperature simulator engine
        updateCardNetworkUI(); // Initialise card states
    }

    document.addEventListener('DOMContentLoaded', init);
    init();

    // --- 13. Three.js 3D Smart Home Engine & Real-time Integration ---
    let scene3D, camera3D, renderer3D, controls3D;
    let houseGroup3D, roofGroup3D;
    let roomLights3D = {};
    let isRoofVisible3D = false;
    let isNightMode3D = false;
    let doorMesh3D = null;
    let stoveMesh3D = null;

    const roomKeyMapAppTo3D = {
        livingRoom: 'living',
        kitchen: 'kitchen',
        roomA: 'room-a',
        roomB: 'room-b',
        masterRoom: 'master-bed',
        bathroom: 'shared-bath',
        masterBathroom: 'master-bath'
    };

    const ROOMS_3D = {
        'master-bed': { name: '안방', center: [-3.25, 0, -3.4], size: [5.5, 3.2] },
        'master-bath': { name: '안방 욕실', center: [1.0, 0, -3.4], size: [3.0, 3.2] },
        'room-a': { name: '방A', center: [4.25, 0, -3.4], size: [3.5, 3.2] },
        'living': { name: '거실', center: [-1.75, 0, 0.0], size: [8.5, 3.6] },
        'shared-bath': { name: '공용 욕실', center: [4.25, 0, 0.0], size: [3.5, 3.6] },
        'room-b': { name: '방B', center: [-4.4, 0, 3.4], size: [3.2, 3.2] },
        'kitchen': { name: '주방 & 가스', center: [-0.15, 0, 3.4], size: [5.3, 3.2] },
        'entrance': { name: '현관문', center: [4.25, 0, 3.4], size: [3.5, 3.2] }
    };

    let sunLight3D, ambientLight3D;

    function init3D() {
        const container = document.getElementById('webgl-container');
        if (!container || typeof THREE === 'undefined') return;

        // Scene
        scene3D = new THREE.Scene();
        scene3D.background = new THREE.Color(0x0b1120);
        scene3D.fog = new THREE.FogExp2(0x0b1120, 0.018);

        // Camera
        camera3D = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
        camera3D.position.set(16, 18, 22);

        // Renderer
        renderer3D = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
        renderer3D.setSize(container.clientWidth, container.clientHeight);
        renderer3D.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer3D.shadowMap.enabled = true;
        renderer3D.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer3D.toneMapping = THREE.ACESFilmicToneMapping;
        renderer3D.toneMappingExposure = 1.1;
        container.appendChild(renderer3D.domElement);

        // Controls
        controls3D = new THREE.OrbitControls(camera3D, renderer3D.domElement);
        controls3D.enableDamping = true;
        controls3D.dampingFactor = 0.05;
        controls3D.maxPolarAngle = Math.PI / 2 - 0.02;
        controls3D.minDistance = 4;
        controls3D.maxDistance = 50;
        controls3D.target.set(0, 0, 0);

        // Lighting
        ambientLight3D = new THREE.AmbientLight(0xffffff, 0.6);
        scene3D.add(ambientLight3D);

        sunLight3D = new THREE.DirectionalLight(0xfffaed, 1.2);
        sunLight3D.position.set(25, 35, 20);
        sunLight3D.castShadow = true;
        sunLight3D.shadow.mapSize.width = 1024;
        sunLight3D.shadow.mapSize.height = 1024;
        scene3D.add(sunLight3D);

        // House Model
        houseGroup3D = new THREE.Group();
        scene3D.add(houseGroup3D);

        buildGround3D();
        buildFloorsAndWalls3D();
        buildFurniture3D();
        buildRoof3D();

        // Resize Handler
        window.addEventListener('resize', onWindowResize3D);
        setTimeout(onWindowResize3D, 100);

        // Initial 3D sync
        update3DLights();
        update3DDoor();
        update3DStove();

        // Animation Loop
        animate3D();
    }

    function buildGround3D() {
        const grassGeo = new THREE.PlaneGeometry(36, 32);
        const grassMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
        const grass = new THREE.Mesh(grassGeo, grassMat);
        grass.rotation.x = -Math.PI / 2;
        grass.position.y = -0.15;
        grass.receiveShadow = true;
        houseGroup3D.add(grass);

        const foundationGeo = new THREE.BoxGeometry(13.2, 0.3, 11.2);
        const foundationMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 });
        const foundation = new THREE.Mesh(foundationGeo, foundationMat);
        foundation.position.set(0, -0.15, 0);
        foundation.receiveShadow = true;
        houseGroup3D.add(foundation);
    }

    function buildFloorsAndWalls3D() {
        const woodMat = new THREE.MeshStandardMaterial({ color: 0xba8c63, roughness: 0.4 });
        const tileMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.2 });
        const darkTileMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3 });

        const outerWallMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
        const innerWallMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.6 });

        for (const [key, room] of Object.entries(ROOMS_3D)) {
            const [cx, cy, cz] = room.center;
            const [rw, rd] = room.size;

            let fMat = woodMat;
            if (key.includes('bath')) fMat = tileMat;
            if (key === 'kitchen') fMat = darkTileMat;

            const floorGeo = new THREE.BoxGeometry(rw - 0.05, 0.08, rd - 0.05);
            const floorMesh = new THREE.Mesh(floorGeo, fMat);
            floorMesh.position.set(cx, 0.04, cz);
            floorMesh.receiveShadow = true;
            houseGroup3D.add(floorMesh);

            const roomLight = new THREE.PointLight(0xfffae6, 0.9, 8);
            roomLight.position.set(cx, 2.3, cz);
            roomLight.castShadow = true;
            houseGroup3D.add(roomLight);
            roomLights3D[key] = roomLight;
        }

        const wallHeight = 2.6;
        const wallThick = 0.18;

        createBoxWall3D(0, wallHeight / 2, -5.0, 12.2, wallHeight, wallThick, outerWallMat);
        createBoxWall3D(-2.8, wallHeight / 2, 5.0, 6.6, wallHeight, wallThick, outerWallMat);
        createBoxWall3D(4.25, wallHeight / 2 + 0.8, 5.0, 3.5, 1.0, wallThick, outerWallMat);
        createBoxWall3D(-6.0, wallHeight / 2, 0, wallThick, wallHeight, 10.2, outerWallMat);
        createBoxWall3D(6.0, wallHeight / 2, 0, wallThick, wallHeight, 10.2, outerWallMat);

        createBoxWall3D(-0.35, wallHeight / 2, -1.8, 11.3, wallHeight, 0.12, innerWallMat);
        createBoxWall3D(-0.35, wallHeight / 2, 1.8, 11.3, wallHeight, 0.12, innerWallMat);

        createBoxWall3D(-0.5, wallHeight / 2, -3.4, 0.12, wallHeight, 3.2, innerWallMat);
        createBoxWall3D(2.5, wallHeight / 2, -3.4, 0.12, wallHeight, 3.2, innerWallMat);
        createBoxWall3D(2.5, wallHeight / 2, 0.0, 0.12, wallHeight, 3.6, innerWallMat);
        createBoxWall3D(2.5, wallHeight / 2, 3.4, 0.12, wallHeight, 3.2, innerWallMat);
        createBoxWall3D(-2.8, wallHeight / 2, 3.4, 0.12, wallHeight, 3.2, innerWallMat);

        // Front Door Mesh
        const doorGeo = new THREE.BoxGeometry(1.2, 2.1, 0.08);
        const doorMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });
        doorMesh3D = new THREE.Mesh(doorGeo, doorMat);
        doorMesh3D.position.set(4.25 - 0.6, 1.05, 5.0);
        doorGeo.translate(0.6, 0, 0);
        houseGroup3D.add(doorMesh3D);
    }

    function createBoxWall3D(x, y, z, w, h, d, mat) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        houseGroup3D.add(mesh);
        return mesh;
    }

    function buildFurniture3D() {
        // Master Bed
        const bed = createBoxMesh3D(2.0, 0.4, 2.2, 0x334155);
        const mattress = createBoxMesh3D(1.9, 0.25, 2.0, 0xffffff);
        mattress.position.y = 0.32;
        const bedGroup = new THREE.Group();
        bedGroup.add(bed, mattress);
        bedGroup.position.set(-3.5, 0.2, -3.8);
        houseGroup3D.add(bedGroup);

        // Living Sofa & TV
        const sofa = createBoxMesh3D(3.2, 0.4, 1.0, 0x334155);
        sofa.position.set(-1.5, 0.2, 0.0);
        const tvScreen = createBoxMesh3D(2.2, 1.2, 0.08, 0x020617);
        tvScreen.position.set(-1.5, 1.2, -1.4);
        houseGroup3D.add(sofa, tvScreen);

        // Kitchen Counter & Stove
        const counter = createBoxMesh3D(3.2, 0.85, 0.7, 0x1e293b);
        counter.position.set(-0.15, 0.42, 3.4);
        stoveMesh3D = createBoxMesh3D(0.8, 0.05, 0.5, 0x334155);
        stoveMesh3D.position.set(-0.95, 0.87, 3.4);
        houseGroup3D.add(counter, stoveMesh3D);
    }

    function createBoxMesh3D(w, h, d, colorHex) {
        const geo = new THREE.BoxGeometry(w, h, d);
        const mat = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.4 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        return mesh;
    }

    function buildRoof3D() {
        roofGroup3D = new THREE.Group();
        const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 });

        const slope1Geo = new THREE.BoxGeometry(6.8, 0.2, 11.6);
        const slope1 = new THREE.Mesh(slope1Geo, roofMat);
        slope1.position.set(-3.2, 4.0, 0);
        slope1.rotation.z = Math.PI / 10;

        const slope2Geo = new THREE.BoxGeometry(6.8, 0.2, 11.6);
        const slope2 = new THREE.Mesh(slope2Geo, roofMat);
        slope2.position.set(3.2, 4.0, 0);
        slope2.rotation.z = -Math.PI / 10;

        roofGroup3D.add(slope1, slope2);
        roofGroup3D.visible = isRoofVisible3D;
        houseGroup3D.add(roofGroup3D);
    }

    function update3DLights() {
        if (!roomLights3D) return;
        Object.keys(roomKeyMapAppTo3D).forEach(appRoom => {
            const key3D = roomKeyMapAppTo3D[appRoom];
            const light3D = roomLights3D[key3D];
            if (!light3D) return;

            const isNetworkOn = networkState.light;
            const status = state.lights[appRoom];
            const isOn = isNetworkOn && (Array.isArray(status) ? status.some(Boolean) : Boolean(status));

            light3D.visible = isOn;
            if (isOn) {
                light3D.intensity = 0.3 + 0.9 * (state.brightness / 100);
            }
        });
    }

    function update3DDoor() {
        if (!doorMesh3D || typeof TWEEN === 'undefined') return;
        const isNetworkOn = networkState.lock;
        const targetY = (state.door.status === 'unlocked' && isNetworkOn) ? -Math.PI / 2.2 : 0;

        new TWEEN.Tween(doorMesh3D.rotation)
            .to({ y: targetY }, 600)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
    }

    function update3DStove() {
        if (!stoveMesh3D) return;
        const isNetworkOn = networkState.gas;
        if (state.gas.status === 'open' && isNetworkOn) {
            stoveMesh3D.material.color.setHex(0xff3300);
        } else {
            stoveMesh3D.material.color.setHex(0x334155);
        }
    }

    function setViewMode(mode) {
        document.querySelectorAll('.sim-3d-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-view-${mode}`)?.classList.add('active');

        let targetCamPos, targetLookAt;

        if (mode === 'dollhouse') {
            isRoofVisible3D = false;
            roofGroup3D.visible = false;
            targetCamPos = { x: 16, y: 18, z: 20 };
            targetLookAt = { x: 0, y: 0, z: 0 };
        } else if (mode === 'full') {
            isRoofVisible3D = true;
            roofGroup3D.visible = true;
            targetCamPos = { x: 20, y: 15, z: 22 };
            targetLookAt = { x: 0, y: 1.5, z: 0 };
        } else if (mode === 'top') {
            isRoofVisible3D = false;
            roofGroup3D.visible = false;
            targetCamPos = { x: 0.001, y: 26, z: 0 };
            targetLookAt = { x: 0, y: 0, z: 0 };
        } else if (mode === 'fpv') {
            isRoofVisible3D = false;
            roofGroup3D.visible = false;
            targetCamPos = { x: -1.75, y: 1.6, z: 2.2 };
            targetLookAt = { x: -1.75, y: 1.5, z: -2.0 };
        }

        const roofText = document.getElementById('roof-btn-text');
        if (roofText) roofText.innerText = isRoofVisible3D ? '지붕 열기' : '지붕 닫기';

        animateCamera3D(targetCamPos, targetLookAt);
    }

    function focusRoom(roomKey) {
        const room = ROOMS_3D[roomKey];
        if (!room) return;

        const [cx, cy, cz] = room.center;
        const targetCamPos = { x: cx + 4, y: 7, z: cz + 6 };
        const targetLookAt = { x: cx, y: 0.8, z: cz };

        animateCamera3D(targetCamPos, targetLookAt);
    }

    function toggleRoof() {
        isRoofVisible3D = !isRoofVisible3D;
        if (roofGroup3D) roofGroup3D.visible = isRoofVisible3D;
        const roofText = document.getElementById('roof-btn-text');
        if (roofText) roofText.innerText = isRoofVisible3D ? '지붕 열기' : '지붕 닫기';
    }

    function toggleDayNight() {
        isNightMode3D = !isNightMode3D;
        const btnText = document.getElementById('daynight-btn-text');

        if (isNightMode3D) {
            scene3D.background = new THREE.Color(0x030712);
            if (scene3D.fog) scene3D.fog.color.setHex(0x030712);
            sunLight3D.intensity = 0.15;
            ambientLight3D.intensity = 0.25;
            if (btnText) btnText.innerText = '주간 모드';
        } else {
            scene3D.background = new THREE.Color(0x0b1120);
            if (scene3D.fog) scene3D.fog.color.setHex(0x0b1120);
            sunLight3D.intensity = 1.2;
            ambientLight3D.intensity = 0.6;
            if (btnText) btnText.innerText = '야간 모드';
        }
    }

    function resetCameraView() {
        setViewMode('dollhouse');
    }

    function animateCamera3D(targetPos, targetTarget, duration = 1000) {
        if (!camera3D || !controls3D || typeof TWEEN === 'undefined') return;

        new TWEEN.Tween(camera3D.position)
            .to(targetPos, duration)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();

        new TWEEN.Tween(controls3D.target)
            .to(targetTarget, duration)
            .easing(TWEEN.Easing.Cubic.Out)
            .start();
    }

    function onWindowResize3D() {
        const container = document.getElementById('webgl-container');
        if (!container || !renderer3D || !camera3D) return;

        camera3D.aspect = container.clientWidth / container.clientHeight;
        camera3D.updateProjectionMatrix();
        renderer3D.setSize(container.clientWidth, container.clientHeight);
    }

    function animate3D() {
        requestAnimationFrame(animate3D);
        if (typeof TWEEN !== 'undefined') TWEEN.update();
        if (controls3D) controls3D.update();
        if (renderer3D && scene3D && camera3D) renderer3D.render(scene3D, camera3D);
    }
}
