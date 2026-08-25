// AURA 3D Smart Home Digital Twin - Grand Scale Penthouse Engine & Continuous WASD Walkthrough

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
        locked: true,
        opened: false
    },
    curtains: {
        livingRoom: true,
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
    const translatePercentage = -(screenIndex - 1) * 16.666;
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
    if (state.door.opened) {
        elements.btnDoorOpenPhys.classList.add('active');
        elements.btnDoorClosePhys.classList.remove('active');
    } else {
        elements.btnDoorOpenPhys.classList.remove('active');
        elements.btnDoorClosePhys.classList.add('active');
    }

    if (state.door.locked) {
        elements.btnDoorUnlock.classList.remove('active');
        elements.btnDoorLock.classList.add('active');
    } else {
        elements.btnDoorUnlock.classList.add('active');
        elements.btnDoorLock.classList.remove('active');
    }

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
    if (state.door.locked) state.door.locked = false;
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
    if (state.door.opened) state.door.opened = false;
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
// 9. Three.js 3D Monumental Engine (100x Scale, Soaring Walls, WASD FPS & Curtains)
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

        // Continuous WASD Keys Tracker
        this.keys = {};
        this.fpsPos = new THREE.Vector3(25, 7.0, 60); // Living room eye level
        this.clock = new THREE.Clock();

        this.init();
    }

    init() {
        const width = this.container.clientWidth;
        const height = this.container.clientHeight;

        // 1. Scene
        this.scene = new THREE.Scene();
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        this.scene.background = new THREE.Color(isDark ? 0x090e1a : 0xebf0f7);
        this.scene.fog = new THREE.FogExp2(isDark ? 0x090e1a : 0xebf0f7, 0.0015);

        // 2. Camera (Wide Far Plane for High-rise Scale)
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 20000);
        this.camera.position.set(160, 160, 160);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.3;
        this.container.appendChild(this.renderer.domElement);

        // 4. Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.04;
        this.controls.minDistance = 10;
        this.controls.maxDistance = 1200;
        this.controls.target.set(0, 8, 0);

        // 5. Illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.45 : 0.78);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff8ee, 0.95);
        this.sunLight.position.set(180, 260, 140);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 700;
        this.sunLight.shadow.camera.left = -220;
        this.sunLight.shadow.camera.right = 220;
        this.sunLight.shadow.camera.top = 220;
        this.sunLight.shadow.camera.bottom = -220;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);

        // 6. Build the Soaring Grand House & Modern Reorganized Furniture
        this.buildMaterials();
        this.buildGrandHouseArchitecture();
        this.build3DLamps();
        this.build3DCurtains();
        this.buildRoofSlab();
        this.buildOndolHeatingGrid();
        this.buildACParticleStream();
        this.buildHumidifierMist();
        this.buildStoveFlame();
        this.buildRoomLabels();

        // 7. Bind WASD & Events
        window.addEventListener('resize', () => this.onResize());
        this.bindToolbar();
        this.bindRoomHUD();
        this.bindContinuousWASD();

        // 8. Start Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    buildMaterials() {
        this.materials = {
            floorLiving: new THREE.MeshStandardMaterial({ color: 0xd8c5ab, roughness: 0.35, metalness: 0.05 }),
            floorRooms: new THREE.MeshStandardMaterial({ color: 0xcdb99c, roughness: 0.4, metalness: 0.05 }),
            floorKitchen: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.1 }),
            floorBath: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.1 }),
            floorBalcony: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 }),
            wallCutaway: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
            wallRoof: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.1 }),
            glassWindow: new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.45,
                roughness: 0.1,
                transmission: 0.85,
                thickness: 1.2
            }),
            windowRedMarker: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }),
            curtainFabric: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.85, side: THREE.DoubleSide }),
            curtainMaster: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.DoubleSide }),
            blindMesh: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.5, side: THREE.DoubleSide }),
            leatherSofa: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }),
            leatherSofaAccent: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.6 }),
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

    buildGrandHouseArchitecture() {
        const root = new THREE.Group();

        // Soaring Wall Height (Y: 18.0 units)
        const wallHeight = 18.0;

        const createWall = (x, z, w, d, h = wallHeight, colorMat = this.materials.wallCutaway) => {
            const wallGeo = new THREE.BoxGeometry(w, h, d);
            const wall = new THREE.Mesh(wallGeo, colorMat);
            wall.position.set(x, h / 2, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            root.add(wall);
            return wall;
        };

        const createWindow = (x, z, w, d, h = 12.0) => {
            const frameGeo = new THREE.BoxGeometry(w, 0.5, d);
            const frame = new THREE.Mesh(frameGeo, this.materials.windowRedMarker);
            frame.position.set(x, 9.0, z);
            root.add(frame);

            const glassGeo = new THREE.BoxGeometry(w, h, d);
            const glass = new THREE.Mesh(glassGeo, this.materials.glassWindow);
            glass.position.set(x, 9.0, z);
            root.add(glass);
        };

        // =====================================================================
        // 1. FLOORS (Grand Spans: X: -150 to +150, Z: -150 to +150)
        // =====================================================================
        // Living Room (거실): X: -30 to +80 (w: 110), Z: -20 to +150 (d: 170)
        const livingFloor = new THREE.Mesh(new THREE.PlaneGeometry(110, 170), this.materials.floorLiving);
        livingFloor.rotation.x = -Math.PI / 2;
        livingFloor.position.set(25, 0.01, 65);
        livingFloor.receiveShadow = true;
        root.add(livingFloor);

        // Master Room (안방): X: -150 to -30 (w: 120), Z: -30 to +70 (d: 100)
        const masterFloor = new THREE.Mesh(new THREE.PlaneGeometry(120, 100), this.materials.floorRooms);
        masterFloor.rotation.x = -Math.PI / 2;
        masterFloor.position.set(-90, 0.01, 20);
        masterFloor.receiveShadow = true;
        root.add(masterFloor);

        // Room B (방 B): X: -110 to -30 (w: 80), Z: -150 to -30 (d: 120)
        const roomBFloor = new THREE.Mesh(new THREE.PlaneGeometry(80, 120), this.materials.floorRooms);
        roomBFloor.rotation.x = -Math.PI / 2;
        roomBFloor.position.set(-70, 0.01, -90);
        roomBFloor.receiveShadow = true;
        root.add(roomBFloor);

        // Balcony (발코니): X: -150 to -110 (w: 40), Z: -150 to -30 (d: 120)
        const balconyFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 120), this.materials.floorBalcony);
        balconyFloor.rotation.x = -Math.PI / 2;
        balconyFloor.position.set(-130, 0.01, -90);
        balconyFloor.receiveShadow = true;
        root.add(balconyFloor);

        // Bathroom (화장실): X: -150 to -30 (w: 120), Z: +70 to +150 (d: 80)
        const bathFloor = new THREE.Mesh(new THREE.PlaneGeometry(120, 80), this.materials.floorBath);
        bathFloor.rotation.x = -Math.PI / 2;
        bathFloor.position.set(-90, 0.01, 110);
        bathFloor.receiveShadow = true;
        root.add(bathFloor);

        // Kitchen & Dining (주방): X: -30 to +80 (w: 110), Z: -150 to -20 (d: 130)
        const kitchenFloor = new THREE.Mesh(new THREE.PlaneGeometry(110, 130), this.materials.floorKitchen);
        kitchenFloor.rotation.x = -Math.PI / 2;
        kitchenFloor.position.set(25, 0.01, -85);
        kitchenFloor.receiveShadow = true;
        root.add(kitchenFloor);

        // Entrance (현관): X: +80 to +150 (w: 70), Z: -150 to -20 (d: 130)
        const entranceFloor = new THREE.Mesh(new THREE.PlaneGeometry(70, 130), this.materials.floorKitchen);
        entranceFloor.rotation.x = -Math.PI / 2;
        entranceFloor.position.set(115, 0.01, -85);
        entranceFloor.receiveShadow = true;
        root.add(entranceFloor);

        // Room A (방 A): X: +80 to +150 (w: 70), Z: -20 to +150 (d: 170)
        const roomAFloor = new THREE.Mesh(new THREE.PlaneGeometry(70, 170), this.materials.floorRooms);
        roomAFloor.rotation.x = -Math.PI / 2;
        roomAFloor.position.set(115, 0.01, 65);
        roomAFloor.receiveShadow = true;
        root.add(roomAFloor);

        // =====================================================================
        // 2. WALLS & WINDOWS
        // =====================================================================
        createWall(-150, 0, 2.0, 300); // Far Left Wall
        createWall(-90, 150, 120, 2.0); // Bath Bottom Wall
        createWall(25, 150, 110, 2.0);  // Living Room Bottom Wall
        createWindow(25, 150, 70, 1.2, 13.0); // 거실 대형 창문 (Red Marker)

        createWall(115, 150, 70, 2.0);  // Room A Bottom Wall
        createWall(150, 65, 2.0, 170);  // Room A Right Wall
        createWindow(150, 65, 1.2, 70, 12.0); // 방 A 창문 (Red Marker)

        createWall(150, -85, 2.0, 130); // Entrance Right Wall
        createWall(115, -150, 70, 2.0); // Entrance Top Wall
        createWall(25, -150, 110, 2.0); // Kitchen Top Wall
        createWindow(25, -150, 40, 1.2, 10.0); // 주방 창문

        createWall(-70, -150, 80, 2.0); // Room B Top Wall
        createWall(-150, -90, 2.0, 120); // Balcony Outer Wall
        createWindow(-150, -90, 1.2, 70, 12.0); // 발코니 창문

        // Dividing Walls
        createWall(-30, 0, 1.8, 300);   // Master/RoomB/Bath vs Living/Kitchen Divider
        createWall(-90, -30, 120, 1.8); // Room B vs Master Room Divider
        createWall(-90, 70, 120, 1.8);  // Master Room vs Bath Divider
        createWindow(-150, 20, 1.2, 50, 12.0); // 안방 창문 (Red Marker)

        createWall(-110, -90, 0.4, 120, wallHeight, this.materials.glassWindow); // Balcony Glass Divider
        createWall(80, 0, 1.8, 300);    // Living/Kitchen vs Entrance/RoomA Divider
        createWall(25, -20, 110, 1.8);  // Kitchen vs Living Divider
        createWall(115, -20, 70, 1.8);  // Entrance vs Room A Divider

        // Entrance Door
        const doorFrame = new THREE.Group();
        doorFrame.position.set(115, 0, -150);
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(22, 16.0, 1.0), this.materials.doorWood);
        doorMesh.position.set(11, 8.0, 0);
        doorMesh.castShadow = true;
        doorFrame.add(doorMesh);

        const lockPad = new THREE.Mesh(new THREE.BoxGeometry(2.0, 5.0, 0.4), this.materials.metalChrome);
        lockPad.position.set(20, 8.0, 0.6);
        doorFrame.add(lockPad);
        root.add(doorFrame);
        this.doorMesh = doorFrame;

        // =====================================================================
        // 3. BEAUTIFULLY REORGANIZED GRAND FURNITURE SET
        // =====================================================================

        // --- 🛋️ 거실 (Living Room) ---
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(80, 65), this.materials.carpetLiving);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(25, 0.02, 65);
        root.add(rug);

        // U-Shaped Modern Sectional Sofa Suite
        const sofaCenter = new THREE.Mesh(new THREE.BoxGeometry(55, 4.5, 14), this.materials.leatherSofa);
        sofaCenter.position.set(25, 2.25, 45);
        sofaCenter.castShadow = true;
        root.add(sofaCenter);

        const sofaWingL = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 35), this.materials.leatherSofa);
        sofaWingL.position.set(-6, 2.25, 62);
        sofaWingL.castShadow = true;
        root.add(sofaWingL);

        const sofaWingR = new THREE.Mesh(new THREE.BoxGeometry(14, 4.5, 35), this.materials.leatherSofaAccent);
        sofaWingR.position.set(56, 2.25, 62);
        sofaWingR.castShadow = true;
        root.add(sofaWingR);

        // Grand Marble Coffee Table
        const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(32, 2.2, 16), this.materials.woodDark);
        coffeeTable.position.set(25, 1.1, 65);
        coffeeTable.castShadow = true;
        root.add(coffeeTable);

        // 98-inch 8K Smart TV & Entertainment Console
        const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(60, 3.0, 7), this.materials.furnitureWhite);
        tvConsole.position.set(25, 1.5, 138);
        tvConsole.castShadow = true;
        root.add(tvConsole);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(45, 20.0, 0.8), this.materials.tvScreen);
        tvScreen.position.set(25, 13.0, 138.5);
        root.add(tvScreen);

        // Smart Air Conditioner Tower on side wall
        const acUnit = new THREE.Mesh(new THREE.BoxGeometry(22, 5.0, 3.5), this.materials.furnitureWhite);
        acUnit.position.set(78, 14.0, 45);
        root.add(acUnit);
        this.acUnitMesh = acUnit;

        // Smart Ultrasonic Humidifier Console
        const humidifierBody = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.0, 7.0, 24), this.materials.furnitureWhite);
        humidifierBody.position.set(58, 3.5, 95);
        humidifierBody.castShadow = true;
        root.add(humidifierBody);
        this.humidifierMesh = humidifierBody;

        // --- 🍳 주방 & 식당 (Kitchen & Dining) ---
        // Chef's Long Marble Island with Induction Cooktop
        const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(55, 5.0, 14), this.materials.woodDark);
        kitchenIsland.position.set(25, 2.5, -80);
        kitchenIsland.castShadow = true;
        root.add(kitchenIsland);

        // Counter Wall Unit
        const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(80, 5.0, 12), this.materials.furnitureWhite);
        kitchenCounter.position.set(25, 2.5, -140);
        kitchenCounter.castShadow = true;
        root.add(kitchenCounter);

        // Smart Boiler Station on Utility Wall
        const boilerBox = new THREE.Mesh(new THREE.BoxGeometry(12, 14, 4.0), this.materials.furnitureWhite);
        boilerBox.position.set(-22, 9.0, -145);
        root.add(boilerBox);

        // 8-Seater Designer Dining Table
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(45, 4.5, 18), this.materials.woodLight);
        diningTable.position.set(25, 2.25, -45);
        diningTable.castShadow = true;
        root.add(diningTable);

        // Refrigerator
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(12, 14.0, 8), this.materials.metalChrome);
        fridge.position.set(65, 7.0, -140);
        root.add(fridge);

        // --- 🛏️ 안방 (Master Suite) ---
        // Master King-size Bed & Headboard
        const masterBed = new THREE.Mesh(new THREE.BoxGeometry(45, 4.5, 50), this.materials.leatherSofa);
        masterBed.position.set(-90, 2.25, 25);
        masterBed.castShadow = true;
        root.add(masterBed);

        const headboard = new THREE.Mesh(new THREE.BoxGeometry(55, 12.0, 3.0), this.materials.woodDark);
        headboard.position.set(-90, 6.0, -3);
        root.add(headboard);

        // Nightstands
        const nightstandL = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 6), this.materials.woodDark);
        nightstandL.position.set(-124, 1.75, 5);
        root.add(nightstandL);

        const nightstandR = new THREE.Mesh(new THREE.BoxGeometry(8, 3.5, 6), this.materials.woodDark);
        nightstandR.position.set(-56, 1.75, 5);
        root.add(nightstandR);

        // Full-wall Wardrobe Closet
        const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(80, 14.0, 6), this.materials.furnitureWhite);
        wardrobe.position.set(-90, 7.0, 65);
        root.add(wardrobe);

        // --- 🛏️ 방 B & 발코니 (Work & Gaming Studio) ---
        const bedB = new THREE.Mesh(new THREE.BoxGeometry(25, 4.0, 45), this.materials.leatherSofa);
        bedB.position.set(-55, 2.0, -80);
        bedB.castShadow = true;
        root.add(bedB);

        const deskB = new THREE.Mesh(new THREE.BoxGeometry(30, 4.0, 10), this.materials.woodDark);
        deskB.position.set(-85, 2.0, -135);
        deskB.castShadow = true;
        root.add(deskB);

        const laundryRack = new THREE.Mesh(new THREE.BoxGeometry(16, 10.0, 6), this.materials.metalChrome);
        laundryRack.position.set(-130, 5.0, -90);
        root.add(laundryRack);

        // --- 🛏️ 방 A (Study & Library Bedroom) ---
        const bedA = new THREE.Mesh(new THREE.BoxGeometry(25, 4.0, 45), this.materials.leatherSofa);
        bedA.position.set(125, 2.0, 80);
        bedA.castShadow = true;
        root.add(bedA);

        const deskA = new THREE.Mesh(new THREE.BoxGeometry(35, 4.0, 10), this.materials.woodLight);
        deskA.position.set(100, 2.0, 10);
        deskA.castShadow = true;
        root.add(deskA);

        const bookshelfA = new THREE.Mesh(new THREE.BoxGeometry(45, 14.0, 6), this.materials.woodDark);
        bookshelfA.position.set(115, 7.0, 140);
        root.add(bookshelfA);

        // --- 🛁 욕실 (Bathroom) ---
        const bathtub = new THREE.Mesh(new THREE.BoxGeometry(35, 5.5, 18), this.materials.furnitureWhite);
        bathtub.position.set(-115, 2.75, 115);
        bathtub.castShadow = true;
        root.add(bathtub);

        const vanity = new THREE.Mesh(new THREE.BoxGeometry(30, 4.5, 10), this.materials.furnitureWhite);
        vanity.position.set(-65, 2.25, 80);
        root.add(vanity);

        // --- 🚪 현관 (Entrance Hall) ---
        const shoeCabinet = new THREE.Mesh(new THREE.BoxGeometry(35, 14.0, 8), this.materials.furnitureWhite);
        shoeCabinet.position.set(125, 7.0, -45);
        root.add(shoeCabinet);

        this.scene.add(root);
        this.houseRoot = root;
    }

    build3DCurtains() {
        const group = new THREE.Group();

        // 1. Living Room Wide Curtains (South Wall Window)
        const livingCurtainL = new THREE.Mesh(new THREE.BoxGeometry(24, 14.0, 0.6), this.materials.curtainFabric);
        livingCurtainL.position.set(-6, 8.5, 148);
        group.add(livingCurtainL);

        const livingCurtainR = new THREE.Mesh(new THREE.BoxGeometry(24, 14.0, 0.6), this.materials.curtainFabric);
        livingCurtainR.position.set(56, 8.5, 148);
        group.add(livingCurtainR);

        this.curtainMeshes.livingRoom = { l: livingCurtainL, r: livingCurtainR, openL: -18, closeL: 8, openR: 68, closeR: 42 };

        // 2. Master Room Blackout Curtains (West Wall Window)
        const masterCurtainL = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13.0, 18), this.materials.curtainMaster);
        masterCurtainL.position.set(-148, 8.5, 2);
        group.add(masterCurtainL);

        const masterCurtainR = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13.0, 18), this.materials.curtainMaster);
        masterCurtainR.position.set(-148, 8.5, 38);
        group.add(masterCurtainR);

        this.curtainMeshes.masterRoom = { l: masterCurtainL, r: masterCurtainR, openL: -8, closeL: 10, openR: 48, closeR: 30 };

        // 3. Room A Blinds (East Window)
        const roomABlind = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13.0, 68), this.materials.blindMesh);
        roomABlind.position.set(148, 8.5, 65);
        group.add(roomABlind);
        this.curtainMeshes.roomA = { mesh: roomABlind };

        // 4. Room B Balcony Blinds (West Window)
        const roomBBlind = new THREE.Mesh(new THREE.BoxGeometry(0.6, 13.0, 68), this.materials.blindMesh);
        roomBBlind.position.set(-148, 8.5, -90);
        group.add(roomBBlind);
        this.curtainMeshes.roomB = { mesh: roomBBlind };

        this.scene.add(group);
        this.curtainsGroup = group;
    }

    build3DLamps() {
        const group = new THREE.Group();

        const createGrandLamp = (roomKey, x, y, z, type = 'chandelier') => {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4.0, 16), this.materials.metalChrome);
            stem.position.set(x, y + 2.0, z);
            group.add(stem);

            let fixture, bulb;
            if (type === 'chandelier') {
                fixture = new THREE.Mesh(new THREE.TorusGeometry(6.5, 0.8, 16, 32), this.materials.metalChrome);
                fixture.rotation.x = Math.PI / 2;
                fixture.position.set(x, y, z);
                group.add(fixture);

                bulb = new THREE.Mesh(new THREE.SphereGeometry(2.8, 16, 16), this.materials.lampGlowOff);
                bulb.position.set(x, y - 0.4, z);
                group.add(bulb);
            } else {
                fixture = new THREE.Mesh(new THREE.ConeGeometry(4.5, 3.2, 24), this.materials.furnitureWhite);
                fixture.position.set(x, y + 0.5, z);
                group.add(fixture);

                bulb = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 16), this.materials.lampGlowOff);
                bulb.position.set(x, y - 0.6, z);
                group.add(bulb);
            }

            const pLight = new THREE.PointLight(0xffeedd, 0, 120, 1.4);
            pLight.position.set(x, y - 1.2, z);
            group.add(pLight);

            this.lights[roomKey] = pLight;
            this.lampBulbs[roomKey] = bulb;
        };

        createGrandLamp('livingRoom', 25, 14.0, 65, 'chandelier');
        createGrandLamp('masterRoom', -90, 14.0, 20, 'chandelier');
        createGrandLamp('kitchen', 25, 14.0, -65, 'pendant');
        createGrandLamp('roomA', 115, 14.0, 65, 'pendant');
        createGrandLamp('roomB', -70, 14.0, -90, 'pendant');
        createGrandLamp('bathroom', -90, 14.0, 110, 'pendant');

        this.scene.add(group);
        this.lampsGroup = group;
    }

    buildRoofSlab() {
        const roofGroup = new THREE.Group();

        const roofMain = new THREE.Mesh(new THREE.BoxGeometry(304, 2.0, 304), this.materials.wallRoof);
        roofMain.position.set(0, 19.0, 0);
        roofGroup.add(roofMain);

        const skylight = new THREE.Mesh(new THREE.PlaneGeometry(60, 45), this.materials.glassWindow);
        skylight.rotation.x = -Math.PI / 2;
        skylight.position.set(25, 20.2, 65);
        roofGroup.add(skylight);

        roofGroup.visible = false;
        this.scene.add(roofGroup);
        this.roofGroup = roofGroup;
    }

    buildOndolHeatingGrid() {
        const group = new THREE.Group();

        const createOndolPlane = (x, z, w, d) => {
            const geo = new THREE.PlaneGeometry(w - 4.0, d - 4.0, 28, 28);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xef4444,
                wireframe: true,
                transparent: true,
                opacity: 0
            });
            const plane = new THREE.Mesh(geo, mat);
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(x, 0.1, z);
            group.add(plane);
            return plane;
        };

        this.ondolPlanes = [
            createOndolPlane(25, 65, 110, 170),
            createOndolPlane(-90, 20, 120, 100),
            createOndolPlane(-70, -90, 80, 120),
            createOndolPlane(115, 65, 70, 170),
            createOndolPlane(25, -85, 110, 130)
        ];

        this.scene.add(group);
        this.ondolMeshGroup = group;
    }

    buildACParticleStream() {
        const particleCount = 350;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = 76.0 - Math.random() * 6.0;
            positions[i + 1] = 13.5 - Math.random() * 3.0;
            positions[i + 2] = 45.0 + (Math.random() - 0.5) * 25.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x60a5fa,
            size: 1.4,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.acParticles = new THREE.Points(geometry, material);
        this.scene.add(this.acParticles);
    }

    buildHumidifierMist() {
        const mistCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(mistCount * 3);

        for (let i = 0; i < mistCount * 3; i += 3) {
            positions[i] = 58.0 + (Math.random() - 0.5) * 3.0;
            positions[i + 1] = 7.0 + Math.random() * 4.0;
            positions[i + 2] = 95.0 + (Math.random() - 0.5) * 3.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xe0f2fe,
            size: 1.0,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.mistParticles = new THREE.Points(geometry, material);
        this.scene.add(this.mistParticles);
    }

    buildStoveFlame() {
        const flameGeo = new THREE.ConeGeometry(1.4, 3.2, 8);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(25, 5.8, -140);
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
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
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
            sprite.position.set(x, 20.0, z);
            sprite.scale.set(32, 10.0, 1);
            group.add(sprite);
        };

        createLabel('거실 (Living)', 25, 65);
        createLabel('안방 (Master)', -90, 20);
        createLabel('방 B & 발코니', -70, -90);
        createLabel('방 A (Room A)', 115, 65);
        createLabel('주방 & 식당', 25, -85);
        createLabel('공용 욕실', -90, 110);
        createLabel('현관 (Door)', 115, -85);

        this.scene.add(group);
        this.roomLabelsGroup = group;
    }

    syncLights() {
        const factor = state.brightness / 100;
        Object.keys(state.lights).forEach(room => {
            const isOn = state.lights[room];
            if (this.lights[room]) {
                this.lights[room].intensity = isOn ? (3.5 * factor + 0.8) : 0;
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
            this.ambientLight.intensity = isDark ? 0.45 : 0.78;
        }
    }

    toggleRoof() {
        state.effects3D.roof = !state.effects3D.roof;
        if (this.roofGroup) this.roofGroup.visible = state.effects3D.roof;
        elements.btnToggleRoof.classList.toggle('active', state.effects3D.roof);
        showToast(`지붕(천장) [${state.effects3D.roof ? 'ON (완전 밀폐)' : 'OFF (오픈 뷰)'}]`);
    }

    // --- 1st-Person Continuous WASD Engine ---
    enterFPSMode(startPos = new THREE.Vector3(25, 7.0, 60)) {
        state.fpsMode = true;
        this.fpsPos.copy(startPos);
        this.camera.position.copy(this.fpsPos);
        this.controls.target.set(this.fpsPos.x, this.fpsPos.y, this.fpsPos.z + 15);
        this.controls.minDistance = 0.1;
        this.controls.maxDistance = 25;
        this.controls.maxPolarAngle = Math.PI / 1.85;

        elements.btnCamFps.classList.add('active');
        elements.fpsControlsOverlay.classList.add('active');
        showToast('🚶 1인칭 걷기 모드! WASD 키를 누르고 있으면 부드럽게 이동합니다.');
    }

    exitFPSMode() {
        state.fpsMode = false;
        elements.btnCamFps.classList.remove('active');
        elements.fpsControlsOverlay.classList.remove('active');
        this.controls.minDistance = 10;
        this.controls.maxDistance = 1200;
        this.controls.maxPolarAngle = Math.PI / 2.04;
    }

    updateFPSMovement(delta) {
        if (!state.fpsMode) return;

        const forwardKey = (this.keys['w'] || this.keys['arrowup'] ? 1 : 0) - (this.keys['s'] || this.keys['arrowdown'] ? 1 : 0);
        const strafeKey = (this.keys['d'] || this.keys['arrowright'] ? 1 : 0) - (this.keys['a'] || this.keys['arrowleft'] ? 1 : 0);

        if (forwardKey === 0 && strafeKey === 0) return;

        const dir = new THREE.Vector3();
        this.camera.getWorldDirection(dir);
        dir.y = 0;
        dir.normalize();

        const side = new THREE.Vector3(-dir.z, 0, dir.x);

        const moveSpeed = 45.0 * delta; // Smooth units/sec
        this.fpsPos.addScaledVector(dir, forwardKey * moveSpeed);
        this.fpsPos.addScaledVector(side, strafeKey * moveSpeed);

        // Clamping to interior boundaries
        this.fpsPos.x = Math.max(-142, Math.min(142, this.fpsPos.x));
        this.fpsPos.z = Math.max(-142, Math.min(142, this.fpsPos.z));
        this.fpsPos.y = 7.0;

        this.camera.position.copy(this.fpsPos);
        this.controls.target.copy(this.fpsPos).add(dir.multiplyScalar(15));
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
            this.animateCameraTo(new THREE.Vector3(160, 160, 160), new THREE.Vector3(0, 8, 0));
        });

        elements.btnCamTop.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamTop);
            this.animateCameraTo(new THREE.Vector3(0, 240, 0.1), new THREE.Vector3(0, 0, 0));
        });

        elements.btnCamFps.addEventListener('click', () => {
            if (state.fpsMode) {
                this.exitFPSMode();
                this.setActiveToolBtn(elements.btnCamIso);
                this.animateCameraTo(new THREE.Vector3(160, 160, 160), new THREE.Vector3(0, 8, 0));
            } else {
                this.setActiveToolBtn(elements.btnCamFps);
                this.enterFPSMode();
            }
        });

        elements.btnCamLiving.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamLiving);
            this.animateCameraTo(new THREE.Vector3(25, 75, 140), new THREE.Vector3(25, 6, 65));
        });

        elements.btnCamMaster.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamMaster);
            this.animateCameraTo(new THREE.Vector3(-90, 75, 95), new THREE.Vector3(-90, 6, 20));
        });

        elements.btnCamKitchen.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamKitchen);
            this.animateCameraTo(new THREE.Vector3(25, 75, -140), new THREE.Vector3(25, 6, -85));
        });

        elements.btnCamReset.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(160, 160, 160), new THREE.Vector3(0, 8, 0));
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
            living: { cam: new THREE.Vector3(25, 75, 140), look: new THREE.Vector3(25, 6, 65), fps: new THREE.Vector3(25, 7.0, 60) },
            master: { cam: new THREE.Vector3(-90, 75, 95), look: new THREE.Vector3(-90, 6, 20), fps: new THREE.Vector3(-90, 7.0, 20) },
            roomb: { cam: new THREE.Vector3(-70, 75, -140), look: new THREE.Vector3(-70, 6, -90), fps: new THREE.Vector3(-70, 7.0, -90) },
            rooma: { cam: new THREE.Vector3(115, 75, 140), look: new THREE.Vector3(115, 6, 65), fps: new THREE.Vector3(115, 7.0, 65) },
            kitchen: { cam: new THREE.Vector3(25, 75, -140), look: new THREE.Vector3(25, 6, -85), fps: new THREE.Vector3(25, 7.0, -70) },
            bath: { cam: new THREE.Vector3(-90, 75, 150), look: new THREE.Vector3(-90, 6, 110), fps: new THREE.Vector3(-90, 7.0, 110) },
            entrance: { cam: new THREE.Vector3(115, 75, -140), look: new THREE.Vector3(115, 6, -85), fps: new THREE.Vector3(115, 7.0, -85) }
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

    bindContinuousWASD() {
        window.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });

        // Virtual D-Pad Touch/Mouse Listeners
        const bindButtonHold = (btn, keyName) => {
            if (!btn) return;
            const start = () => { this.keys[keyName] = true; };
            const stop = () => { this.keys[keyName] = false; };
            btn.addEventListener('mousedown', start);
            btn.addEventListener('mouseup', stop);
            btn.addEventListener('mouseleave', stop);
            btn.addEventListener('touchstart', (e) => { e.preventDefault(); start(); });
            btn.addEventListener('touchend', stop);
        };

        bindButtonHold(elements.btnDpadUp, 'w');
        bindButtonHold(elements.btnDpadDown, 's');
        bindButtonHold(elements.btnDpadLeft, 'a');
        bindButtonHold(elements.btnDpadRight, 'd');
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

        const delta = this.clock.getDelta();
        const time = performance.now() * 0.001;

        // Continuous WASD Loop in FPS mode
        this.updateFPSMovement(delta);

        if (!this.isAnimatingCamera && this.controls) {
            this.controls.update();
        }

        // 1. Door Physical Swing Animation
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
            const targetScaleY = state.curtains.roomA ? 0.12 : 1.0;
            cur.mesh.scale.y += (targetScaleY - cur.mesh.scale.y) * 0.1;
            cur.mesh.position.y = 15.0 - (cur.mesh.scale.y * 6.5);
        }

        if (this.curtainMeshes.roomB) {
            const cur = this.curtainMeshes.roomB;
            const targetScaleY = state.curtains.roomB ? 0.12 : 1.0;
            cur.mesh.scale.y += (targetScaleY - cur.mesh.scale.y) * 0.1;
            cur.mesh.position.y = 15.0 - (cur.mesh.scale.y * 6.5);
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
                const windSpeed = state.aircon.wind === 'high' ? 1.0 : (state.aircon.wind === 'medium' ? 0.65 : 0.4);

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] -= windSpeed * 1.5;
                    positions[i + 1] -= windSpeed * 0.25;
                    positions[i + 2] += (Math.sin(time * 2 + i) * 0.15);

                    if (positions[i] < -25.0 || positions[i + 1] < 1.0) {
                        positions[i] = 76.0 - Math.random() * 6.0;
                        positions[i + 1] = 13.5 - Math.random() * 3.0;
                        positions[i + 2] = 45.0 + (Math.random() - 0.5) * 25.0;
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
                    positions[i + 1] += 0.12;
                    positions[i] += (Math.sin(time * 3 + i) * 0.04);
                    positions[i + 2] += (Math.cos(time * 3 + i) * 0.04);

                    if (positions[i + 1] > 16.0) {
                        positions[i] = 58.0 + (Math.random() - 0.5) * 3.0;
                        positions[i + 1] = 7.0;
                        positions[i + 2] = 95.0 + (Math.random() - 0.5) * 3.0;
                    }
                }
                this.mistParticles.geometry.attributes.position.needsUpdate = true;
            }
        }

        // 6. Stove Flame Flicker
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
