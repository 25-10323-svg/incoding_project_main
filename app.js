// AURA 3D Smart Home Digital Twin - 100x Scale, Smart Curtains, Door Open/Close, 3D Lamps, Roof & FPS Engine

// =========================================================================
// 1. Central Application State
// =========================================================================
const state = {
    currentScreen: 1,
    brightness: 70,
    lights: {
        livingRoom: false,
        masterRoom: false,
        roomA: false,
        roomB: false,
        kitchen: false,
        bathroom: false
    },
    door: {
        locked: true,     // true: locked, false: unlocked
        opened: false     // true: physical door opened (90 deg), false: closed
    },
    curtains: {
        livingRoom: true, // true: open (revealing window), false: closed
        masterRoom: true,
        roomA: true,
        roomB: true
    },
    gas: {
        status: 'closed',
        autoGasLock: true,
        autoSafeCut: true
    },
    temp: {
        current: 24.5,
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
        wind: 'low'
    },
    boiler: {
        active: false,
        mode: 'indoor',
        targetTemp: 24.0,
        ondolTemp: 55.0
    },
    humidity: {
        current: 52.0,
        target: 50.0,
        mode: 'auto'
    },
    effects3D: {
        ondol: true,
        acWind: true,
        humidifierMist: true,
        labels: true,
        roof: false
    },
    fpsMode: false,
    phoneDrawerOpen: true
};

let thermodynamicsInterval = null;

// =========================================================================
// 2. DOM Elements Cache
// =========================================================================
const elements = {
    screensWrapper: document.getElementById('screens-wrapper'),
    themeToggleBtn: document.getElementById('theme-toggle'),
    btnTogglePhoneDrawer: document.getElementById('btn-toggle-phone-drawer'),
    floatingPhone: document.getElementById('floating-phone'),
    fullscreenStage: document.getElementById('fullscreen-stage'),
    toastContainer: document.getElementById('toast-container'),
    livePhoneTime: document.getElementById('live-phone-time'),
    btnAwayModeHeader: document.getElementById('btn-away-mode-header'),
    btnAwayModeHome: document.getElementById('btn-away-mode-home'),

    hdrTemp: document.getElementById('hdr-temp'),
    hdrHumidity: document.getElementById('hdr-humidity'),
    hdrBoiler: document.getElementById('hdr-boiler'),
    hdrDoor: document.getElementById('hdr-door'),
    hdrCurtain: document.getElementById('hdr-curtain'),

    // Lights
    brightnessSlider: document.getElementById('global-brightness-slider'),
    brightnessValText: document.getElementById('global-brightness-val'),
    sliderFill: document.getElementById('slider-fill'),
    btnAllLightsOff: document.getElementById('btn-all-lights-off'),
    lightSingleButtons: document.querySelectorAll('.light-toggle-single-btn'),

    // Door Controls
    btnDoorOpenPhys: document.getElementById('btn-door-open-phys'),
    btnDoorClosePhys: document.getElementById('btn-door-close-phys'),
    btnDoorUnlock: document.getElementById('btn-door-unlock'),
    btnDoorLock: document.getElementById('btn-door-lock'),

    // Curtain Controls
    btnAllCurtainsOpen: document.getElementById('btn-all-curtains-open'),
    btnAllCurtainsClose: document.getElementById('btn-all-curtains-close'),
    curtainSingleButtons: document.querySelectorAll('.curtain-toggle-single-btn'),
    btnToggleCurtainsFx: document.getElementById('btn-toggle-curtains-fx'),

    // Gas
    btnGasOpen: document.getElementById('btn-gas-open'),
    btnGasClose: document.getElementById('btn-gas-close'),
    switchAutoGas: document.getElementById('switch-auto-gas'),
    switchAutoSafe: document.getElementById('switch-auto-safe'),
    badgeAutoGas: document.getElementById('badge-auto-gas'),
    badgeAutoSafe: document.getElementById('badge-auto-safe'),

    // Climate
    targetTempDisplay: document.getElementById('target-temp-display'),
    currentTempDisplay: document.getElementById('current-temp-display'),
    btnTempMinus: document.getElementById('btn-temp-minus'),
    btnTempPlus: document.getElementById('btn-temp-plus'),
    btnToggleBoiler: document.getElementById('btn-toggle-boiler'),
    badgeBoiler: document.getElementById('badge-boiler'),
    boilerSubStatus: document.getElementById('boiler-sub-status'),
    boilerModesContainer: document.getElementById('boiler-modes-container'),
    boilerModeButtons: document.querySelectorAll('[data-boiler-mode]'),
    boilerTargetVal: document.getElementById('boiler-target-val'),
    btnBoilerMinus: document.getElementById('btn-boiler-minus'),
    btnBoilerPlus: document.getElementById('btn-boiler-plus'),

    currentHumidityBadge: document.getElementById('current-humidity-badge'),
    humiditySubStatus: document.getElementById('humidity-sub-status'),
    humModeButtons: document.querySelectorAll('[data-hum-mode]'),
    targetHumidityVal: document.getElementById('target-humidity-val'),
    btnHumMinus: document.getElementById('btn-hum-minus'),
    btnHumPlus: document.getElementById('btn-hum-plus'),
    btnToggleAircon: document.getElementById('btn-toggle-aircon'),
    badgeAircon: document.getElementById('badge-aircon'),
    airconWindContainer: document.getElementById('aircon-wind-container'),
    windLowBtn: document.getElementById('wind-low'),
    windMediumBtn: document.getElementById('wind-medium'),
    windHighBtn: document.getElementById('wind-high'),

    // 3D Toolbar & FPS
    btnCamIso: document.getElementById('btn-cam-iso'),
    btnCamTop: document.getElementById('btn-cam-top'),
    btnCamFps: document.getElementById('btn-cam-fps'),
    btnCamLiving: document.getElementById('btn-cam-living'),
    btnCamMaster: document.getElementById('btn-cam-master'),
    btnCamKitchen: document.getElementById('btn-cam-kitchen'),
    btnCamReset: document.getElementById('btn-cam-reset'),
    btnToggleRoof: document.getElementById('btn-toggle-roof'),
    btnToggleOndolFx: document.getElementById('btn-toggle-ondol-fx'),
    btnToggleAcFx: document.getElementById('btn-toggle-ac-fx'),
    btnToggleLabelsFx: document.getElementById('btn-toggle-labels-fx'),

    fpsControlsOverlay: document.getElementById('fps-controls-overlay'),
    btnDpadUp: document.getElementById('btn-dpad-up'),
    btnDpadDown: document.getElementById('btn-dpad-down'),
    btnDpadLeft: document.getElementById('btn-dpad-left'),
    btnDpadRight: document.getElementById('btn-dpad-right'),

    roomFocusButtons: document.querySelectorAll('[data-room-focus]')
};

// =========================================================================
// 3. Navigation Engine (Phone Slider - 6 Screens)
// =========================================================================
function navigateTo(screenIndex) {
    state.currentScreen = screenIndex;
    const translatePercentage = -(screenIndex - 1) * 16.666; // 6 screens = 16.666%
    elements.screensWrapper.style.transform = `translateX(${translatePercentage}%)`;
}

function showToast(message, type = 'success') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'} ${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2600);
}

function showNotification(message) {
    showToast(message, 'success');
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
// 4. Phone Drawer Collapse / Expand
// =========================================================================
function togglePhoneDrawer() {
    state.phoneDrawerOpen = !state.phoneDrawerOpen;
    if (state.phoneDrawerOpen) {
        elements.floatingPhone.classList.remove('collapsed');
        elements.fullscreenStage.classList.remove('fullscreen-mode');
        showToast('스마트폰 리모컨 열림');
    } else {
        elements.floatingPhone.classList.add('collapsed');
        elements.fullscreenStage.classList.add('fullscreen-mode');
        showToast('전체 화면 3D 뷰어 모드 (리모컨 숨김)');
    }
    if (threeApp && threeApp.onResize) {
        setTimeout(() => threeApp.onResize(), 350);
    }
}

if (elements.btnTogglePhoneDrawer) {
    elements.btnTogglePhoneDrawer.addEventListener('click', togglePhoneDrawer);
}

// =========================================================================
// 5. Theme Toggle Engine
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
        showToast('전체 조명이 소등되었습니다.');
    } else {
        showToast('이미 모든 조명이 꺼져 있습니다.', 'error');
    }
});

elements.lightSingleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const room = btn.dataset.room;
        state.lights[room] = !state.lights[room];
        updateLightingUI();
    });
});

// --- 6.2 Door Open/Close & Lock UI ---
function updateDoorUI() {
    // 1. Physical Open / Close UI
    if (state.door.opened) {
        elements.btnDoorOpenPhys.classList.add('active');
        elements.btnDoorClosePhys.classList.remove('active');
    } else {
        elements.btnDoorOpenPhys.classList.remove('active');
        elements.btnDoorClosePhys.classList.add('active');
    }

    // 2. Lock UI
    if (state.door.locked) {
        elements.btnDoorUnlock.classList.remove('active');
        elements.btnDoorLock.classList.add('active');
    } else {
        elements.btnDoorUnlock.classList.add('active');
        elements.btnDoorLock.classList.remove('active');
    }

    // 3. Header Status Pill
    if (elements.hdrDoor) {
        if (state.door.opened) {
            elements.hdrDoor.textContent = '현관문 열림';
        } else {
            elements.hdrDoor.textContent = state.door.locked ? '현관문 닫힘 (잠김)' : '현관문 닫힘 (해제)';
        }
    }

    if (threeApp && threeApp.syncDoor) threeApp.syncDoor();
}

elements.btnDoorOpenPhys.addEventListener('click', () => {
    if (state.door.opened) return;
    if (state.door.locked) {
        state.door.locked = false; // Auto unlock on open
    }
    state.door.opened = true;
    updateDoorUI();
    showToast('현관문이 열렸습니다. (3D 회전 모션)');
});

elements.btnDoorClosePhys.addEventListener('click', () => {
    if (!state.door.opened) return;
    state.door.opened = false;
    updateDoorUI();
    showToast('현관문을 닫았습니다.');
});

elements.btnDoorLock.addEventListener('click', () => {
    if (state.door.locked) return;
    state.door.locked = true;
    if (state.door.opened) {
        state.door.opened = false; // Auto close on lock
    }
    updateDoorUI();
    showToast('현관문 도어락이 잠겼습니다.');
});

elements.btnDoorUnlock.addEventListener('click', () => {
    if (!state.door.locked) return;
    state.door.locked = false;
    updateDoorUI();
    showToast('현관문 도어락이 해제되었습니다.');
});

// --- 6.3 Smart Motorized Curtain UI ---
function updateCurtainUI() {
    elements.curtainSingleButtons.forEach(btn => {
        const room = btn.dataset.curtain;
        const isOpen = state.curtains[room];
        if (isOpen) {
            btn.classList.add('active');
            btn.textContent = '열림';
        } else {
            btn.classList.remove('active');
            btn.textContent = '닫힘';
        }
    });

    const anyOpen = Object.values(state.curtains).some(v => v);
    if (elements.hdrCurtain) {
        elements.hdrCurtain.textContent = anyOpen ? '커튼 열림' : '커튼 모두 닫힘';
    }

    if (threeApp && threeApp.syncCurtains) threeApp.syncCurtains();
}

elements.btnAllCurtainsOpen.addEventListener('click', () => {
    Object.keys(state.curtains).forEach(room => state.curtains[room] = true);
    updateCurtainUI();
    showToast('전 객실 커튼이 모두 열렸습니다.');
});

elements.btnAllCurtainsClose.addEventListener('click', () => {
    Object.keys(state.curtains).forEach(room => state.curtains[room] = false);
    updateCurtainUI();
    showToast('전 객실 커튼이 모두 닫혔습니다.');
});

elements.curtainSingleButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        const room = btn.dataset.curtain;
        state.curtains[room] = !state.curtains[room];
        updateCurtainUI();
        showToast(`${btn.parentElement.querySelector('.room-title').textContent} [${state.curtains[room] ? '열림' : '닫힘'}]`);
    });
});

if (elements.btnToggleCurtainsFx) {
    elements.btnToggleCurtainsFx.addEventListener('click', () => {
        const allOpen = Object.values(state.curtains).every(v => v);
        Object.keys(state.curtains).forEach(room => state.curtains[room] = !allOpen);
        updateCurtainUI();
        showToast(`3D 커튼 일괄 [${!allOpen ? '열기' : '닫기'}]`);
    });
}

// --- 6.4 Gas Valve UI ---
function updateGasUI() {
    const isOpen = (state.gas.status === 'open');
    if (isOpen) {
        elements.btnGasOpen.classList.add('active');
        elements.btnGasClose.classList.remove('active');
    } else {
        elements.btnGasOpen.classList.remove('active');
        elements.btnGasClose.classList.add('active');
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
    if (state.gas.status === 'open') return;
    state.gas.status = 'open';
    updateGasUI();
    showToast('가스 밸브를 열었습니다.');
});

elements.btnGasClose.addEventListener('click', () => {
    if (state.gas.status === 'closed') return;
    state.gas.status = 'closed';
    updateGasUI();
    showToast('가스 밸브를 안전하게 잠갔습니다.');
});

elements.switchAutoGas.addEventListener('change', (e) => {
    state.gas.autoGasLock = e.target.checked;
    updateGasUI();
});

elements.switchAutoSafe.addEventListener('change', (e) => {
    state.gas.autoSafeCut = e.target.checked;
    updateGasUI();
});

// --- 6.5 Climate UI ---
function calculateAverageTemp() {
    const r = state.temp.rooms;
    const avg = (r.livingRoom + r.masterRoom + r.roomA + r.roomB + r.kitchen + r.bathroom) / 6;
    state.temp.current = avg;
}

function updateTempUI() {
    calculateAverageTemp();
    const tempFormatted = `${state.temp.current.toFixed(1)}°C`;
    const targetFormatted = `${state.temp.target.toFixed(1)}°C`;

    elements.targetTempDisplay.textContent = targetFormatted;
    elements.currentTempDisplay.textContent = `실내 평균 ${tempFormatted}`;
    if (elements.hdrTemp) elements.hdrTemp.textContent = `실내 ${tempFormatted}`;

    // Aircon
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

    updateBoilerUI();
    updateHumidityUI();
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

        if (elements.hdrBoiler) elements.hdrBoiler.textContent = `보일러 (${modeLabels[state.boiler.mode] || 'ON'})`;
    } else {
        elements.badgeBoiler.textContent = 'OFF';
        elements.badgeBoiler.classList.remove('active');
        elements.btnToggleBoiler.textContent = '보일러 켜기';
        elements.btnToggleBoiler.classList.remove('active');
        elements.boilerModesContainer.style.display = 'none';
        elements.boilerSubStatus.textContent = '바닥 온돌 연동 대기';

        if (elements.hdrBoiler) elements.hdrBoiler.textContent = '보일러 대기';
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
    const humRounded = Math.round(state.humidity.current);
    elements.currentHumidityBadge.textContent = `${humRounded}% RH`;
    elements.targetHumidityVal.textContent = `${Math.round(state.humidity.target)}% RH`;

    if (elements.hdrHumidity) elements.hdrHumidity.textContent = `습도 ${humRounded}% RH`;

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

elements.btnTempMinus.addEventListener('click', () => {
    if (state.temp.target > 16.0) {
        state.temp.target -= 0.5;
        updateTempUI();
        showToast(`희망 온도 ${state.temp.target.toFixed(1)}°C`);
    }
});

elements.btnTempPlus.addEventListener('click', () => {
    if (state.temp.target < 30.0) {
        state.temp.target += 0.5;
        updateTempUI();
        showToast(`희망 온도 ${state.temp.target.toFixed(1)}°C`);
    }
});

elements.btnToggleAircon.addEventListener('click', () => {
    state.aircon.active = !state.aircon.active;
    updateTempUI();
    showToast(`거실 에어컨 ${state.aircon.active ? 'ON' : 'OFF'}`);
});

[elements.windLowBtn, elements.windMediumBtn, elements.windHighBtn].forEach(btn => {
    btn.addEventListener('click', () => {
        state.aircon.wind = btn.dataset.wind;
        updateTempUI();
    });
});

elements.btnToggleBoiler.addEventListener('click', () => {
    state.boiler.active = !state.boiler.active;
    updateTempUI();
    showToast(`스마트 보일러 ${state.boiler.active ? 'ON' : 'OFF'}`);
});

elements.boilerModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        state.boiler.mode = btn.dataset.boilerMode;
        updateBoilerUI();
    });
});

elements.btnBoilerMinus.addEventListener('click', () => {
    if (state.boiler.targetTemp > 18.0) {
        state.boiler.targetTemp -= 0.5;
        updateBoilerUI();
        showToast(`보일러 설정 온도 ${state.boiler.targetTemp.toFixed(1)}°C`);
    }
});

elements.btnBoilerPlus.addEventListener('click', () => {
    if (state.boiler.targetTemp < 32.0) {
        state.boiler.targetTemp += 0.5;
        updateBoilerUI();
        showToast(`보일러 설정 온도 ${state.boiler.targetTemp.toFixed(1)}°C`);
    }
});

elements.humModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        state.humidity.mode = btn.dataset.humMode;
        updateHumidityUI();
    });
});

elements.btnHumMinus.addEventListener('click', () => {
    if (state.humidity.target > 30.0) {
        state.humidity.target -= 5.0;
        updateHumidityUI();
        showToast(`목표 습도 ${Math.round(state.humidity.target)}% RH`);
    }
});

elements.btnHumPlus.addEventListener('click', () => {
    if (state.humidity.target < 75.0) {
        state.humidity.target += 5.0;
        updateHumidityUI();
        showToast(`목표 습도 ${Math.round(state.humidity.target)}% RH`);
    }
});

// =========================================================================
// 7. Physical Thermodynamics & Climate Engine
// =========================================================================
function initThermodynamics() {
    if (thermodynamicsInterval) clearInterval(thermodynamicsInterval);

    thermodynamicsInterval = setInterval(() => {
        const rooms = state.temp.rooms;
        const ambientTemp = 26.5;

        // 1. Aircon cooling
        if (state.aircon.active) {
            let speed = 0.06;
            if (state.aircon.wind === 'medium') speed = 0.12;
            if (state.aircon.wind === 'high') speed = 0.22;

            if (rooms.livingRoom > state.temp.target) {
                rooms.livingRoom = Math.max(state.temp.target, rooms.livingRoom - speed);
            }
            state.humidity.current = Math.max(40, state.humidity.current - 0.2);
        }

        // 2. Boiler heating
        if (state.boiler.active) {
            const bTarget = state.boiler.targetTemp;
            const bMode = state.boiler.mode;
            let heatSpeed = 0.08;
            if (bMode === 'ondol') heatSpeed = 0.14;
            if (bMode === 'eco') heatSpeed = 0.02;

            Object.keys(rooms).forEach(room => {
                if (bMode !== 'water') {
                    if (rooms[room] < bTarget) {
                        rooms[room] = Math.min(bTarget, rooms[room] + heatSpeed);
                    }
                }
            });
            state.humidity.current = Math.max(35, state.humidity.current - 0.1);
        }

        // 3. Ambient drift
        if (!state.aircon.active && !state.boiler.active) {
            Object.keys(rooms).forEach(room => {
                const diff = ambientTemp - rooms[room];
                rooms[room] += diff * 0.01;
            });
        }

        // 4. Heat propagation
        const propRate = 0.03;
        Object.keys(rooms).forEach(room => {
            if (room !== 'livingRoom') {
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
            state.humidity.current += (50.0 - state.humidity.current) * 0.01;
        }

        updateTempUI();
    }, 1000);
}

// =========================================================================
// 8. Automation Scenarios: Away Mode
// =========================================================================
function executeLeaveHome() {
    showToast('외출 모드 실행! (소등, 문닫힘/잠금, 커튼닫힘, 가스차단, 에어컨OFF, 보일러외출)');

    Object.keys(state.lights).forEach(room => state.lights[room] = false);
    updateLightingUI();

    state.door.opened = false;
    state.door.locked = true;
    updateDoorUI();

    // Close all curtains
    Object.keys(state.curtains).forEach(room => state.curtains[room] = false);
    updateCurtainUI();

    if (state.gas.autoGasLock && state.gas.status === 'open') {
        state.gas.status = 'closed';
        updateGasUI();
    }

    if (state.aircon.active) {
        state.aircon.active = false;
        updateTempUI();
    }

    if (state.boiler.active) {
        state.boiler.mode = 'eco';
        state.boiler.targetTemp = 18.0;
        updateBoilerUI();
    }
}

if (elements.btnAwayModeHeader) elements.btnAwayModeHeader.addEventListener('click', executeLeaveHome);
if (elements.btnAwayModeHome) elements.btnAwayModeHome.addEventListener('click', executeLeaveHome);

function showConnectedDevicesCount() {
    showToast('스마트 기기 16개(조명, 도어락, 커튼4개, 가스, 보일러, 에어컨 등) 정상 연결 중');
}

// =========================================================================
// 9. Three.js 3D Engine (100x Scale, 3D Curtains, 3D Lamps, Roof & FPS Walk)
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
        this.lampBulbs = {};
        this.materials = {};
        this.doorMesh = null;
        this.curtainMeshes = {};
        this.acParticles = null;
        this.mistParticles = null;
        this.ondolMeshGroup = null;
        this.stoveFlame = null;
        this.roomLabelsGroup = null;
        this.roofGroup = null;
        this.isAnimatingCamera = false;

        // FPS Mode State
        this.fpsPos = new THREE.Vector3(10, 5.5, 20);
        this.fpsTarget = new THREE.Vector3(10, 5.5, 30);
        this.keys = {};

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // 1. Scene
        this.scene = new THREE.Scene();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.scene.background = new THREE.Color(isDark ? 0x090e1a : 0xebf0f7);
        this.scene.fog = new THREE.FogExp2(isDark ? 0x090e1a : 0xebf0f7, 0.0022);

        // 2. Camera
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 3000);
        this.camera.position.set(130, 130, 130);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.25;
        this.container.appendChild(this.renderer.domElement);

        // 4. Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.04;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;
        this.controls.target.set(0, 5, 0);

        // 5. Illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.45 : 0.75);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff8ee, 0.95);
        this.sunLight.position.set(120, 180, 90);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 450;
        this.sunLight.shadow.camera.left = -160;
        this.sunLight.shadow.camera.right = 160;
        this.sunLight.shadow.camera.top = 100;
        this.sunLight.shadow.camera.bottom = -100;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);

        // 6. Build the 100x Scale Grand House & Fixtures
        this.buildMaterials();
        this.buildGrandHouseModel();
        this.build3DLampFixtures();
        this.build3DCurtains();
        this.buildRoofSlab();
        this.buildOndolHeatingGrid();
        this.buildACParticleStream();
        this.buildHumidifierMist();
        this.buildStoveFlame();
        this.buildRoomLabels();

        // 7. Bind Events & FPS
        window.addEventListener('resize', () => this.onResize());
        this.bindToolbar();
        this.bindRoomHUD();
        this.bindFPSControls();

        // 8. Start Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    buildMaterials() {
        this.materials = {
            floorWoodLiving: new THREE.MeshStandardMaterial({ color: 0xd8c5ab, roughness: 0.35, metalness: 0.05 }),
            floorWoodRooms: new THREE.MeshStandardMaterial({ color: 0xcdb99c, roughness: 0.4, metalness: 0.05 }),
            floorTileKitchen: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.1 }),
            floorTileBath: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.1 }),
            floorBalcony: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 }),
            wallCutaway: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
            wallRoof: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5, metalness: 0.1 }),
            glassWindow: new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.45,
                roughness: 0.1,
                transmission: 0.85,
                thickness: 1.0
            }),
            windowRedMarker: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }),
            curtainFabric: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, side: THREE.DoubleSide }),
            curtainMaster: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.9, side: THREE.DoubleSide }),
            blindRoomA: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, side: THREE.DoubleSide }),
            leatherSofa: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }),
            woodDark: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 }),
            woodLight: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 }),
            furnitureWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
            metalChrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 }),
            doorWood: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }),
            tvScreen: new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.1 }),
            carpetLiving: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 }),
            lampGlowOn: new THREE.MeshBasicMaterial({ color: 0xfff0bb }),
            lampGlowOff: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
        };
    }

    buildGrandHouseModel() {
        const root = new THREE.Group();

        const createWall = (x, z, w, d, h = 10.0, colorMat = this.materials.wallCutaway) => {
            const wallGeo = new THREE.BoxGeometry(w, h, d);
            const wall = new THREE.Mesh(wallGeo, colorMat);
            wall.position.set(x, h / 2, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            root.add(wall);
            return wall;
        };

        const createWindow = (x, z, w, d, h = 6.5) => {
            const frameGeo = new THREE.BoxGeometry(w, 0.4, d);
            const frame = new THREE.Mesh(frameGeo, this.materials.windowRedMarker);
            frame.position.set(x, 5.0, z);
            root.add(frame);

            const glassGeo = new THREE.BoxGeometry(w, h, d);
            const glass = new THREE.Mesh(glassGeo, this.materials.glassWindow);
            glass.position.set(x, 5.0, z);
            root.add(glass);
        };

        // Floors (100x Horizontal Span: X from -150 to +150, Z from -60 to +60)
        // Living Room
        const livingFloor = new THREE.Mesh(new THREE.PlaneGeometry(100, 75), this.materials.floorWoodLiving);
        livingFloor.rotation.x = -Math.PI / 2;
        livingFloor.position.set(10, 0.01, 22.5);
        livingFloor.receiveShadow = true;
        root.add(livingFloor);

        // Master Room
        const masterFloor = new THREE.Mesh(new THREE.PlaneGeometry(110, 50), this.materials.floorWoodRooms);
        masterFloor.rotation.x = -Math.PI / 2;
        masterFloor.position.set(-95, 0.01, 5);
        masterFloor.receiveShadow = true;
        root.add(masterFloor);

        // Room B & Balcony
        const roomBFloor = new THREE.Mesh(new THREE.PlaneGeometry(80, 40), this.materials.floorWoodRooms);
        roomBFloor.rotation.x = -Math.PI / 2;
        roomBFloor.position.set(-80, 0.01, -40);
        roomBFloor.receiveShadow = true;
        root.add(roomBFloor);

        const balconyFloor = new THREE.Mesh(new THREE.PlaneGeometry(30, 40), this.materials.floorBalcony);
        balconyFloor.rotation.x = -Math.PI / 2;
        balconyFloor.position.set(-135, 0.01, -40);
        balconyFloor.receiveShadow = true;
        root.add(balconyFloor);

        // Bathroom
        const bathFloor = new THREE.Mesh(new THREE.PlaneGeometry(110, 30), this.materials.floorTileBath);
        bathFloor.rotation.x = -Math.PI / 2;
        bathFloor.position.set(-95, 0.01, 45);
        bathFloor.receiveShadow = true;
        root.add(bathFloor);

        // Kitchen & Dining
        const kitchenFloor = new THREE.Mesh(new THREE.PlaneGeometry(100, 45), this.materials.floorTileKitchen);
        kitchenFloor.rotation.x = -Math.PI / 2;
        kitchenFloor.position.set(10, 0.01, -37.5);
        kitchenFloor.receiveShadow = true;
        root.add(kitchenFloor);

        // Entrance
        const entranceFloor = new THREE.Mesh(new THREE.PlaneGeometry(90, 45), this.materials.floorTileKitchen);
        entranceFloor.rotation.x = -Math.PI / 2;
        entranceFloor.position.set(105, 0.01, -37.5);
        entranceFloor.receiveShadow = true;
        root.add(entranceFloor);

        // Room A
        const roomAFloor = new THREE.Mesh(new THREE.PlaneGeometry(90, 75), this.materials.floorWoodRooms);
        roomAFloor.rotation.x = -Math.PI / 2;
        roomAFloor.position.set(105, 0.01, 22.5);
        roomAFloor.receiveShadow = true;
        root.add(roomAFloor);

        // Walls & Windows
        createWall(-150, 0, 1.8, 120);
        createWall(-95, 60, 110, 1.8);
        createWall(10, 60, 100, 1.8);
        createWindow(10, 60, 50, 1.0, 7.0); // 거실 대형 창문

        createWall(105, 60, 90, 1.8);
        createWall(150, 22.5, 1.8, 75);
        createWindow(150, 22.5, 1.0, 40, 6.5); // 방 A 창문

        createWall(150, -37.5, 1.8, 45);
        createWall(105, -60, 90, 1.8);
        createWall(10, -60, 100, 1.8);
        createWindow(10, -60, 24, 1.0, 5.0); // 주방 창문

        createWall(-80, -60, 80, 1.8);
        createWall(-150, -40, 1.8, 40);
        createWindow(-150, -40, 1.0, 26, 6.5); // 발코니 창문

        // Interior Walls
        createWall(-40, 0, 1.6, 120);
        createWall(-95, -20, 110, 1.6);
        createWall(-95, 30, 110, 1.6);
        createWindow(-150, 5, 1.0, 36, 6.5); // 안방 외벽 창문

        createWall(-120, -40, 0.4, 40, 10.0, this.materials.glassWindow);
        createWall(60, 0, 1.6, 120);
        createWall(10, -15, 100, 1.6);
        createWall(105, -15, 90, 1.6);

        // Entrance Door Assembly
        const doorFrame = new THREE.Group();
        doorFrame.position.set(105, 0, -60);
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(18, 9.5, 0.8), this.materials.doorWood);
        doorMesh.position.set(9, 4.75, 0);
        doorMesh.castShadow = true;
        doorFrame.add(doorMesh);

        const lockPad = new THREE.Mesh(new THREE.BoxGeometry(1.6, 3.5, 0.4), this.materials.metalChrome);
        lockPad.position.set(16, 4.75, 0.5);
        doorFrame.add(lockPad);
        root.add(doorFrame);
        this.doorMesh = doorFrame;

        // Furniture
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(60, 45), this.materials.carpetLiving);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(10, 0.02, 22);
        root.add(rug);

        const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(45, 3.8, 12), this.materials.leatherSofa);
        sofaMain.position.set(10, 1.9, 10);
        sofaMain.castShadow = true;
        root.add(sofaMain);

        const sofaL = new THREE.Mesh(new THREE.BoxGeometry(12, 3.8, 26), this.materials.leatherSofa);
        sofaL.position.set(-8, 1.9, 23);
        sofaL.castShadow = true;
        root.add(sofaL);

        const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(24, 1.8, 11), this.materials.woodDark);
        coffeeTable.position.set(12, 0.9, 22);
        coffeeTable.castShadow = true;
        root.add(coffeeTable);

        const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(38, 2.4, 6), this.materials.furnitureWhite);
        tvConsole.position.set(10, 1.2, 48);
        tvConsole.castShadow = true;
        root.add(tvConsole);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(28, 12, 0.6), this.materials.tvScreen);
        tvScreen.position.set(10, 8.5, 48.5);
        root.add(tvScreen);

        const acUnit = new THREE.Mesh(new THREE.BoxGeometry(16, 3.2, 2.5), this.materials.furnitureWhite);
        acUnit.position.set(58, 8.2, 10);
        root.add(acUnit);

        const humidifierBody = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 5.0, 24), this.materials.furnitureWhite);
        humidifierBody.position.set(36, 2.5, 26);
        humidifierBody.castShadow = true;
        root.add(humidifierBody);

        const masterBed = new THREE.Mesh(new THREE.BoxGeometry(32, 3.2, 36), this.materials.leatherSofa);
        masterBed.position.set(-95, 1.6, 8);
        masterBed.castShadow = true;
        root.add(masterBed);

        const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(50, 4.0, 8.5), this.materials.furnitureWhite);
        kitchenCounter.position.set(5, 2.0, -52);
        kitchenCounter.castShadow = true;
        root.add(kitchenCounter);

        const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(36, 4.0, 9.0), this.materials.woodDark);
        kitchenIsland.position.set(8, 2.0, -32);
        kitchenIsland.castShadow = true;
        root.add(kitchenIsland);

        const boilerBox = new THREE.Mesh(new THREE.BoxGeometry(8, 9, 3.0), this.materials.furnitureWhite);
        boilerBox.position.set(-32, 6.0, -56);
        root.add(boilerBox);

        this.scene.add(root);
        this.houseRoot = root;
    }

    build3DCurtains() {
        const group = new THREE.Group();

        // 1. Living Room Curtains (Dual panels across the large south window)
        const livingCurtainL = new THREE.Mesh(new THREE.BoxGeometry(12, 7.5, 0.4), this.materials.curtainFabric);
        livingCurtainL.position.set(-10, 5.0, 58.5);
        group.add(livingCurtainL);

        const livingCurtainR = new THREE.Mesh(new THREE.BoxGeometry(12, 7.5, 0.4), this.materials.curtainFabric);
        livingCurtainR.position.set(30, 5.0, 58.5);
        group.add(livingCurtainR);

        this.curtainMeshes.livingRoom = { l: livingCurtainL, r: livingCurtainR, openL: -18, closeL: -1, openR: 38, closeR: 21 };

        // 2. Master Room Curtains (Dual blackout panels on west window)
        const masterCurtainL = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.0, 10), this.materials.curtainMaster);
        masterCurtainL.position.set(-148.5, 5.0, -6);
        group.add(masterCurtainL);

        const masterCurtainR = new THREE.Mesh(new THREE.BoxGeometry(0.4, 7.0, 10), this.materials.curtainMaster);
        masterCurtainR.position.set(-148.5, 5.0, 16);
        group.add(masterCurtainR);

        this.curtainMeshes.masterRoom = { l: masterCurtainL, r: masterCurtainR, openL: -12, closeL: 0, openR: 22, closeR: 10 };

        // 3. Room A Blinds (East window)
        const roomABlind = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.5, 36), this.materials.blindRoomA);
        roomABlind.position.set(148.5, 5.0, 22.5);
        group.add(roomABlind);

        this.curtainMeshes.roomA = { mesh: roomABlind };

        // 4. Room B Blinds (Balcony window)
        const roomBBlind = new THREE.Mesh(new THREE.BoxGeometry(0.4, 6.5, 24), this.materials.blindRoomA);
        roomBBlind.position.set(-148.5, 5.0, -40);
        group.add(roomBBlind);

        this.curtainMeshes.roomB = { mesh: roomBBlind };

        this.scene.add(group);
        this.curtainsGroup = group;
    }

    build3DLampFixtures() {
        const group = new THREE.Group();

        const createLamp = (roomKey, x, z, type = 'chandelier') => {
            const lampStem = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 2.0, 16), this.materials.metalChrome);
            lampStem.position.set(x, 9.0, z);
            group.add(lampStem);

            let fixture, bulb;
            if (type === 'chandelier') {
                fixture = new THREE.Mesh(new THREE.TorusGeometry(3.5, 0.4, 16, 32), this.materials.metalChrome);
                fixture.rotation.x = Math.PI / 2;
                fixture.position.set(x, 8.0, z);
                group.add(fixture);

                bulb = new THREE.Mesh(new THREE.SphereGeometry(1.4, 16, 16), this.materials.lampGlowOff);
                bulb.position.set(x, 7.8, z);
                group.add(bulb);
            } else {
                fixture = new THREE.Mesh(new THREE.ConeGeometry(2.5, 1.8, 24), this.materials.furnitureWhite);
                fixture.position.set(x, 8.2, z);
                group.add(fixture);

                bulb = new THREE.Mesh(new THREE.SphereGeometry(1.2, 16, 16), this.materials.lampGlowOff);
                bulb.position.set(x, 7.5, z);
                group.add(bulb);
            }

            const pLight = new THREE.PointLight(0xffeedd, 0, 75, 1.4);
            pLight.position.set(x, 7.2, z);
            group.add(pLight);

            this.lights[roomKey] = pLight;
            this.lampBulbs[roomKey] = bulb;
        };

        createLamp('livingRoom', 10, 22.5, 'chandelier');
        createLamp('masterRoom', -95, 5, 'chandelier');
        createLamp('kitchen', 8, -32, 'pendant');
        createLamp('roomA', 105, 22.5, 'pendant');
        createLamp('roomB', -80, -40, 'pendant');
        createLamp('bathroom', -95, 45, 'pendant');

        this.scene.add(group);
        this.lampsGroup = group;
    }

    buildRoofSlab() {
        const roofGroup = new THREE.Group();

        const roofMain = new THREE.Mesh(new THREE.BoxGeometry(302, 1.2, 122), this.materials.wallRoof);
        roofMain.position.set(0, 10.6, 0);
        roofGroup.add(roofMain);

        const skylight1 = new THREE.Mesh(new THREE.PlaneGeometry(35, 25), this.materials.glassWindow);
        skylight1.rotation.x = -Math.PI / 2;
        skylight1.position.set(10, 11.3, 22);
        roofGroup.add(skylight1);

        roofGroup.visible = false;
        this.scene.add(roofGroup);
        this.roofGroup = roofGroup;
    }

    buildOndolHeatingGrid() {
        const group = new THREE.Group();

        const createOndolPlane = (x, z, w, d) => {
            const geo = new THREE.PlaneGeometry(w - 2.0, d - 2.0, 24, 24);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xef4444,
                wireframe: true,
                transparent: true,
                opacity: 0
            });
            const plane = new THREE.Mesh(geo, mat);
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(x, 0.08, z);
            group.add(plane);
            return plane;
        };

        this.ondolPlanes = [
            createOndolPlane(10, 22.5, 100, 75),
            createOndolPlane(-95, 5, 110, 50),
            createOndolPlane(-80, -40, 80, 40),
            createOndolPlane(105, 22.5, 90, 75),
            createOndolPlane(10, -37.5, 100, 45)
        ];

        this.scene.add(group);
        this.ondolMeshGroup = group;
    }

    buildACParticleStream() {
        const particleCount = 280;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = 56.0 - Math.random() * 4.0;
            positions[i + 1] = 8.0 - Math.random() * 2.0;
            positions[i + 2] = 10.0 + (Math.random() - 0.5) * 12.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x60a5fa,
            size: 0.9,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.acParticles = new THREE.Points(geometry, material);
        this.scene.add(this.acParticles);
    }

    buildHumidifierMist() {
        const mistCount = 160;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(mistCount * 3);

        for (let i = 0; i < mistCount * 3; i += 3) {
            positions[i] = 36.0 + (Math.random() - 0.5) * 1.5;
            positions[i + 1] = 5.0 + Math.random() * 3.0;
            positions[i + 2] = 26.0 + (Math.random() - 0.5) * 1.5;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xe0f2fe,
            size: 0.7,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.mistParticles = new THREE.Points(geometry, material);
        this.scene.add(this.mistParticles);
    }

    buildStoveFlame() {
        const flameGeo = new THREE.ConeGeometry(0.8, 1.8, 8);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(5, 4.5, -52);
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
            ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
            ctx.roundRect(10, 10, 236, 60, 14);
            ctx.fill();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 4;
            ctx.stroke();

            ctx.font = 'bold 26px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 40);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, 12.0, z);
            sprite.scale.set(22, 6.8, 1);
            group.add(sprite);
        };

        createLabel('거실 (Living)', 10, 22.5);
        createLabel('안방 (Master)', -95, 5);
        createLabel('방 B & 발코니', -80, -40);
        createLabel('방 A (Room A)', 105, 22.5);
        createLabel('주방 & 식당', 10, -37.5);
        createLabel('공용 욕실', -95, 45);
        createLabel('현관 (Door)', 105, -37.5);

        this.scene.add(group);
        this.roomLabelsGroup = group;
    }

    syncLights() {
        const factor = state.brightness / 100;
        Object.keys(state.lights).forEach(room => {
            const isOn = state.lights[room];
            if (this.lights[room]) {
                this.lights[room].intensity = isOn ? (2.8 * factor + 0.6) : 0;
            }
            if (this.lampBulbs[room]) {
                this.lampBulbs[room].material = isOn ? this.materials.lampGlowOn : this.materials.lampGlowOff;
            }
        });
    }

    syncDoor() {}
    syncCurtains() {}

    syncGas() {
        if (this.stoveFlame) {
            this.stoveFlame.material.opacity = (state.gas.status === 'open') ? 0.9 : 0;
        }
    }

    updateTheme(theme) {
        const isDark = (theme === 'dark');
        if (this.scene) {
            this.scene.background.setHex(isDark ? 0x090e1a : 0xebf0f7);
            this.scene.fog.color.setHex(isDark ? 0x090e1a : 0xebf0f7);
        }
        if (this.ambientLight) {
            this.ambientLight.intensity = isDark ? 0.45 : 0.75;
        }
    }

    toggleRoof() {
        state.effects3D.roof = !state.effects3D.roof;
        if (this.roofGroup) this.roofGroup.visible = state.effects3D.roof;
        elements.btnToggleRoof.classList.toggle('active', state.effects3D.roof);
        showToast(`지붕(천장) [${state.effects3D.roof ? 'ON (완전 밀폐)' : 'OFF (오픈 탑뷰)'}]`);
    }

    // --- 1st-Person Walkthrough Engine ---
    enterFPSMode(startPos = new THREE.Vector3(10, 5.5, 20)) {
        state.fpsMode = true;
        this.fpsPos.copy(startPos);
        this.camera.position.copy(this.fpsPos);
        this.controls.target.set(this.fpsPos.x, this.fpsPos.y, this.fpsPos.z + 10);
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 15;
        this.controls.maxPolarAngle = Math.PI / 1.9;

        elements.btnCamFps.classList.add('active');
        elements.fpsControlsOverlay.classList.add('active');
        showToast('🚶 1인칭 걷기 모드 시작! (WASD / D-Pad 조작)');
    }

    exitFPSMode() {
        state.fpsMode = false;
        elements.btnCamFps.classList.remove('active');
        elements.fpsControlsOverlay.classList.remove('active');
        this.controls.minDistance = 10;
        this.controls.maxDistance = 500;
        this.controls.maxPolarAngle = Math.PI / 2.04;
    }

    walk(forward = 0, strafe = 0) {
        if (!state.fpsMode) return;

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        const side = new THREE.Vector3(-dir.z, 0, dir.x);

        const moveStep = 1.6;
        this.fpsPos.addScaledVector(dir, forward * moveStep);
        this.fpsPos.addScaledVector(side, strafe * moveStep);

        // Boundary Clamp
        this.fpsPos.x = Math.max(-140, Math.min(140, this.fpsPos.x));
        this.fpsPos.z = Math.max(-55, Math.min(55, this.fpsPos.z));
        this.fpsPos.y = 5.5;

        this.camera.position.copy(this.fpsPos);
        this.controls.target.copy(this.fpsPos).add(dir.multiplyScalar(10));
    }

    animateCameraTo(targetPos, targetLookAt, duration = 800) {
        this.exitFPSMode();

        const startPos = this.camera.position.clone();
        const startTarget = this.controls.target.clone();
        const startTime = performance.now();

        this.isAnimatingCamera = true;

        const updateCam = (now) => {
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const ease = 0.5 - Math.cos(progress * Math.PI) / 2;

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
        elements.btnCamIso.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(130, 130, 130), new THREE.Vector3(0, 5, 0));
        });

        elements.btnCamTop.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamTop);
            this.animateCameraTo(new THREE.Vector3(0, 190, 0.1), new THREE.Vector3(0, 0, 0));
        });

        elements.btnCamFps.addEventListener('click', () => {
            if (state.fpsMode) {
                this.exitFPSMode();
                this.setActiveToolBtn(elements.btnCamIso);
                this.animateCameraTo(new THREE.Vector3(130, 130, 130), new THREE.Vector3(0, 5, 0));
            } else {
                this.setActiveToolBtn(elements.btnCamFps);
                this.enterFPSMode();
            }
        });

        elements.btnCamLiving.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamLiving);
            this.animateCameraTo(new THREE.Vector3(10, 60, 95), new THREE.Vector3(10, 4, 22.5));
        });

        elements.btnCamMaster.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamMaster);
            this.animateCameraTo(new THREE.Vector3(-95, 60, 75), new THREE.Vector3(-95, 4, 5));
        });

        elements.btnCamKitchen.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamKitchen);
            this.animateCameraTo(new THREE.Vector3(10, 60, -95), new THREE.Vector3(10, 4, -37.5));
        });

        elements.btnCamReset.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(130, 130, 130), new THREE.Vector3(0, 5, 0));
        });

        elements.btnToggleRoof.addEventListener('click', () => this.toggleRoof());

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

    bindRoomHUD() {
        const roomCoords = {
            living: { cam: new THREE.Vector3(10, 60, 95), look: new THREE.Vector3(10, 4, 22.5), fps: new THREE.Vector3(10, 5.5, 20) },
            master: { cam: new THREE.Vector3(-95, 60, 75), look: new THREE.Vector3(-95, 4, 5), fps: new THREE.Vector3(-95, 5.5, 5) },
            roomb: { cam: new THREE.Vector3(-80, 60, -90), look: new THREE.Vector3(-80, 4, -40), fps: new THREE.Vector3(-80, 5.5, -40) },
            rooma: { cam: new THREE.Vector3(105, 60, 90), look: new THREE.Vector3(105, 4, 22.5), fps: new THREE.Vector3(105, 5.5, 20) },
            kitchen: { cam: new THREE.Vector3(10, 60, -95), look: new THREE.Vector3(10, 4, -37.5), fps: new THREE.Vector3(10, 5.5, -30) },
            bath: { cam: new THREE.Vector3(-95, 60, 95), look: new THREE.Vector3(-95, 4, 45), fps: new THREE.Vector3(-95, 5.5, 45) },
            entrance: { cam: new THREE.Vector3(105, 60, -95), look: new THREE.Vector3(105, 4, -37.5), fps: new THREE.Vector3(105, 5.5, -45) }
        };

        elements.roomFocusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const roomKey = btn.dataset.roomFocus;
                const coord = roomCoords[roomKey];
                if (coord) {
                    if (state.fpsMode) {
                        this.enterFPSMode(coord.fps);
                    } else {
                        this.setActiveToolBtn(null);
                        this.animateCameraTo(coord.cam, coord.look);
                    }
                }
            });
        });
    }

    bindFPSControls() {
        window.addEventListener('keydown', (e) => {
            if (!state.fpsMode) return;
            const key = e.key.toLowerCase();
            if (key === 'w' || key === 'arrowup') this.walk(1, 0);
            if (key === 's' || key === 'arrowdown') this.walk(-1, 0);
            if (key === 'a' || key === 'arrowleft') this.walk(0, -1);
            if (key === 'd' || key === 'arrowright') this.walk(0, 1);
        });

        elements.btnDpadUp.addEventListener('click', () => this.walk(1, 0));
        elements.btnDpadDown.addEventListener('click', () => this.walk(-1, 0));
        elements.btnDpadLeft.addEventListener('click', () => this.walk(0, -1));
        elements.btnDpadRight.addEventListener('click', () => this.walk(0, 1));
    }

    setActiveToolBtn(activeBtn) {
        document.querySelectorAll('.toolbar-left-group .btn-view-chip').forEach(btn => {
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

        if (!this.isAnimatingCamera && this.controls) {
            this.controls.update();
        }

        // 1. Door Physical Swing Animation (0 deg closed, 90 deg open)
        if (this.doorMesh) {
            const targetRotation = state.door.opened ? (Math.PI / 2.05) : 0;
            this.doorMesh.rotation.y += (targetRotation - this.doorMesh.rotation.y) * 0.12;
        }

        // 2. Curtains Animated Sliding/Scaling
        if (this.curtainMeshes.livingRoom) {
            const cur = this.curtainMeshes.livingRoom;
            const targetX_L = state.curtains.livingRoom ? cur.openL : cur.closeL;
            const targetX_R = state.curtains.livingRoom ? cur.openR : cur.closeR;
            cur.l.position.x += (targetX_L - cur.l.position.x) * 0.1;
            cur.r.position.x += (targetX_R - cur.r.position.x) * 0.1;
        }

        if (this.curtainMeshes.masterRoom) {
            const cur = this.curtainMeshes.masterRoom;
            const targetZ_L = state.curtains.masterRoom ? cur.openL : cur.closeL;
            const targetZ_R = state.curtains.masterRoom ? cur.openR : cur.closeR;
            cur.l.position.z += (targetZ_L - cur.l.position.z) * 0.1;
            cur.r.position.z += (targetZ_R - cur.r.position.z) * 0.1;
        }

        if (this.curtainMeshes.roomA) {
            const cur = this.curtainMeshes.roomA;
            const targetScaleY = state.curtains.roomA ? 0.15 : 1.0;
            cur.mesh.scale.y += (targetScaleY - cur.mesh.scale.y) * 0.1;
            cur.mesh.position.y = 8.2 - (cur.mesh.scale.y * 3.2);
        }

        if (this.curtainMeshes.roomB) {
            const cur = this.curtainMeshes.roomB;
            const targetScaleY = state.curtains.roomB ? 0.15 : 1.0;
            cur.mesh.scale.y += (targetScaleY - cur.mesh.scale.y) * 0.1;
            cur.mesh.position.y = 8.2 - (cur.mesh.scale.y * 3.2);
        }

        // 3. Ondol Heat Glow Pulse
        if (this.ondolPlanes && this.ondolPlanes.length > 0) {
            const isBoilerOn = state.boiler.active;
            const targetOpacity = isBoilerOn ? (0.45 + 0.3 * Math.sin(time * 3.5)) : 0;
            this.ondolPlanes.forEach(plane => {
                plane.material.opacity += (targetOpacity - plane.material.opacity) * 0.1;
            });
        }

        // 4. AC Particle Flow
        if (this.acParticles) {
            const isAcOn = state.aircon.active;
            const targetOpacity = isAcOn ? 0.85 : 0;
            this.acParticles.material.opacity += (targetOpacity - this.acParticles.material.opacity) * 0.1;

            if (isAcOn || this.acParticles.material.opacity > 0.02) {
                const positions = this.acParticles.geometry.attributes.position.array;
                const windSpeed = state.aircon.wind === 'high' ? 0.8 : (state.aircon.wind === 'medium' ? 0.5 : 0.3);

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] -= windSpeed * 1.5;
                    positions[i + 1] -= windSpeed * 0.25;
                    positions[i + 2] += (Math.sin(time * 2 + i) * 0.1);

                    if (positions[i] < -20.0 || positions[i + 1] < 1.0) {
                        positions[i] = 56.0 - Math.random() * 4.0;
                        positions[i + 1] = 8.0 - Math.random() * 2.0;
                        positions[i + 2] = 10.0 + (Math.random() - 0.5) * 12.0;
                    }
                }
                this.acParticles.geometry.attributes.position.needsUpdate = true;
            }
        }

        // 5. Humidifier Mist Flow
        if (this.mistParticles) {
            const isHumOn = (state.humidity.mode === 'humidify' || (state.humidity.mode === 'auto' && state.humidity.current < state.humidity.target));
            const targetOpacity = isHumOn ? 0.75 : 0;
            this.mistParticles.material.opacity += (targetOpacity - this.mistParticles.material.opacity) * 0.1;

            if (isHumOn || this.mistParticles.material.opacity > 0.02) {
                const positions = this.mistParticles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += 0.08;
                    positions[i] += (Math.sin(time * 3 + i) * 0.03);
                    positions[i + 2] += (Math.cos(time * 3 + i) * 0.03);

                    if (positions[i + 1] > 9.5) {
                        positions[i] = 36.0 + (Math.random() - 0.5) * 1.5;
                        positions[i + 1] = 5.0;
                        positions[i + 2] = 26.0 + (Math.random() - 0.5) * 1.5;
                    }
                }
                this.mistParticles.geometry.attributes.position.needsUpdate = true;
            }
        }

        // 6. Stove Flame
        if (this.stoveFlame && state.gas.status === 'open') {
            this.stoveFlame.scale.set(
                1 + 0.15 * Math.sin(time * 15),
                1 + 0.25 * Math.cos(time * 12),
                1 + 0.15 * Math.sin(time * 15)
            );
        }

        if (this.renderer && this.scene && this.camera) {
            this.renderer.render(this.scene, this.camera);
        }
    }
}

let threeApp = null;

function init() {
    initTheme();
    updateLightingUI();
    updateDoorUI();
    updateCurtainUI();
    updateGasUI();
    updateTempUI();
    initThermodynamics();

    setTimeout(() => {
        threeApp = new ThreeJSSimulator('threejs-container');
        if (threeApp) {
            threeApp.syncLights();
            threeApp.syncDoor();
            threeApp.syncCurtains();
            threeApp.syncGas();
        }
    }, 150);
}

document.addEventListener('DOMContentLoaded', init);
init();
