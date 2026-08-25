// AURA 3D Smart Home Digital Twin - Core Application Logic & Three.js Engine

// =========================================================================
// 1. Central Application State
// =========================================================================
const state = {
    currentScreen: 1,
    brightness: 70, // 10% to 100%
    lights: {
        livingRoom: false,
        masterRoom: false,
        roomA: false,
        roomB: false,
        kitchen: false,
        bathroom: false
    },
    door: {
        status: 'locked', // 'locked' | 'unlocked'
        rotation: 0 // for 3D door animation
    },
    gas: {
        status: 'closed', // 'open' | 'closed'
        autoGasLock: true,
        autoSafeCut: true
    },
    temp: {
        current: 24.5, // Apartment average
        target: 22.0,
        rooms: {
            livingRoom: 25.0,
            masterRoom: 24.6,
            roomA: 24.0,
            roomB: 24.2,
            kitchen: 24.7,
            bathroom: 24.0
        }
    },
    aircon: {
        active: false,
        wind: 'low' // 'low' | 'medium' | 'high'
    },
    boiler: {
        active: false,
        mode: 'indoor', // 'indoor' | 'ondol' | 'eco' | 'water'
        targetTemp: 24.0,
        ondolTemp: 55.0
    },
    humidity: {
        current: 52.0, // % RH
        target: 50.0,
        mode: 'auto' // 'auto' | 'humidify' | 'dehumidify' | 'off'
    },
    effects3D: {
        ondol: true,
        acWind: true,
        labels: true
    }
};

// Timer references for physical simulations
let thermodynamicsInterval = null;
let kitchenHeatInterval = null;

// =========================================================================
// 2. DOM Elements Cache
// =========================================================================
const elements = {
    // Navigation & Global
    screensWrapper: document.getElementById('screens-wrapper'),
    themeToggleBtn: document.getElementById('theme-toggle'),
    systemLogOutput: document.getElementById('system-log-output'),
    toastContainer: document.getElementById('toast-container'),
    livePhoneTime: document.getElementById('live-phone-time'),

    // Screen 2: Light Controls
    brightnessSlider: document.getElementById('global-brightness-slider'),
    brightnessValText: document.getElementById('global-brightness-val'),
    sliderFill: document.getElementById('slider-fill'),
    btnAllLightsOff: document.getElementById('btn-all-lights-off'),
    lightSingleButtons: document.querySelectorAll('.light-toggle-single-btn'),

    // Screen 3: Door Lock
    btnDoorUnlock: document.getElementById('btn-door-unlock'),
    btnDoorLock: document.getElementById('btn-door-lock'),

    // Screen 4: Gas Valve
    btnGasOpen: document.getElementById('btn-gas-open'),
    btnGasClose: document.getElementById('btn-gas-close'),
    switchAutoGas: document.getElementById('switch-auto-gas'),
    switchAutoSafe: document.getElementById('switch-auto-safe'),
    badgeAutoGas: document.getElementById('badge-auto-gas'),
    badgeAutoSafe: document.getElementById('badge-auto-safe'),

    // Screen 5: Climate (Temp, Boiler, Humidity, Aircon)
    targetTempDisplay: document.getElementById('target-temp-display'),
    currentTempDisplay: document.getElementById('current-temp-display'),
    btnTempMinus: document.getElementById('btn-temp-minus'),
    btnTempPlus: document.getElementById('btn-temp-plus'),

    // Boiler elements
    btnToggleBoiler: document.getElementById('btn-toggle-boiler'),
    badgeBoiler: document.getElementById('badge-boiler'),
    boilerSubStatus: document.getElementById('boiler-sub-status'),
    boilerModesContainer: document.getElementById('boiler-modes-container'),
    boilerModeButtons: document.querySelectorAll('[data-boiler-mode]'),
    boilerTargetVal: document.getElementById('boiler-target-val'),
    btnBoilerMinus: document.getElementById('btn-boiler-minus'),
    btnBoilerPlus: document.getElementById('btn-boiler-plus'),

    // Humidity elements
    currentHumidityBadge: document.getElementById('current-humidity-badge'),
    humiditySubStatus: document.getElementById('humidity-sub-status'),
    humModeButtons: document.querySelectorAll('[data-hum-mode]'),
    targetHumidityVal: document.getElementById('target-humidity-val'),
    btnHumMinus: document.getElementById('btn-hum-minus'),
    btnHumPlus: document.getElementById('btn-hum-plus'),

    // Aircon elements
    btnToggleAircon: document.getElementById('btn-toggle-aircon'),
    badgeAircon: document.getElementById('badge-aircon'),
    airconWindContainer: document.getElementById('aircon-wind-container'),
    windLowBtn: document.getElementById('wind-low'),
    windMediumBtn: document.getElementById('wind-medium'),
    windHighBtn: document.getElementById('wind-high'),

    // Home Screen Trigger
    btnAwayModeHome: document.getElementById('btn-away-mode-home'),

    // 3D Toolbar elements
    btnCamIso: document.getElementById('btn-cam-iso'),
    btnCamTop: document.getElementById('btn-cam-top'),
    btnCamLiving: document.getElementById('btn-cam-living'),
    btnCamMaster: document.getElementById('btn-cam-master'),
    btnCamKitchen: document.getElementById('btn-cam-kitchen'),
    btnCamReset: document.getElementById('btn-cam-reset'),
    btnToggleOndolFx: document.getElementById('btn-toggle-ondol-fx'),
    btnToggleAcFx: document.getElementById('btn-toggle-ac-fx'),
    btnToggleLabelsFx: document.getElementById('btn-toggle-labels-fx')
};

// =========================================================================
// 3. Navigation Engine
// =========================================================================
function navigateTo(screenIndex) {
    state.currentScreen = screenIndex;
    const translatePercentage = -(screenIndex - 1) * 20; // 5 screens = 20% each
    elements.screensWrapper.style.transform = `translateX(${translatePercentage}%)`;

    const screenNames = {
        1: '홈 대시보드',
        2: '조명 및 밝기',
        3: '현관 도어락',
        4: '가스 밸브 제어',
        5: '온도 · 습도 · 보일러'
    };
    addLog(`화면 이동: ${screenNames[screenIndex]}`, 'action');
}

// =========================================================================
// 4. Utility: Logging, Toast & Clock
// =========================================================================
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
    setTimeout(() => toast.remove(), 3000);
}

function showNotification(message) {
    showToast(message, 'success');
    addLog(message, 'system');
}

function updateClock() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    if (elements.livePhoneTime) elements.livePhoneTime.textContent = `${hours}:${minutes}`;
}
setInterval(updateClock, 1000);
updateClock();

// =========================================================================
// 5. Theme Toggle Engine (Light / Dark)
// =========================================================================
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
    if (threeApp && threeApp.updateTheme) threeApp.updateTheme(newTheme);
});

// =========================================================================
// 6. UI Synchronization Functions
// =========================================================================

// --- 6.1 Lighting UI ---
function updateLightingUI() {
    elements.brightnessSlider.value = state.brightness;
    elements.brightnessValText.textContent = `${state.brightness}%`;
    elements.sliderFill.style.width = `${state.brightness}%`;

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

    if (threeApp && threeApp.syncLights) threeApp.syncLights();
}

elements.brightnessSlider.addEventListener('input', (e) => {
    state.brightness = parseInt(e.target.value);
    updateLightingUI();
});

elements.brightnessSlider.addEventListener('change', () => {
    addLog(`전체 조명 밝기가 ${state.brightness}%로 변경되었습니다.`, 'action');
});

elements.btnAllLightsOff.addEventListener('click', () => {
    let changed = false;
    Object.keys(state.lights).forEach(room => {
        if (state.lights[room]) {
            state.lights[room] = false;
            changed = true;
        }
    });
    if (changed) {
        updateLightingUI();
        showToast('모든 조명이 일괄 소등되었습니다.');
        addLog('전체 조명 일괄 끄기 실행.', 'action');
    } else {
        showToast('이미 모든 조명이 꺼져 있습니다.', 'error');
    }
});

elements.lightSingleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const room = btn.dataset.room;
        state.lights[room] = !state.lights[room];
        const krNames = {
            livingRoom: '거실',
            masterRoom: '안방',
            roomA: '방 A',
            roomB: '방 B',
            kitchen: '주방',
            bathroom: '화장실'
        };
        addLog(`${krNames[room]} 조명이 ${state.lights[room] ? '켜졌습니다' : '꺼졌습니다'}.`, 'action');
        updateLightingUI();
    });
});

// --- 6.2 Door Lock UI ---
function updateDoorUI() {
    if (state.door.status === 'unlocked') {
        elements.btnDoorUnlock.classList.add('active');
        elements.btnDoorLock.classList.remove('active');
    } else {
        elements.btnDoorUnlock.classList.remove('active');
        elements.btnDoorLock.classList.add('active');
    }
    if (threeApp && threeApp.syncDoor) threeApp.syncDoor();
}

elements.btnDoorLock.addEventListener('click', () => {
    if (state.door.status === 'locked') {
        showToast('현관문이 이미 잠겨 있습니다.', 'error');
        return;
    }
    state.door.status = 'locked';
    updateDoorUI();
    showToast('현관문이 안전하게 잠겼습니다.');
    addLog('현관문 잠금 명령 실행.', 'action');
});

elements.btnDoorUnlock.addEventListener('click', () => {
    if (state.door.status === 'unlocked') {
        showToast('현관문이 이미 열려 있습니다.', 'error');
        return;
    }
    state.door.status = 'unlocked';
    updateDoorUI();
    showToast('현관문 잠금이 해제되었습니다.');
    addLog('현관문 잠금 해제(열림) 명령 실행.', 'action');
});

// --- 6.3 Gas Valve UI ---
function updateGasUI() {
    const cardIconOpen = elements.btnGasOpen.querySelector('.valve-card-icon');
    const cardIconClose = elements.btnGasClose.querySelector('.valve-card-icon');

    if (state.gas.status === 'open') {
        elements.btnGasOpen.classList.add('active');
        elements.btnGasClose.classList.remove('active');
        cardIconOpen.classList.add('open');
        cardIconClose.classList.remove('close');
    } else {
        elements.btnGasOpen.classList.remove('active');
        elements.btnGasClose.classList.add('active');
        cardIconOpen.classList.remove('open');
        cardIconClose.classList.add('close');
    }

    elements.switchAutoGas.checked = state.gas.autoGasLock;
    elements.switchAutoSafe.checked = state.gas.autoSafeCut;

    elements.badgeAutoGas.textContent = state.gas.autoGasLock ? 'ON' : 'OFF';
    elements.badgeAutoGas.className = `toggle-status-badge ${state.gas.autoGasLock ? '' : 'off'}`;

    elements.badgeAutoSafe.textContent = state.gas.autoSafeCut ? 'ON' : 'OFF';
    elements.badgeAutoSafe.className = `toggle-status-badge ${state.gas.autoSafeCut ? '' : 'off'}`;

    if (threeApp && threeApp.syncGas) threeApp.syncGas();
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

elements.switchAutoSafe.addEventListener('change', (e) => {
    state.gas.autoSafeCut = e.target.checked;
    updateGasUI();
    addLog(`과열 자동 차단 옵션이 ${state.gas.autoSafeCut ? '활성화' : '비활성화'}되었습니다.`, 'action');
});

// --- 6.4 Temperature, Boiler, Humidity & Aircon UI ---
function calculateAverageTemp() {
    const r = state.temp.rooms;
    const avg = (r.livingRoom + r.masterRoom + r.roomA + r.roomB + r.kitchen + r.bathroom) / 6;
    state.temp.current = avg;
}

function updateTempUI() {
    calculateAverageTemp();
    elements.targetTempDisplay.textContent = `${state.temp.target.toFixed(1)}°C`;
    elements.currentTempDisplay.textContent = `실내 평균 ${state.temp.current.toFixed(1)}°C`;

    // Sync Aircon
    if (state.aircon.active) {
        elements.badgeAircon.textContent = 'ON';
        elements.badgeAircon.classList.add('active');
        elements.btnToggleAircon.textContent = '에어컨 끄기';
        elements.btnToggleAircon.classList.add('active');
        elements.airconWindContainer.style.display = 'grid';
    } else {
        elements.badgeAircon.textContent = 'OFF';
        elements.badgeAircon.classList.remove('active');
        elements.btnToggleAircon.textContent = '에어컨 켜기';
        elements.btnToggleAircon.classList.remove('active');
        elements.airconWindContainer.style.display = 'none';
    }

    [elements.windLowBtn, elements.windMediumBtn, elements.windHighBtn].forEach(btn => {
        if (btn.dataset.wind === state.aircon.wind) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    // Sync Boiler UI
    updateBoilerUI();

    // Sync Humidity UI
    updateHumidityUI();

    if (threeApp && threeApp.syncThermodynamics) threeApp.syncThermodynamics();
}

function updateBoilerUI() {
    if (state.boiler.active) {
        const modeLabels = {
            indoor: '실내난방 ON',
            ondol: '온돌바닥 ON',
            eco: '외출절전 ON',
            water: '온수전용 ON'
        };
        elements.badgeBoiler.textContent = modeLabels[state.boiler.mode] || 'ON';
        elements.badgeBoiler.classList.add('active');
        elements.btnToggleBoiler.textContent = '보일러 끄기';
        elements.btnToggleBoiler.classList.add('active');
        elements.boilerModesContainer.style.display = 'flex';
        elements.boilerSubStatus.textContent = `설정: ${state.boiler.targetTemp.toFixed(1)}°C / 바닥 난방 연동`;
    } else {
        elements.badgeBoiler.textContent = 'OFF';
        elements.badgeBoiler.classList.remove('active');
        elements.btnToggleBoiler.textContent = '보일러 켜기';
        elements.btnToggleBoiler.classList.remove('active');
        elements.boilerModesContainer.style.display = 'none';
        elements.boilerSubStatus.textContent = '바닥 온돌 연동 대기';
    }

    elements.boilerTargetVal.textContent = `${state.boiler.targetTemp.toFixed(1)}°C`;

    elements.boilerModeButtons.forEach(btn => {
        if (btn.dataset.boilerMode === state.boiler.mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateHumidityUI() {
    elements.currentHumidityBadge.textContent = `${Math.round(state.humidity.current)}% RH`;
    elements.targetHumidityVal.textContent = `${Math.round(state.humidity.target)}% RH`;

    const hum = state.humidity.current;
    if (hum >= 40 && hum <= 60) {
        elements.humiditySubStatus.textContent = '쾌적 상태 (40~60% RH 유지 중)';
        elements.currentHumidityBadge.style.color = 'var(--accent-blue)';
    } else if (hum < 40) {
        elements.humiditySubStatus.textContent = '건조 주의 (습도 보충 권장)';
        elements.currentHumidityBadge.style.color = 'var(--accent-red)';
    } else {
        elements.humiditySubStatus.textContent = '다습 주의 (제습 권장)';
        elements.currentHumidityBadge.style.color = 'var(--accent-blue)';
    }

    elements.humModeButtons.forEach(btn => {
        if (btn.dataset.humMode === state.humidity.mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Target Temp Button Listeners
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

// Aircon Listeners
elements.btnToggleAircon.addEventListener('click', () => {
    state.aircon.active = !state.aircon.active;
    updateTempUI();
    addLog(`거실 에어컨을 ${state.aircon.active ? '켰습니다 (냉방 시뮬레이션 가동)' : '껐습니다'}.`, 'action');
    showToast(`거실 에어컨 ${state.aircon.active ? 'ON' : 'OFF'}`);
});

[elements.windLowBtn, elements.windMediumBtn, elements.windHighBtn].forEach(btn => {
    btn.addEventListener('click', () => {
        state.aircon.wind = btn.dataset.wind;
        updateTempUI();
        const krWind = { low: '약풍', medium: '중풍', high: '강풍' };
        addLog(`에어컨 풍속을 [${krWind[state.aircon.wind]}]으로 설정했습니다.`, 'action');
    });
});

// Boiler Listeners
elements.btnToggleBoiler.addEventListener('click', () => {
    state.boiler.active = !state.boiler.active;
    updateTempUI();
    addLog(`스마트 보일러를 ${state.boiler.active ? '가동했습니다 (온돌 바닥 난방 연동)' : '정지했습니다'}.`, 'action');
    showToast(`스마트 보일러 ${state.boiler.active ? 'ON (온돌 가동)' : 'OFF'}`);
});

elements.boilerModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        state.boiler.mode = btn.dataset.boilerMode;
        updateBoilerUI();
        const krModes = {
            indoor: '실내 난방',
            ondol: '온돌(바닥) 난방',
            eco: '외출 절전 난방',
            water: '온수 전용'
        };
        addLog(`보일러 난방 모드가 [${krModes[state.boiler.mode]}] 모드로 변경되었습니다.`, 'action');
    });
});

elements.btnBoilerMinus.addEventListener('click', () => {
    if (state.boiler.targetTemp > 18.0) {
        state.boiler.targetTemp -= 0.5;
        updateBoilerUI();
        showToast(`보일러 설정 온도가 ${state.boiler.targetTemp.toFixed(1)}°C로 조정되었습니다.`);
    }
});

elements.btnBoilerPlus.addEventListener('click', () => {
    if (state.boiler.targetTemp < 32.0) {
        state.boiler.targetTemp += 0.5;
        updateBoilerUI();
        showToast(`보일러 설정 온도가 ${state.boiler.targetTemp.toFixed(1)}°C로 조정되었습니다.`);
    }
});

// Humidity Listeners
elements.humModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        state.humidity.mode = btn.dataset.humMode;
        updateHumidityUI();
        const krHum = {
            auto: '자동 습도 케어',
            humidify: '가습기 운전',
            dehumidify: '제습기 운전',
            off: '습도 케어 OFF'
        };
        addLog(`습도 케어 모드가 [${krHum[state.humidity.mode]}] 모드로 전환되었습니다.`, 'action');
    });
});

elements.btnHumMinus.addEventListener('click', () => {
    if (state.humidity.target > 30.0) {
        state.humidity.target -= 5.0;
        updateHumidityUI();
        showToast(`목표 습도가 ${Math.round(state.humidity.target)}% RH로 설정되었습니다.`);
    }
});

elements.btnHumPlus.addEventListener('click', () => {
    if (state.humidity.target < 75.0) {
        state.humidity.target += 5.0;
        updateHumidityUI();
        showToast(`목표 습도가 ${Math.round(state.humidity.target)}% RH로 설정되었습니다.`);
    }
});

// =========================================================================
// 7. Physical Thermodynamics & Climate Engine
// =========================================================================
function initThermodynamics() {
    if (thermodynamicsInterval) clearInterval(thermodynamicsInterval);

    thermodynamicsInterval = setInterval(() => {
        const rooms = state.temp.rooms;
        const ambientTemp = 26.5; // External summer baseline

        // 1. Aircon cooling in living room
        if (state.aircon.active) {
            let speed = 0.06;
            if (state.aircon.wind === 'medium') speed = 0.12;
            if (state.aircon.wind === 'high') speed = 0.22;

            if (rooms.livingRoom > state.temp.target) {
                rooms.livingRoom = Math.max(state.temp.target, rooms.livingRoom - speed);
            }
            // AC naturally dehumidifies the air
            state.humidity.current = Math.max(40, state.humidity.current - 0.2);
        }

        // 2. Boiler heating
        if (state.boiler.active) {
            const bTarget = state.boiler.targetTemp;
            const bMode = state.boiler.mode;
            let heatSpeed = 0.08;

            if (bMode === 'ondol') heatSpeed = 0.14; // Floor heating is strong
            if (bMode === 'eco') heatSpeed = 0.02; // Minimal frost protection

            Object.keys(rooms).forEach(room => {
                if (bMode !== 'water') {
                    if (rooms[room] < bTarget) {
                        rooms[room] = Math.min(bTarget, rooms[room] + heatSpeed);
                    }
                }
            });
            // Heating slightly lowers relative humidity
            state.humidity.current = Math.max(35, state.humidity.current - 0.1);
        }

        // 3. Ambient drift when no climate control active
        if (!state.aircon.active && !state.boiler.active) {
            Object.keys(rooms).forEach(room => {
                const diff = ambientTemp - rooms[room];
                rooms[room] += diff * 0.01;
            });
        }

        // 4. Room heat propagation (Living room to other rooms)
        const propRate = 0.03;
        Object.keys(rooms).forEach(room => {
            if (room !== 'livingRoom' && (!kitchenHeatInterval || room !== 'kitchen')) {
                const diff = rooms.livingRoom - rooms[room];
                rooms[room] += diff * propRate;
            }
        });

        // 5. Humidity adjustment
        if (state.humidity.mode === 'auto') {
            const humDiff = state.humidity.target - state.humidity.current;
            state.humidity.current += humDiff * 0.05;
        } else if (state.humidity.mode === 'humidify') {
            if (state.humidity.current < 70) state.humidity.current += 0.4;
        } else if (state.humidity.mode === 'dehumidify') {
            if (state.humidity.current > 40) state.humidity.current -= 0.4;
        } else {
            // Drifts to natural baseline 50%
            state.humidity.current += (50.0 - state.humidity.current) * 0.01;
        }

        // Sync GUI
        updateTempUI();
    }, 1000);
}

// =========================================================================
// 8. Automation Scenarios: Away Mode & Kitchen Overheat
// =========================================================================
function executeLeaveHome(source = 'home') {
    addLog(`외출 자동화 시나리오가 실행되었습니다. (출처: ${source === 'home' ? '스마트폰 홈' : '시뮬레이터'})`, 'action');
    showToast('외출 모드 가동! (전체 소등, 도어락 잠금, 가스 차단, 에어컨 OFF, 보일러 외출난방)');

    // 1. Shut off all lights
    Object.keys(state.lights).forEach(room => {
        state.lights[room] = false;
    });
    updateLightingUI();
    addLog('외출 자동화: 전 객실 조명을 일괄 소등했습니다.', 'success');

    // 2. Lock front door
    if (state.door.status === 'unlocked') {
        state.door.status = 'locked';
        updateDoorUI();
        addLog('외출 자동화: 현관문을 안전하게 잠갔습니다.', 'success');
    }

    // 3. Auto Gas Lock
    if (state.gas.autoGasLock) {
        if (state.gas.status === 'open') {
            state.gas.status = 'closed';
            updateGasUI();
            addLog('외출 자동화 [오토 가스 락]: 가스밸브를 자동 차단했습니다.', 'success');
        }
    }

    // 4. Turn off AC
    if (state.aircon.active) {
        state.aircon.active = false;
        updateTempUI();
        addLog('외출 자동화: 전력 절감을 위해 에어컨을 껐습니다.', 'success');
    }

    // 5. Switch Boiler to Eco (외출 절전) mode
    if (state.boiler.active) {
        state.boiler.mode = 'eco';
        state.boiler.targetTemp = 18.0;
        updateBoilerUI();
        addLog('외출 자동화: 보일러를 외출 절전 모드(18°C 동파방지)로 전환했습니다.', 'success');
    }
}

if (elements.btnAwayModeHome) {
    elements.btnAwayModeHome.addEventListener('click', () => executeLeaveHome('home'));
}

// =========================================================================
// 9. Network Device Simulation Management
// =========================================================================
const networkState = {
    light: true,
    lock: true,
    gas: true,
    temp: true,
    boiler: true,
    humidity: true
};

const deviceCounts = {
    light: 6,
    lock: 1,
    gas: 2,
    temp: 2,
    boiler: 1,
    humidity: 1
};

function getTotalConnected() {
    return Object.keys(networkState).reduce((sum, key) => {
        return sum + (networkState[key] ? deviceCounts[key] : 0);
    }, 0);
}

function getTotalDevices() {
    return Object.values(deviceCounts).reduce((a, b) => a + b, 0);
}

function toggleNetworkDevice(deviceKey) {
    networkState[deviceKey] = !networkState[deviceKey];
    const isConnected = networkState[deviceKey];

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

    const labelMap = {
        light: '💡 조명',
        lock: '🔒 도어락',
        gas: '🔥 가스밸브',
        temp: '❄️ 에어컨',
        boiler: '♨️ 스마트 보일러',
        humidity: '💧 습도센서'
    };
    const label = labelMap[deviceKey] || deviceKey;
    const msg = isConnected
        ? `${label} 통신 연결이 정상 복구되었습니다.`
        : `${label} 통신 연결이 끊겼습니다 (OFFLINE).`;
    showToast(msg, isConnected ? 'success' : 'error');
    addLog(msg, isConnected ? 'system' : 'warning');
}

function showConnectedDevicesCount() {
    const connected = getTotalConnected();
    const total = getTotalDevices();
    const msg = `스마트홈 기기 호환: 총 ${connected}개 / ${total}개 기기가 정상 연결되어 있습니다.`;
    showToast(msg);
    addLog(msg, 'system');
}

document.addEventListener('DOMContentLoaded', () => {
    const netBtns = document.querySelectorAll('.net-toggle-btn');
    netBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const deviceKey = btn.getAttribute('data-device');
            if (deviceKey) toggleNetworkDevice(deviceKey);
        });
    });
});

// =========================================================================
// 10. Three.js 3D Digital Twin Simulation Engine
// =========================================================================
class ThreeJSSimulator {
    constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) return;

        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.controls = null;
        this.lights = {};
        this.materials = {};
        this.doorMesh = null;
        this.acParticles = null;
        this.ondolMeshGroup = null;
        this.stoveFlame = null;
        this.roomLabelsGroup = null;
        this.isAnimatingCamera = false;

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // 1. Scene Setup
        this.scene = new THREE.Scene();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.scene.background = new THREE.Color(isDark ? 0x141820 : 0xdde6f3);
        this.scene.fog = new THREE.FogExp2(isDark ? 0x141820 : 0xdde6f3, 0.015);

        // 2. Camera Setup
        this.camera = new THREE.PerspectiveCamera(42, width / height, 0.5, 500);
        this.camera.position.set(22, 25, 22);

        // 3. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.1;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.05; // don't go below floor
        this.controls.minDistance = 8;
        this.controls.maxDistance = 70;
        this.controls.target.set(0, 1, 0);

        // 5. Global Illumination (Sun + Ambient)
        this.ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.35 : 0.65);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff8ee, 0.7);
        this.sunLight.position.set(20, 35, 15);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 1024;
        this.sunLight.shadow.mapSize.height = 1024;
        this.sunLight.shadow.bias = -0.001;
        this.scene.add(this.sunLight);

        // 6. Build the 3D Apartment Architectural Model matching User Sketch
        this.buildMaterials();
        this.buildHouseModel();
        this.buildOndolHeatingGrid();
        this.buildACParticleStream();
        this.buildStoveFlame();
        this.buildRoomLabels();

        // 7. Bind Resize & Toolbar Controls
        window.addEventListener('resize', () => this.onResize());
        this.bindToolbar();

        // 8. Start Render Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    buildMaterials() {
        this.materials = {
            floorWood: new THREE.MeshStandardMaterial({ color: 0xd8c8b0, roughness: 0.4, metalness: 0.05 }),
            floorTile: new THREE.MeshStandardMaterial({ color: 0xe8ecf0, roughness: 0.2, metalness: 0.1 }),
            floorBath: new THREE.MeshStandardMaterial({ color: 0x95a5a6, roughness: 0.3, metalness: 0.1 }),
            floorBalcony: new THREE.MeshStandardMaterial({ color: 0xbdc3c7, roughness: 0.6 }),
            wallCutaway: new THREE.MeshStandardMaterial({ color: 0xf4f7f9, roughness: 0.5 }),
            wallDark: new THREE.MeshStandardMaterial({ color: 0x34495e, roughness: 0.4 }),
            glassWindow: new THREE.MeshPhysicalMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.45,
                roughness: 0.1,
                transmission: 0.8,
                thickness: 0.5
            }),
            windowRedMarker: new THREE.MeshStandardMaterial({ color: 0xe74c3c, roughness: 0.3 }),
            furnitureFabric: new THREE.MeshStandardMaterial({ color: 0x3498db, roughness: 0.8 }),
            furnitureWood: new THREE.MeshStandardMaterial({ color: 0x8e583e, roughness: 0.5 }),
            furnitureWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
            metalChrome: new THREE.MeshStandardMaterial({ color: 0xdddddd, metalness: 0.8, roughness: 0.2 }),
            doorWood: new THREE.MeshStandardMaterial({ color: 0x2c3e50, roughness: 0.4 })
        };
    }

    buildHouseModel() {
        const root = new THREE.Group();

        // Helper: create a cutaway wall box
        const createWall = (x, z, w, d, h = 2.4, colorMat = this.materials.wallCutaway) => {
            const wallGeo = new THREE.BoxGeometry(w, h, d);
            const wall = new THREE.Mesh(wallGeo, colorMat);
            wall.position.set(x, h / 2, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            root.add(wall);
            return wall;
        };

        // Helper: create a window with red sketch indicator
        const createWindow = (x, z, w, d, h = 1.6) => {
            const frameGeo = new THREE.BoxGeometry(w, 0.15, d);
            const frame = new THREE.Mesh(frameGeo, this.materials.windowRedMarker);
            frame.position.set(x, 1.2, z);
            root.add(frame);

            const glassGeo = new THREE.BoxGeometry(w, h, d);
            const glass = new THREE.Mesh(glassGeo, this.materials.glassWindow);
            glass.position.set(x, 1.2, z);
            root.add(glass);
        };

        // =====================================================================
        // ROOM FLOORS (Exact coordinates matching user's layout)
        // =====================================================================

        // 1. 거실 (Living Room) - Center: (2, 5), size (12, 14)
        const livingFloorGeo = new THREE.PlaneGeometry(12, 14);
        const livingFloor = new THREE.Mesh(livingFloorGeo, this.materials.floorWood);
        livingFloor.rotation.x = -Math.PI / 2;
        livingFloor.position.set(2, 0.01, 5);
        livingFloor.receiveShadow = true;
        root.add(livingFloor);

        // 2. 안방 (Master Room) - Middle-Left: (-9, 1.5), size (10, 9)
        const masterFloorGeo = new THREE.PlaneGeometry(10, 9);
        const masterFloor = new THREE.Mesh(masterFloorGeo, this.materials.floorWood);
        masterFloor.rotation.x = -Math.PI / 2;
        masterFloor.position.set(-9, 0.01, 1.5);
        masterFloor.receiveShadow = true;
        root.add(masterFloor);

        // 3. 방 B (Room B) - Top-Left: (-8, -7.5), size (8, 9)
        const roomBFloorGeo = new THREE.PlaneGeometry(8, 9);
        const roomBFloor = new THREE.Mesh(roomBFloorGeo, this.materials.floorWood);
        roomBFloor.rotation.x = -Math.PI / 2;
        roomBFloor.position.set(-8, 0.01, -7.5);
        roomBFloor.receiveShadow = true;
        root.add(roomBFloor);

        // 3b. 발코니 / 베란다 (Balcony attached to Room B) - Outer Left: (-13, -7.5), size (2, 9)
        const balconyFloorGeo = new THREE.PlaneGeometry(2, 9);
        const balconyFloor = new THREE.Mesh(balconyFloorGeo, this.materials.floorBalcony);
        balconyFloor.rotation.x = -Math.PI / 2;
        balconyFloor.position.set(-13, 0.01, -7.5);
        balconyFloor.receiveShadow = true;
        root.add(balconyFloor);

        // 4. 화장실 (Bathroom) - Bottom-Left: (-9, 9), size (10, 6)
        const bathFloorGeo = new THREE.PlaneGeometry(10, 6);
        const bathFloor = new THREE.Mesh(bathFloorGeo, this.materials.floorBath);
        bathFloor.rotation.x = -Math.PI / 2;
        bathFloor.position.set(-9, 0.01, 9);
        bathFloor.receiveShadow = true;
        root.add(bathFloor);

        // 5. 주방 & 식당 (Kitchen & Dining) - Top-Center: (1, -7.5), size (10, 9)
        const kitchenFloorGeo = new THREE.PlaneGeometry(10, 9);
        const kitchenFloor = new THREE.Mesh(kitchenFloorGeo, this.materials.floorTile);
        kitchenFloor.rotation.x = -Math.PI / 2;
        kitchenFloor.position.set(1, 0.01, -7.5);
        kitchenFloor.receiveShadow = true;
        root.add(kitchenFloor);

        // 6. 현관 (Entrance) - Top-Right: (10, -7.5), size (8, 9)
        const entranceFloorGeo = new THREE.PlaneGeometry(8, 9);
        const entranceFloor = new THREE.Mesh(entranceFloorGeo, this.materials.floorTile);
        entranceFloor.rotation.x = -Math.PI / 2;
        entranceFloor.position.set(10, 0.01, -7.5);
        entranceFloor.receiveShadow = true;
        root.add(entranceFloor);

        // 7. 방 A (Room A) - Bottom-Right: (10, 5), size (8, 14)
        const roomAFloorGeo = new THREE.PlaneGeometry(8, 14);
        const roomAFloor = new THREE.Mesh(roomAFloorGeo, this.materials.floorWood);
        roomAFloor.rotation.x = -Math.PI / 2;
        roomAFloor.position.set(10, 0.01, 5);
        roomAFloor.receiveShadow = true;
        root.add(roomAFloor);

        // =====================================================================
        // WALLS & WINDOWS (Cutaway Style)
        // =====================================================================

        // Exterior Perimeter Walls
        createWall(-14, 2, 0.4, 20); // Far Left Wall
        createWall(-9, 12, 10, 0.4); // Bathroom Bottom Wall
        createWall(2, 12, 12, 0.4);  // Living Room Bottom Wall (Has Large Window)
        createWindow(2, 12, 6, 0.3, 1.8); // 거실 대형 창문 (Red marker)

        createWall(10, 12, 8, 0.4);  // Room A Bottom Wall
        createWall(14, 5, 0.4, 14);  // Room A Right Wall
        createWindow(14, 5, 0.3, 4, 1.6); // 방 A 창문 (Red marker)

        createWall(14, -7.5, 0.4, 9); // Entrance Right Wall
        createWall(10, -12, 8, 0.4);  // Entrance Top Wall
        createWall(1, -12, 10, 0.4);  // Kitchen Top Wall
        createWall(-8, -12, 8, 0.4);  // Room B Top Wall
        createWall(-14, -7.5, 0.4, 9); // Balcony Outer Wall
        createWindow(-14, -7.5, 0.3, 6, 1.6); // 발코니 창문

        // Interior Dividing Walls
        createWall(-4, 0, 0.3, 24); // Master/RoomB/Bath vs Living/Kitchen Divider Wall
        createWall(-9, -3, 10, 0.3); // Room B vs Master Room Divider
        createWall(-9, 6, 10, 0.3);  // Master Room vs Bathroom Divider
        createWindow(-14, 1.5, 0.3, 4, 1.6); // 안방 외벽 창문 (Red marker)

        createWall(-12, -7.5, 0.1, 9, 2.4, this.materials.glassWindow); // Room B to Balcony Glass Sliding Door
        createWall(6, 0, 0.3, 24); // Living/Kitchen vs Entrance/RoomA Divider Wall
        createWall(1, -2, 10, 0.3); // Kitchen vs Living Room Divider (Half Open Bar)
        createWall(10, -2, 8, 0.3); // Entrance vs Room A Divider

        // =====================================================================
        // ENTRANCE DOOR (Animated Pivot)
        // =====================================================================
        const doorFrame = new THREE.Group();
        doorFrame.position.set(10, 0, -12);
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(2.2, 2.3, 0.15), this.materials.doorWood);
        doorMesh.position.set(1.1, 1.15, 0); // pivot at edge
        doorMesh.castShadow = true;
        doorFrame.add(doorMesh);
        root.add(doorFrame);
        this.doorMesh = doorFrame;

        // =====================================================================
        // 3D FURNISHINGS & APPLIANCES
        // =====================================================================

        // 1. 거실 가구 (Sofa, Table, TV, Wall AC)
        const sofaGeo = new THREE.BoxGeometry(5, 0.9, 2.2);
        const sofa = new THREE.Mesh(sofaGeo, this.materials.furnitureFabric);
        sofa.position.set(2, 0.45, 3);
        sofa.castShadow = true;
        root.add(sofa);

        const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(3, 0.4, 1.4), this.materials.furnitureWood);
        coffeeTable.position.set(2, 0.2, 5.5);
        coffeeTable.castShadow = true;
        root.add(coffeeTable);

        const tvUnit = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.5, 0.8), this.materials.furnitureWhite);
        tvUnit.position.set(2, 0.25, 9.5);
        root.add(tvUnit);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.8, 0.1), this.materials.wallDark);
        tvScreen.position.set(2, 1.6, 9.7);
        root.add(tvScreen);

        // Smart AC Unit on Living Room Wall
        const acUnit = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.7, 0.4), this.materials.furnitureWhite);
        acUnit.position.set(5.5, 2.0, 3);
        root.add(acUnit);
        this.acUnitMesh = acUnit;

        // 2. 안방 가구 (Master Bed, Wardrobe)
        const masterBed = new THREE.Mesh(new THREE.BoxGeometry(4.5, 0.8, 5.5), this.materials.furnitureFabric);
        masterBed.position.set(-9, 0.4, 2);
        masterBed.castShadow = true;
        root.add(masterBed);

        const headboard = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.6, 0.4), this.materials.furnitureWood);
        headboard.position.set(-9, 0.8, -0.7);
        root.add(headboard);

        // 3. 방 B 가구 (Single Bed, Desk)
        const bedB = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 4.5), this.materials.furnitureFabric);
        bedB.position.set(-6, 0.35, -8);
        bedB.castShadow = true;
        root.add(bedB);

        const deskB = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.2), this.materials.furnitureWood);
        deskB.position.set(-10, 0.4, -4);
        root.add(deskB);

        // 4. 방 A 가구 (Single Bed, Desk)
        const bedA = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.7, 4.5), this.materials.furnitureFabric);
        bedA.position.set(11, 0.35, 6);
        bedA.castShadow = true;
        root.add(bedA);

        const deskA = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.8, 1.2), this.materials.furnitureWood);
        deskA.position.set(8, 0.4, 0);
        root.add(deskA);

        // 5. 주방 가구 (Kitchen Counter, Gas Stove, Dining Table, Smart Boiler Box)
        const counterL = new THREE.Mesh(new THREE.BoxGeometry(6, 1.0, 1.5), this.materials.furnitureWhite);
        counterL.position.set(0, 0.5, -10.5);
        counterL.castShadow = true;
        root.add(counterL);

        // Smart Boiler unit mounted on kitchen wall
        const boilerBox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 0.5), this.materials.furnitureWhite);
        boilerBox.position.set(-3.2, 1.5, -11.5);
        root.add(boilerBox);

        // Dining Table
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(3.5, 0.9, 2), this.materials.furnitureWood);
        diningTable.position.set(1, 0.45, -5.5);
        diningTable.castShadow = true;
        root.add(diningTable);

        // 6. 욕실 가구 (Bathtub, Vanity, Toilet)
        const bathtub = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.9, 1.6), this.materials.furnitureWhite);
        bathtub.position.set(-11.5, 0.45, 9.5);
        root.add(bathtub);

        const vanity = new THREE.Mesh(new THREE.BoxGeometry(2, 0.9, 1.2), this.materials.furnitureWhite);
        vanity.position.set(-6, 0.45, 7.5);
        root.add(vanity);

        // =====================================================================
        // ROOM POINT LIGHTS
        // =====================================================================
        const createRoomLight = (roomKey, x, y, z) => {
            const pLight = new THREE.PointLight(0xfff3d6, 0, 14, 1.5);
            pLight.position.set(x, y, z);
            pLight.castShadow = false;
            root.add(pLight);

            // Ceiling fixture mesh
            const fixture = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.1, 16), this.materials.furnitureWhite);
            fixture.position.set(x, y + 0.3, z);
            root.add(fixture);

            this.lights[roomKey] = pLight;
        };

        createRoomLight('livingRoom', 2, 2.8, 5);
        createRoomLight('masterRoom', -9, 2.8, 1.5);
        createRoomLight('roomA', 10, 2.8, 5);
        createRoomLight('roomB', -8, 2.8, -7.5);
        createRoomLight('kitchen', 1, 2.8, -7.5);
        createRoomLight('bathroom', -9, 2.8, 9);

        this.scene.add(root);
        this.houseRoot = root;
    }

    buildOndolHeatingGrid() {
        const group = new THREE.Group();

        const createOndolPlane = (x, z, w, d) => {
            const geo = new THREE.PlaneGeometry(w - 0.4, d - 0.4, 12, 12);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xff3b30,
                wireframe: true,
                transparent: true,
                opacity: 0
            });
            const plane = new THREE.Mesh(geo, mat);
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(x, 0.03, z);
            group.add(plane);
            return plane;
        };

        this.ondolPlanes = [
            createOndolPlane(2, 5, 12, 14),   // 거실
            createOndolPlane(-9, 1.5, 10, 9),  // 안방
            createOndolPlane(-8, -7.5, 8, 9),  // 방 B
            createOndolPlane(10, 5, 8, 14),   // 방 A
            createOndolPlane(1, -7.5, 10, 9)   // 주방
        ];

        this.scene.add(group);
        this.ondolMeshGroup = group;
    }

    buildACParticleStream() {
        const particleCount = 120;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = 5.2 - Math.random() * 0.4;
            positions[i + 1] = 1.9 - Math.random() * 0.3;
            positions[i + 2] = 3.0 + (Math.random() - 0.5) * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x4a86e8,
            size: 0.18,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.acParticles = new THREE.Points(geometry, material);
        this.scene.add(this.acParticles);
    }

    buildStoveFlame() {
        const flameGeo = new THREE.ConeGeometry(0.12, 0.25, 8);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x3498db,
            transparent: true,
            opacity: 0
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(0, 1.15, -10.5);
        this.scene.add(flame);
        this.stoveFlame = flame;
    }

    buildRoomLabels() {
        const group = new THREE.Group();

        const createLabel = (text, x, z) => {
            const canvas = document.createElement('canvas');
            canvas.width = 256;
            canvas.height = 80;
            const ctx = canvas.getContext('2d');
            ctx.fillStyle = 'rgba(26, 30, 38, 0.85)';
            ctx.roundRect(10, 10, 236, 60, 14);
            ctx.fill();
            ctx.strokeStyle = '#4a86e8';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 40);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, 2.8, z);
            sprite.scale.set(4, 1.25, 1);
            group.add(sprite);
        };

        createLabel('거실 (Living)', 2, 5);
        createLabel('안방 (Master)', -9, 1.5);
        createLabel('방 B & 발코니', -8, -7.5);
        createLabel('방 A (Room A)', 10, 5);
        createLabel('주방 & 식당', 1, -7.5);
        createLabel('공용 욕실', -9, 9);
        createLabel('현관 (Door)', 10, -7.5);

        this.scene.add(group);
        this.roomLabelsGroup = group;
    }

    // --- State Synchronization Methods ---
    syncLights() {
        const factor = state.brightness / 100;
        Object.keys(state.lights).forEach(room => {
            if (this.lights[room]) {
                const isOn = state.lights[room];
                this.lights[room].intensity = isOn ? (1.5 * factor + 0.3) : 0;
            }
        });
    }

    syncDoor() {
        // Will be smoothly tweened in animate()
    }

    syncGas() {
        if (this.stoveFlame) {
            this.stoveFlame.material.opacity = (state.gas.status === 'open') ? 0.9 : 0;
        }
    }

    syncThermodynamics() {
        // Syncs visuals based on aircon and boiler
    }

    updateTheme(theme) {
        const isDark = (theme === 'dark');
        if (this.scene) {
            this.scene.background.setHex(isDark ? 0x141820 : 0xdde6f3);
            this.scene.fog.color.setHex(isDark ? 0x141820 : 0xdde6f3);
        }
        if (this.ambientLight) {
            this.ambientLight.intensity = isDark ? 0.35 : 0.65;
        }
    }

    animateCameraTo(targetPos, targetLookAt, duration = 800) {
        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = performance.now();

        this.isAnimatingCamera = true;

        const updateCam = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 0.5 - Math.cos(progress * Math.PI) / 2; // smooth easeInOut

            this.camera.position.lerpVectors(startPos, targetPos, ease);
            this.controls.target.lerpVectors(startTarget, targetLookAt, ease);
            this.controls.update();

            if (progress < 1) {
                requestAnimationFrame(updateCam);
            } else {
                this.isAnimatingCamera = false;
            }
        };

        requestAnimationFrame(updateCam);
    }

    bindToolbar() {
        // Camera presets
        elements.btnCamIso.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(22, 25, 22), new THREE.Vector3(0, 1, 0));
        });

        elements.btnCamTop.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamTop);
            this.animateCameraTo(new THREE.Vector3(0, 36, 0.1), new THREE.Vector3(0, 0, 0));
        });

        elements.btnCamLiving.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamLiving);
            this.animateCameraTo(new THREE.Vector3(2, 14, 18), new THREE.Vector3(2, 1, 5));
        });

        elements.btnCamMaster.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamMaster);
            this.animateCameraTo(new THREE.Vector3(-18, 14, 12), new THREE.Vector3(-9, 1, 1.5));
        });

        elements.btnCamKitchen.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamKitchen);
            this.animateCameraTo(new THREE.Vector3(1, 14, -18), new THREE.Vector3(1, 1, -7.5));
        });

        elements.btnCamReset.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(22, 25, 22), new THREE.Vector3(0, 1, 0));
        });

        // 3D Visual Effects Toggles
        elements.btnToggleOndolFx.addEventListener('click', () => {
            state.effects3D.ondol = !state.effects3D.ondol;
            elements.btnToggleOndolFx.classList.toggle('active', state.effects3D.ondol);
            if (this.ondolMeshGroup) this.ondolMeshGroup.visible = state.effects3D.ondol;
        });

        elements.btnToggleAcFx.addEventListener('click', () => {
            state.effects3D.acWind = !state.effects3D.acWind;
            elements.btnToggleAcFx.classList.toggle('active', state.effects3D.acWind);
            if (this.acParticles) this.acParticles.visible = state.effects3D.acWind;
        });

        elements.btnToggleLabelsFx.addEventListener('click', () => {
            state.effects3D.labels = !state.effects3D.labels;
            elements.btnToggleLabelsFx.classList.toggle('active', state.effects3D.labels);
            if (this.roomLabelsGroup) this.roomLabelsGroup.visible = state.effects3D.labels;
        });
    }

    setActiveToolBtn(activeBtn) {
        document.querySelectorAll('.camera-presets-group .btn-tool-chip').forEach(btn => {
            btn.classList.remove('active');
        });
        if (activeBtn) activeBtn.classList.add('active');
    }

    onResize() {
        if (!this.container) return;
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    animate() {
        requestAnimationFrame(this.animate);

        const time = performance.now() * 0.001;

        // 1. Controls update
        if (!this.isAnimatingCamera && this.controls) {
            this.controls.update();
        }

        // 2. Door Animation (Smooth swing)
        if (this.doorMesh) {
            const targetRotation = state.door.status === 'unlocked' ? (Math.PI / 2.2) : 0;
            this.doorMesh.rotation.y += (targetRotation - this.doorMesh.rotation.y) * 0.1;
        }

        // 3. Boiler Ondol Glow Pulse Animation
        if (this.ondolPlanes && this.ondolPlanes.length > 0) {
            const isBoilerOn = state.boiler.active;
            const targetOpacity = isBoilerOn ? (0.35 + 0.25 * Math.sin(time * 3.5)) : 0;
            this.ondolPlanes.forEach(plane => {
                plane.material.opacity += (targetOpacity - plane.material.opacity) * 0.1;
            });
        }

        // 4. AC Breeze Particle Flow Animation
        if (this.acParticles) {
            const isAcOn = state.aircon.active;
            const targetOpacity = isAcOn ? 0.75 : 0;
            this.acParticles.material.opacity += (targetOpacity - this.acParticles.material.opacity) * 0.1;

            if (isAcOn || this.acParticles.material.opacity > 0.02) {
                const positions = this.acParticles.geometry.attributes.position.array;
                const windSpeed = state.aircon.wind === 'high' ? 0.08 : (state.aircon.wind === 'medium' ? 0.05 : 0.03);

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] -= windSpeed * 1.5;      // flow in -X direction
                    positions[i + 1] -= windSpeed * 0.4;  // slightly descend
                    positions[i + 2] += (Math.sin(time * 2 + i) * 0.02);

                    // Reset particle when reached floor or drifted far
                    if (positions[i] < -2.0 || positions[i + 1] < 0.2) {
                        positions[i] = 5.2 - Math.random() * 0.4;
                        positions[i + 1] = 1.9 - Math.random() * 0.3;
                        positions[i + 2] = 3.0 + (Math.random() - 0.5) * 1.5;
                    }
                }
                this.acParticles.geometry.attributes.position.needsUpdate = true;
            }
        }

        // 5. Gas Stove Flame Animation
        if (this.stoveFlame && state.gas.status === 'open') {
            this.stoveFlame.scale.set(
                1 + 0.15 * Math.sin(time * 15),
                1 + 0.25 * Math.cos(time * 12),
                1 + 0.15 * Math.sin(time * 15)
            );
        }

        // 6. Render Scene
        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

// Global 3D simulator instance
let threeApp = null;

// =========================================================================
// 11. Initial Application Bootstrap
// =========================================================================
function init() {
    initTheme();
    updateLightingUI();
    updateDoorUI();
    updateGasUI();
    updateTempUI();
    initThermodynamics();

    // Initialize 3D Engine
    setTimeout(() => {
        threeApp = new ThreeJSSimulator('threejs-container');
        if (threeApp) {
            threeApp.syncLights();
            threeApp.syncDoor();
            threeApp.syncGas();
        }
    }, 150);
}

document.addEventListener('DOMContentLoaded', init);
init();
