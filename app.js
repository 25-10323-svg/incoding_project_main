// AURA Colossal Smart Megamansion Digital Twin - 1,000,000x Volume Monumental Scale Engine

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

    brightnessSlider: document.getElementById('global-brightness-slider'),
    brightnessValText: document.getElementById('global-brightness-val'),
    sliderFill: document.getElementById('slider-fill'),
    btnAllLightsOff: document.getElementById('btn-all-lights-off'),
    lightSingleButtons: document.querySelectorAll('.light-toggle-single-btn'),

    btnDoorOpenPhys: document.getElementById('btn-door-open-phys'),
    btnDoorClosePhys: document.getElementById('btn-door-close-phys'),
    btnDoorUnlock: document.getElementById('btn-door-unlock'),
    btnDoorLock: document.getElementById('btn-door-lock'),

    btnAllCurtainsOpen: document.getElementById('btn-all-curtains-open'),
    btnAllCurtainsClose: document.getElementById('btn-all-curtains-close'),
    curtainSingleButtons: document.querySelectorAll('.curtain-toggle-single-btn'),
    btnToggleCurtainsFx: document.getElementById('btn-toggle-curtains-fx'),

    btnGasOpen: document.getElementById('btn-gas-open'),
    btnGasClose: document.getElementById('btn-gas-close'),
    switchAutoGas: document.getElementById('switch-auto-gas'),
    switchAutoSafe: document.getElementById('switch-auto-safe'),
    badgeAutoGas: document.getElementById('badge-auto-gas'),
    badgeAutoSafe: document.getElementById('badge-auto-safe'),

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
        showToast('대저택 전체 조명이 소등되었습니다.');
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
    showToast('대저택 현관문이 열렸습니다. (초대형 모터 스윙)');
});

elements.btnDoorClosePhys.addEventListener('click', () => {
    if (!state.door.opened) return;
    state.door.opened = false;
    updateDoorUI();
    showToast('대저택 현관문을 닫았습니다.');
});

elements.btnDoorLock.addEventListener('click', () => {
    if (state.door.locked) return;
    state.door.locked = true;
    if (state.door.opened) state.door.opened = false;
    updateDoorUI();
    showToast('생체인식 도어락이 잠겼습니다.');
});

elements.btnDoorUnlock.addEventListener('click', () => {
    if (!state.door.locked) return;
    state.door.locked = false;
    updateDoorUI();
    showToast('생체인식 도어락이 해제되었습니다.');
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
        elements.hdrCurtain.textContent = anyOpen ? '전동 커튼 열림' : '전동 커튼 모두 닫힘';
    }

    if (threeApp && threeApp.syncCurtains) threeApp.syncCurtains();
}

elements.btnAllCurtainsOpen.addEventListener('click', () => {
    Object.keys(state.curtains).forEach(room => state.curtains[room] = true);
    updateCurtainUI();
    showToast('대저택 전 구역 전동 커튼이 모두 열렸습니다.');
});

elements.btnAllCurtainsClose.addEventListener('click', () => {
    Object.keys(state.curtains).forEach(room => state.curtains[room] = false);
    updateCurtainUI();
    showToast('대저택 전 구역 전동 커튼이 모두 닫혔습니다.');
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
        showToast(`전동 커튼 일괄 [${!allOpen ? '열기' : '닫기'}]`);
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
    showToast('셰프 쿡탑 가스를 열었습니다.');
});

elements.btnGasClose.addEventListener('click', () => {
    if (state.gas.status === 'closed') return;
    state.gas.status = 'closed';
    updateGasUI();
    showToast('셰프 쿡탑 가스를 안전하게 잠갔습니다.');
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
            indoor: '전체난방 ON',
            ondol: '온돌바닥 ON',
            eco: '외출절전 ON',
            water: '스파온수 ON'
        };
        elements.badgeBoiler.textContent = modeLabels[state.boiler.mode] || 'ON';
        elements.badgeBoiler.classList.add('active');
        elements.btnToggleBoiler.textContent = '보일러 끄기';
        elements.btnToggleBoiler.classList.add('active');
        elements.boilerModesContainer.style.display = 'flex';
        elements.boilerSubStatus.textContent = `설정: ${state.boiler.targetTemp.toFixed(1)}°C / 바닥 온돌 연동`;

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
        elements.humiditySubStatus.textContent = '건조 주의 (가습 권장)';
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
    showToast(`듀얼 타워 에어컨 ${state.aircon.active ? 'ON' : 'OFF'}`);
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
    showToast(`스마트 보일러 스테이션 ${state.boiler.active ? 'ON' : 'OFF'}`);
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
            let speed = 0.08;
            if (state.aircon.wind === 'medium') speed = 0.16;
            if (state.aircon.wind === 'high') speed = 0.28;

            if (rooms.livingRoom > state.temp.target) {
                rooms.livingRoom = Math.max(state.temp.target, rooms.livingRoom - speed);
            }
            state.humidity.current = Math.max(40, state.humidity.current - 0.25);
        }

        // 2. Boiler heating
        if (state.boiler.active) {
            const bTarget = state.boiler.targetTemp;
            const bMode = state.boiler.mode;
            let heatSpeed = 0.10;
            if (bMode === 'ondol') heatSpeed = 0.18;
            if (bMode === 'eco') heatSpeed = 0.03;

            Object.keys(rooms).forEach(room => {
                if (bMode !== 'water') {
                    if (rooms[room] < bTarget) {
                        rooms[room] = Math.min(bTarget, rooms[room] + heatSpeed);
                    }
                }
            });
            state.humidity.current = Math.max(35, state.humidity.current - 0.15);
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
            if (state.humidity.current < 70) state.humidity.current += 0.5;
        } else if (state.humidity.mode === 'dehumidify') {
            if (state.humidity.current > 40) state.humidity.current -= 0.5;
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
    showToast('대저택 외출 보안 모드 실행! (전체 소등, 문잠금, 커튼닫힘, 가스차단, 보일러외출)');

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
    showToast('AURA 스마트 빌라 16개 구역 기기 모두 최상 상태로 연동 중');
}

// =========================================================================
// 9. Three.js 3D Colossal Megamansion Engine (5000x4000x240 Monumental Scale)
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

        this.keys = {};
        this.fpsPos = new THREE.Vector3(200, 60.0, 800); // Colossal living room eye level
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
        this.scene.fog = new THREE.FogExp2(isDark ? 0x090e1a : 0xebf0f7, 0.00008);

        // 2. Camera Setup (Far plane: 150,000 for 1,000,000x Colossal Scale)
        this.camera = new THREE.PerspectiveCamera(45, width / height, 1, 150000);
        this.camera.position.set(2200, 2200, 2200);

        // 3. Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.4;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.04;
        this.controls.minDistance = 50;
        this.controls.maxDistance = 25000;
        this.controls.target.set(0, 100, 0);

        // 5. Illumination for Colossal Scale
        this.ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.45 : 0.85);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff8ee, 1.1);
        this.sunLight.position.set(2500, 3500, 1800);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 100;
        this.sunLight.shadow.camera.far = 12000;
        this.sunLight.shadow.camera.left = -3500;
        this.sunLight.shadow.camera.right = 3500;
        this.sunLight.shadow.camera.top = 3500;
        this.sunLight.shadow.camera.bottom = -3500;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);

        // 6. Build the 1,000,000x Monumental Megamansion
        this.buildMaterials();
        this.buildMansionArchitecture();
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
            floorLounge: new THREE.MeshStandardMaterial({ color: 0xd8c5ab, roughness: 0.3, metalness: 0.05 }),
            floorSuites: new THREE.MeshStandardMaterial({ color: 0xcdb99c, roughness: 0.35, metalness: 0.05 }),
            floorKitchenMarble: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.1, metalness: 0.15 }),
            floorSpaTiles: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.2, metalness: 0.1 }),
            floorGardenTerrace: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.5 }),
            wallMansion: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
            wallRoof: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.1 }),
            glassCurtainWall: new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.45,
                roughness: 0.08,
                transmission: 0.9,
                thickness: 15.0
            }),
            windowRedAccent: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }),
            curtainSilk: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8, side: THREE.DoubleSide }),
            curtainMasterVelvet: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9, side: THREE.DoubleSide }),
            blindAcoustic: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4, side: THREE.DoubleSide }),
            leatherRoyalBlue: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.5 }),
            leatherCyanAccent: new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.5 }),
            marbleDark: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.15 }),
            woodWalnut: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.35 }),
            furnitureWhiteLacquer: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15 }),
            metalTitanium: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.92, roughness: 0.12 }),
            doorSecurityWood: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.35 }),
            tvScreen8K: new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.05 }),
            carpetPlush: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 }),
            lampGlowOn: new THREE.MeshBasicMaterial({ color: 0xfff0bb }),
            lampGlowOff: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 })
        };
    }

    buildMansionArchitecture() {
        const root = new THREE.Group();

        // 1,000,000x Monumental Soaring Mansion Wall Height (Y: 240.0 units)
        const wallHeight = 240.0;

        const createWall = (x, z, w, d, h = wallHeight, colorMat = this.materials.wallMansion) => {
            const wallGeo = new THREE.BoxGeometry(w, h, d);
            const wall = new THREE.Mesh(wallGeo, colorMat);
            wall.position.set(x, h / 2, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            root.add(wall);
            return wall;
        };

        const createWindow = (x, z, w, d, h = 160.0) => {
            const frameGeo = new THREE.BoxGeometry(w, 6.0, d);
            const frame = new THREE.Mesh(frameGeo, this.materials.windowRedAccent);
            frame.position.set(x, 120.0, z);
            root.add(frame);

            const glassGeo = new THREE.BoxGeometry(w, h, d);
            const glass = new THREE.Mesh(glassGeo, this.materials.glassCurtainWall);
            glass.position.set(x, 120.0, z);
            root.add(glass);
        };

        // =====================================================================
        // 1. COLOSSAL MANSION FLOORS (X: -2500 to +2500 = 5000, Z: -2000 to +2000 = 4000)
        // =====================================================================
        // 1) Grand Central Lounge & Cinema: X: -600 to +1000 (w: 1600), Z: -200 to +2000 (d: 2200)
        const livingFloor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 2200), this.materials.floorLounge);
        livingFloor.rotation.x = -Math.PI / 2;
        livingFloor.position.set(200, 0.01, 900);
        livingFloor.receiveShadow = true;
        root.add(livingFloor);

        // 2) Presidential Master Suite: X: -2500 to -600 (w: 1900), Z: -400 to +900 (d: 1300)
        const masterFloor = new THREE.Mesh(new THREE.PlaneGeometry(1900, 1300), this.materials.floorSuites);
        masterFloor.rotation.x = -Math.PI / 2;
        masterFloor.position.set(-1550, 0.01, 250);
        masterFloor.receiveShadow = true;
        root.add(masterFloor);

        // 3) Master Chef Gourmet Kitchen & Bar: X: -600 to +1000 (w: 1600), Z: -2000 to -200 (d: 1800)
        const kitchenFloor = new THREE.Mesh(new THREE.PlaneGeometry(1600, 1800), this.materials.floorKitchenMarble);
        kitchenFloor.rotation.x = -Math.PI / 2;
        kitchenFloor.position.set(200, 0.01, -1100);
        kitchenFloor.receiveShadow = true;
        root.add(kitchenFloor);

        // 4) High-Tech Cyber Gaming Studio: X: -1700 to -600 (w: 1100), Z: -2000 to -400 (d: 1600)
        const studioFloor = new THREE.Mesh(new THREE.PlaneGeometry(1100, 1600), this.materials.floorSuites);
        studioFloor.rotation.x = -Math.PI / 2;
        studioFloor.position.set(-1150, 0.01, -1200);
        studioFloor.receiveShadow = true;
        root.add(studioFloor);

        // 5) Eco Garden Terrace & Sunroom: X: -2500 to -1700 (w: 800), Z: -2000 to -400 (d: 1600)
        const balconyFloor = new THREE.Mesh(new THREE.PlaneGeometry(800, 1600), this.materials.floorGardenTerrace);
        balconyFloor.rotation.x = -Math.PI / 2;
        balconyFloor.position.set(-2100, 0.01, -1200);
        balconyFloor.receiveShadow = true;
        root.add(balconyFloor);

        // 6) Luxury Spa & Hydrotherapy Wellness Suite: X: -2500 to -600 (w: 1900), Z: +900 to +2000 (d: 1100)
        const spaFloor = new THREE.Mesh(new THREE.PlaneGeometry(1900, 1100), this.materials.floorSpaTiles);
        spaFloor.rotation.x = -Math.PI / 2;
        spaFloor.position.set(-1550, 0.01, 1450);
        spaFloor.receiveShadow = true;
        root.add(spaFloor);

        // 7) Futuristic Smart Entryway & Security Hub: X: +1000 to +2500 (w: 1500), Z: -2000 to -200 (d: 1800)
        const entranceFloor = new THREE.Mesh(new THREE.PlaneGeometry(1500, 1800), this.materials.floorKitchenMarble);
        entranceFloor.rotation.x = -Math.PI / 2;
        entranceFloor.position.set(1750, 0.01, -1100);
        entranceFloor.receiveShadow = true;
        root.add(entranceFloor);

        // 8) VIP Guest Bedroom & Library: X: +1000 to +2500 (w: 1500), Z: -200 to +2000 (d: 2200)
        const libraryFloor = new THREE.Mesh(new THREE.PlaneGeometry(1500, 2200), this.materials.floorSuites);
        libraryFloor.rotation.x = -Math.PI / 2;
        libraryFloor.position.set(1750, 0.01, 900);
        libraryFloor.receiveShadow = true;
        root.add(libraryFloor);

        // =====================================================================
        // 2. MONUMENTAL WALLS & PANORAMIC GLASS CURTAIN WALLS
        // =====================================================================
        createWall(-2500, 0, 24.0, 4000);  // Far West Wall
        createWall(-1550, 2000, 1900, 24.0); // Spa South Wall
        createWall(200, 2000, 1600, 24.0);   // Grand Lounge South Wall
        createWindow(200, 2000, 1000, 14.0, 160.0); // 거실 대형 파노라마 커튼월 (Red Marker)

        createWall(1750, 2000, 1500, 24.0);  // VIP Library South Wall
        createWall(2500, 900, 24.0, 2200);   // East Wall (Library)
        createWindow(2500, 900, 14.0, 1000, 160.0); // 라이브러리 대형 창문 (Red Marker)

        createWall(2500, -1100, 24.0, 1800); // East Wall (Foyer)
        createWall(1750, -2000, 1500, 24.0); // North Entrance Wall
        createWall(200, -2000, 1600, 24.0);  // North Kitchen Wall
        createWindow(200, -2000, 600, 14.0, 140.0); // 주방 파노라마 창문

        createWall(-1150, -2000, 1100, 24.0); // Cyber Studio North Wall
        createWall(-2500, -1200, 24.0, 1600); // Garden Balcony West Wall
        createWindow(-2500, -1200, 14.0, 1000, 160.0); // 발코니 창문

        // Interior Architectural Dividers
        createWall(-600, 0, 20.0, 4000);    // West Wing Divider
        createWall(-1550, -400, 1900, 20.0); // Studio vs Master Divider
        createWall(-1550, 900, 1900, 20.0);  // Master vs Spa Divider
        createWindow(-2500, 250, 14.0, 800, 160.0); // 마스터 스위트 통창 (Red Marker)

        createWall(-1700, -1200, 4.0, 1600, wallHeight, this.materials.glassCurtainWall); // Studio-Terrace Glass Wall
        createWall(1000, 0, 20.0, 4000);    // East Wing Divider
        createWall(200, -200, 1600, 20.0);   // Kitchen vs Lounge Divider
        createWall(1750, -200, 1500, 20.0);  // Entrance vs Library Divider

        // Grand Motorized Biometric Front Door (320-wide Colossal Gate)
        const doorFrame = new THREE.Group();
        doorFrame.position.set(1750, 0, -2000);
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(320, 200.0, 12.0), this.materials.doorSecurityWood);
        doorMesh.position.set(160, 100.0, 0);
        doorMesh.castShadow = true;
        doorFrame.add(doorMesh);

        const lockPad = new THREE.Mesh(new THREE.BoxGeometry(24.0, 60.0, 5.0), this.materials.metalTitanium);
        lockPad.position.set(280, 100.0, 8.0);
        doorFrame.add(lockPad);
        root.add(doorFrame);
        this.doorMesh = doorFrame;

        // =====================================================================
        // 3. ULTRA-LUXURY ARCHITECTURAL FURNITURE SETTING (COLOSSAL SCALE)
        // =====================================================================

        // --- 🏛️ 그랜드 라운지 & 8K 시네마 (Grand Central Living) ---
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(1200, 950), this.materials.carpetPlush);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(200, 0.02, 900);
        root.add(rug);

        // Circular Grand Sectional Pit Sofa Suite
        const sofaCenter = new THREE.Mesh(new THREE.BoxGeometry(800, 55.0, 180), this.materials.leatherRoyalBlue);
        sofaCenter.position.set(200, 27.5, 600);
        sofaCenter.castShadow = true;
        root.add(sofaCenter);

        const sofaWingL = new THREE.Mesh(new THREE.BoxGeometry(180, 55.0, 500), this.materials.leatherRoyalBlue);
        sofaWingL.position.set(-250, 27.5, 850);
        sofaWingL.castShadow = true;
        root.add(sofaWingL);

        const sofaWingR = new THREE.Mesh(new THREE.BoxGeometry(180, 55.0, 500), this.materials.leatherCyanAccent);
        sofaWingR.position.set(650, 27.5, 850);
        sofaWingR.castShadow = true;
        root.add(sofaWingR);

        // Italian Marble Dual Center Tables
        const coffeeTable1 = new THREE.Mesh(new THREE.BoxGeometry(450, 25.0, 220), this.materials.marbleDark);
        coffeeTable1.position.set(200, 12.5, 900);
        coffeeTable1.castShadow = true;
        root.add(coffeeTable1);

        // 70-meter Colossal Stadium Cinema Display & Console
        const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(900, 35.0, 80), this.materials.furnitureWhiteLacquer);
        tvConsole.position.set(200, 17.5, 1850);
        tvConsole.castShadow = true;
        root.add(tvConsole);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(700, 280.0, 10.0), this.materials.tvScreen8K);
        tvScreen.position.set(200, 180.0, 1860);
        root.add(tvScreen);

        // Dual Tower Air Conditioners
        const acUnit = new THREE.Mesh(new THREE.BoxGeometry(280, 60.0, 40.0), this.materials.furnitureWhiteLacquer);
        acUnit.position.set(980, 180.0, 600);
        root.add(acUnit);
        this.acUnitMesh = acUnit;

        // Central Humidifier Column
        const humidifierBody = new THREE.Mesh(new THREE.CylinderGeometry(40.0, 40.0, 90.0, 32), this.materials.furnitureWhiteLacquer);
        humidifierBody.position.set(650, 45.0, 1350);
        humidifierBody.castShadow = true;
        root.add(humidifierBody);
        this.humidifierMesh = humidifierBody;

        // --- 🍳 마스터 셰프 고메 키친 & 와인바 (Kitchen & Bar) ---
        // 85-meter Waterfall Marble Island
        const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(850, 60.0, 180), this.materials.marbleDark);
        kitchenIsland.position.set(200, 30.0, -1000);
        kitchenIsland.castShadow = true;
        root.add(kitchenIsland);

        // Commercial Kitchen Wall Cabinetry
        const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(1200, 60.0, 140), this.materials.furnitureWhiteLacquer);
        kitchenCounter.position.set(200, 30.0, -1880);
        kitchenCounter.castShadow = true;
        root.add(kitchenCounter);

        // Smart Boiler Energy Station on Utility Wall
        const boilerBox = new THREE.Mesh(new THREE.BoxGeometry(160, 180, 50.0), this.materials.furnitureWhiteLacquer);
        boilerBox.position.set(-480, 120.0, -1920);
        root.add(boilerBox);

        // 10-Seater Banquet Dining Table
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(650, 50.0, 220), this.materials.woodWalnut);
        diningTable.position.set(200, 25.0, -500);
        diningTable.castShadow = true;
        root.add(diningTable);

        // Double Commercial Smart Fridges
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(160, 180.0, 100), this.materials.metalTitanium);
        fridge.position.set(850, 90.0, -1880);
        root.add(fridge);

        // --- 👑 프레지덴셜 마스터 스위트 (Presidential Master Bedroom) ---
        const masterBed = new THREE.Mesh(new THREE.BoxGeometry(650, 55.0, 700), this.materials.leatherRoyalBlue);
        masterBed.position.set(-1550, 27.5, 300);
        masterBed.castShadow = true;
        root.add(masterBed);

        const headboard = new THREE.Mesh(new THREE.BoxGeometry(800, 160.0, 40.0), this.materials.woodWalnut);
        headboard.position.set(-1550, 80.0, -100);
        root.add(headboard);

        const nightstandL = new THREE.Mesh(new THREE.BoxGeometry(120, 45.0, 80), this.materials.woodWalnut);
        nightstandL.position.set(-2050, 22.5, 0);
        root.add(nightstandL);

        const nightstandR = new THREE.Mesh(new THREE.BoxGeometry(120, 45.0, 80), this.materials.woodWalnut);
        nightstandR.position.set(-1050, 22.5, 0);
        root.add(nightstandR);

        const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(1200, 180.0, 80), this.materials.furnitureWhiteLacquer);
        wardrobe.position.set(-1550, 90.0, 820);
        root.add(wardrobe);

        // --- 💻 하이테크 사이버 스튜디오 & 테라스 (Studio & Balcony) ---
        const deskB = new THREE.Mesh(new THREE.BoxGeometry(450, 50.0, 140), this.materials.marbleDark);
        deskB.position.set(-1150, 25.0, -1650);
        deskB.castShadow = true;
        root.add(deskB);

        const bedB = new THREE.Mesh(new THREE.BoxGeometry(350, 50.0, 600), this.materials.leatherRoyalBlue);
        bedB.position.set(-850, 25.0, -950);
        bedB.castShadow = true;
        root.add(bedB);

        const laundryRack = new THREE.Mesh(new THREE.BoxGeometry(220, 140.0, 80), this.materials.metalTitanium);
        laundryRack.position.set(-2100, 70.0, -1200);
        root.add(laundryRack);

        // --- 📚 VIP 라이브러리 & 게스트 스위트 (Library & VIP) ---
        const bedA = new THREE.Mesh(new THREE.BoxGeometry(350, 50.0, 600), this.materials.leatherRoyalBlue);
        bedA.position.set(1900, 25.0, 1100);
        bedA.castShadow = true;
        root.add(bedA);

        const deskA = new THREE.Mesh(new THREE.BoxGeometry(450, 50.0, 140), this.materials.woodWalnut);
        deskA.position.set(1500, 25.0, 200);
        deskA.castShadow = true;
        root.add(deskA);

        const bookshelfA = new THREE.Mesh(new THREE.BoxGeometry(700, 180.0, 80), this.materials.woodWalnut);
        bookshelfA.position.set(1750, 90.0, 1920);
        root.add(bookshelfA);

        // --- 🛁 럭셔리 스파 & 자쿠지 (Luxury Spa & Bath) ---
        const jacuzzi = new THREE.Mesh(new THREE.CylinderGeometry(200, 200, 60.0, 32), this.materials.furnitureWhiteLacquer);
        jacuzzi.position.set(-1750, 30.0, 1500);
        jacuzzi.castShadow = true;
        root.add(jacuzzi);

        const vanity = new THREE.Mesh(new THREE.BoxGeometry(450, 55.0, 120), this.materials.marbleDark);
        vanity.position.set(-950, 27.5, 1100);
        root.add(vanity);

        // --- 🚪 스마트 보안 엔트런스 포이어 (Foyer) ---
        const shoeStorage = new THREE.Mesh(new THREE.BoxGeometry(500, 180.0, 100), this.materials.furnitureWhiteLacquer);
        shoeStorage.position.set(1950, 90.0, -600);
        root.add(shoeStorage);

        this.scene.add(root);
        this.houseRoot = root;
    }

    build3DCurtains() {
        const group = new THREE.Group();

        // 1. Living Room Curtains (South Panoramic Window)
        const livingCurtainL = new THREE.Mesh(new THREE.BoxGeometry(350, 180.0, 8.0), this.materials.curtainSilk);
        livingCurtainL.position.set(-250, 110.0, 1980);
        group.add(livingCurtainL);

        const livingCurtainR = new THREE.Mesh(new THREE.BoxGeometry(350, 180.0, 8.0), this.materials.curtainSilk);
        livingCurtainR.position.set(650, 110.0, 1980);
        group.add(livingCurtainR);

        this.curtainMeshes.livingRoom = { l: livingCurtainL, r: livingCurtainR, openL: -450, closeL: -50, openR: 850, closeR: 450 };

        // 2. Master Suite Velvet Blackout Drapery
        const masterCurtainL = new THREE.Mesh(new THREE.BoxGeometry(8.0, 180.0, 280), this.materials.curtainMasterVelvet);
        masterCurtainL.position.set(-2480, 110.0, -100);
        group.add(masterCurtainL);

        const masterCurtainR = new THREE.Mesh(new THREE.BoxGeometry(8.0, 180.0, 280), this.materials.curtainMasterVelvet);
        masterCurtainR.position.set(-2480, 110.0, 600);
        group.add(masterCurtainR);

        this.curtainMeshes.masterRoom = { l: masterCurtainL, r: masterCurtainR, openL: -250, closeL: 50, openR: 750, closeR: 450 };

        // 3. VIP Library Blinds
        const roomABlind = new THREE.Mesh(new THREE.BoxGeometry(8.0, 180.0, 950), this.materials.blindAcoustic);
        roomABlind.position.set(2480, 110.0, 900);
        group.add(roomABlind);
        this.curtainMeshes.roomA = { mesh: roomABlind };

        // 4. Cyber Studio Blinds
        const roomBBlind = new THREE.Mesh(new THREE.BoxGeometry(8.0, 180.0, 950), this.materials.blindAcoustic);
        roomBBlind.position.set(-2480, 110.0, -1200);
        group.add(roomBBlind);
        this.curtainMeshes.roomB = { mesh: roomBBlind };

        this.scene.add(group);
        this.curtainsGroup = group;
    }

    build3DLamps() {
        const group = new THREE.Group();

        const createGrandLamp = (roomKey, x, y, z, type = 'chandelier') => {
            const stem = new THREE.Mesh(new THREE.CylinderGeometry(6.0, 6.0, 50.0, 16), this.materials.metalTitanium);
            stem.position.set(x, y + 25.0, z);
            group.add(stem);

            let fixture, bulb;
            if (type === 'chandelier') {
                fixture = new THREE.Mesh(new THREE.TorusGeometry(90.0, 10.0, 16, 32), this.materials.metalTitanium);
                fixture.rotation.x = Math.PI / 2;
                fixture.position.set(x, y, z);
                group.add(fixture);

                bulb = new THREE.Mesh(new THREE.SphereGeometry(40.0, 16, 16), this.materials.lampGlowOff);
                bulb.position.set(x, y - 5.0, z);
                group.add(bulb);
            } else {
                fixture = new THREE.Mesh(new THREE.ConeGeometry(60.0, 45.0, 24), this.materials.furnitureWhiteLacquer);
                fixture.position.set(x, y + 5.0, z);
                group.add(fixture);

                bulb = new THREE.Mesh(new THREE.SphereGeometry(30.0, 16, 16), this.materials.lampGlowOff);
                bulb.position.set(x, y - 8.0, z);
                group.add(bulb);
            }

            const pLight = new THREE.PointLight(0xffeedd, 0, 1800, 1.4);
            pLight.position.set(x, y - 15.0, z);
            group.add(pLight);

            this.lights[roomKey] = pLight;
            this.lampBulbs[roomKey] = bulb;
        };

        createGrandLamp('livingRoom', 200, 190.0, 900, 'chandelier');
        createGrandLamp('masterRoom', -1550, 190.0, 250, 'chandelier');
        createGrandLamp('kitchen', 200, 190.0, -1000, 'pendant');
        createGrandLamp('roomA', 1750, 190.0, 900, 'pendant');
        createGrandLamp('roomB', -1150, 190.0, -1200, 'pendant');
        createGrandLamp('bathroom', -1550, 190.0, 1450, 'pendant');

        this.scene.add(group);
        this.lampsGroup = group;
    }

    buildRoofSlab() {
        const roofGroup = new THREE.Group();

        const roofMain = new THREE.Mesh(new THREE.BoxGeometry(5040, 25.0, 4040), this.materials.wallRoof);
        roofMain.position.set(0, 252.0, 0);
        roofGroup.add(roofMain);

        const skylight = new THREE.Mesh(new THREE.PlaneGeometry(900, 650), this.materials.glassCurtainWall);
        skylight.rotation.x = -Math.PI / 2;
        skylight.position.set(200, 266.0, 900);
        roofGroup.add(skylight);

        roofGroup.visible = false;
        this.scene.add(roofGroup);
        this.roofGroup = roofGroup;
    }

    buildOndolHeatingGrid() {
        const group = new THREE.Group();

        const createOndolPlane = (x, z, w, d) => {
            const geo = new THREE.PlaneGeometry(w - 60.0, d - 60.0, 32, 32);
            const mat = new THREE.MeshBasicMaterial({
                color: 0xef4444,
                wireframe: true,
                transparent: true,
                opacity: 0
            });
            const plane = new THREE.Mesh(geo, mat);
            plane.rotation.x = -Math.PI / 2;
            plane.position.set(x, 1.0, z);
            group.add(plane);
            return plane;
        };

        this.ondolPlanes = [
            createOndolPlane(200, 900, 1600, 2200),   // 그랜드 라운지
            createOndolPlane(-1550, 250, 1900, 1300), // 마스터 스위트
            createOndolPlane(-1150, -1200, 1100, 1600),// 사이버 스튜디오
            createOndolPlane(1750, 900, 1500, 2200),  // VIP 라이브러리
            createOndolPlane(200, -1100, 1600, 1800), // 셰프 키친
            createOndolPlane(-1550, 1450, 1900, 1100) // 럭셔리 스파
        ];

        this.scene.add(group);
        this.ondolMeshGroup = group;
    }

    buildACParticleStream() {
        const particleCount = 600;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = 950.0 - Math.random() * 80.0;
            positions[i + 1] = 175.0 - Math.random() * 40.0;
            positions[i + 2] = 600.0 + (Math.random() - 0.5) * 350.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x60a5fa,
            size: 18.0,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.acParticles = new THREE.Points(geometry, material);
        this.scene.add(this.acParticles);
    }

    buildHumidifierMist() {
        const mistCount = 350;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(mistCount * 3);

        for (let i = 0; i < mistCount * 3; i += 3) {
            positions[i] = 650.0 + (Math.random() - 0.5) * 40.0;
            positions[i + 1] = 90.0 + Math.random() * 50.0;
            positions[i + 2] = 1350.0 + (Math.random() - 0.5) * 40.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xe0f2fe,
            size: 12.0,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.mistParticles = new THREE.Points(geometry, material);
        this.scene.add(this.mistParticles);
    }

    buildStoveFlame() {
        const flameGeo = new THREE.ConeGeometry(20.0, 45.0, 8);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(200, 72.0, -1880);
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
            sprite.position.set(x, 260.0, z);
            sprite.scale.set(400, 125.0, 1);
            group.add(sprite);
        };

        createLabel('그랜드 라운지 & 시네마', 200, 900);
        createLabel('프레지덴셜 마스터 스위트', -1550, 250);
        createLabel('셰프 고메 키친 & 바', 200, -1100);
        createLabel('사이버 스튜디오', -1150, -1200);
        createLabel('에코 가든 테라스', -2100, -1200);
        createLabel('럭셔리 스파 자쿠지', -1550, 1450);
        createLabel('VIP 라이브러리', 1750, 900);
        createLabel('스마트 보안 포이어', 1750, -1100);

        this.scene.add(group);
        this.roomLabelsGroup = group;
    }

    syncLights() {
        const factor = state.brightness / 100;
        Object.keys(state.lights).forEach(room => {
            const isOn = state.lights[room];
            if (this.lights[room]) {
                this.lights[room].intensity = isOn ? (4.2 * factor + 1.0) : 0;
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
            this.ambientLight.intensity = isDark ? 0.45 : 0.85;
        }
    }

    toggleRoof() {
        state.effects3D.roof = !state.effects3D.roof;
        if (this.roofGroup) this.roofGroup.visible = state.effects3D.roof;
        elements.btnToggleRoof.classList.toggle('active', state.effects3D.roof);
        showToast(`대저택 지붕 [${state.effects3D.roof ? 'ON (완전 밀폐)' : 'OFF (오픈 조감도)'}]`);
    }

    // --- 1st-Person Continuous WASD Engine (Monumental Speed) ---
    enterFPSMode(startPos = new THREE.Vector3(200, 60.0, 800)) {
        state.fpsMode = true;
        this.fpsPos.copy(startPos);
        this.camera.position.copy(this.fpsPos);
        this.controls.target.set(this.fpsPos.x, this.fpsPos.y, this.fpsPos.z + 200);
        this.controls.minDistance = 1.0;
        this.controls.maxDistance = 300;
        this.controls.maxPolarAngle = Math.PI / 1.85;

        elements.btnCamFps.classList.add('active');
        elements.fpsControlsOverlay.classList.add('active');
        showToast('🚶 대저택 1인칭 걷기 모드! WASD 키를 누르고 있으면 부드럽게 이동합니다.');
    }

    exitFPSMode() {
        state.fpsMode = false;
        elements.btnCamFps.classList.remove('active');
        elements.fpsControlsOverlay.classList.remove('active');
        this.controls.minDistance = 50;
        this.controls.maxDistance = 25000;
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

        const moveSpeed = 600.0 * delta; // Smooth 600 units/sec for colossal scale
        this.fpsPos.addScaledVector(dir, forwardKey * moveSpeed);
        this.fpsPos.addScaledVector(side, strafeKey * moveSpeed);

        // Clamping to colossal mansion boundaries
        this.fpsPos.x = Math.max(-2400, Math.min(2400, this.fpsPos.x));
        this.fpsPos.z = Math.max(-1900, Math.min(1900, this.fpsPos.z));
        this.fpsPos.y = 60.0;

        this.camera.position.copy(this.fpsPos);
        this.controls.target.copy(this.fpsPos).add(dir.multiplyScalar(200));
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
            this.animateCameraTo(new THREE.Vector3(2200, 2200, 2200), new THREE.Vector3(0, 100, 0));
        });

        elements.btnCamTop.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamTop);
            this.animateCameraTo(new THREE.Vector3(0, 3400, 1.0), new THREE.Vector3(0, 0, 0));
        });

        elements.btnCamFps.addEventListener('click', () => {
            if (state.fpsMode) {
                this.exitFPSMode();
                this.setActiveToolBtn(elements.btnCamIso);
                this.animateCameraTo(new THREE.Vector3(2200, 2200, 2200), new THREE.Vector3(0, 100, 0));
            } else {
                this.setActiveToolBtn(elements.btnCamFps);
                this.enterFPSMode();
            }
        });

        elements.btnCamLiving.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamLiving);
            this.animateCameraTo(new THREE.Vector3(200, 1000, 1900), new THREE.Vector3(200, 80, 900));
        });

        elements.btnCamMaster.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamMaster);
            this.animateCameraTo(new THREE.Vector3(-1550, 1000, 1300), new THREE.Vector3(-1550, 80, 250));
        });

        elements.btnCamKitchen.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamKitchen);
            this.animateCameraTo(new THREE.Vector3(200, 1000, -1900), new THREE.Vector3(200, 80, -1100));
        });

        elements.btnCamReset.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(2200, 2200, 2200), new THREE.Vector3(0, 100, 0));
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
            living: { cam: new THREE.Vector3(200, 1000, 1900), look: new THREE.Vector3(200, 80, 900), fps: new THREE.Vector3(200, 60.0, 800) },
            master: { cam: new THREE.Vector3(-1550, 1000, 1300), look: new THREE.Vector3(-1550, 80, 250), fps: new THREE.Vector3(-1550, 60.0, 250) },
            kitchen: { cam: new THREE.Vector3(200, 1000, -1900), look: new THREE.Vector3(200, 80, -1100), fps: new THREE.Vector3(200, 60.0, -900) },
            studio: { cam: new THREE.Vector3(-1150, 1000, -1900), look: new THREE.Vector3(-1150, 80, -1200), fps: new THREE.Vector3(-1150, 60.0, -1200) },
            library: { cam: new THREE.Vector3(1750, 1000, 1900), look: new THREE.Vector3(1750, 80, 900), fps: new THREE.Vector3(1750, 60.0, 900) },
            spa: { cam: new THREE.Vector3(-1550, 1000, 2000), look: new THREE.Vector3(-1550, 80, 1450), fps: new THREE.Vector3(-1550, 60.0, 1450) },
            balcony: { cam: new THREE.Vector3(-2100, 1000, -1900), look: new THREE.Vector3(-2100, 80, -1200), fps: new THREE.Vector3(-2100, 60.0, -1200) },
            entrance: { cam: new THREE.Vector3(1750, 1000, -1900), look: new THREE.Vector3(1750, 80, -1100), fps: new THREE.Vector3(1750, 60.0, -1100) }
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
            cur.mesh.position.y = 200.0 - (cur.mesh.scale.y * 90.0);
        }

        if (this.curtainMeshes.roomB) {
            const cur = this.curtainMeshes.roomB;
            const targetScaleY = state.curtains.roomB ? 0.12 : 1.0;
            cur.mesh.scale.y += (targetScaleY - cur.mesh.scale.y) * 0.1;
            cur.mesh.position.y = 200.0 - (cur.mesh.scale.y * 90.0);
        }

        // 3. Ondol Heat Glow Pulse
        if (this.ondolPlanes && this.ondolPlanes.length > 0) {
            const isBoilerOn = state.boiler.active;
            const targetOpacity = isBoilerOn ? (0.48 + 0.3 * Math.sin(time * 3.5)) : 0;
            this.ondolPlanes.forEach(plane => {
                plane.material.opacity += (targetOpacity - plane.material.opacity) * 0.1;
            });
        }

        // 4. AC Particle Flow
        if (this.acParticles) {
            const isAcOn = state.aircon.active;
            const targetOpacity = isAcOn ? 0.88 : 0;
            this.acParticles.material.opacity += (targetOpacity - this.acParticles.material.opacity) * 0.1;

            if (isAcOn || this.acParticles.material.opacity > 0.02) {
                const positions = this.acParticles.geometry.attributes.position.array;
                const windSpeed = state.aircon.wind === 'high' ? 12.0 : (state.aircon.wind === 'medium' ? 7.5 : 4.5);

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] -= windSpeed * 1.5;
                    positions[i + 1] -= windSpeed * 0.25;
                    positions[i + 2] += (Math.sin(time * 2 + i) * 2.0);

                    if (positions[i] < -350.0 || positions[i + 1] < 10.0) {
                        positions[i] = 950.0 - Math.random() * 80.0;
                        positions[i + 1] = 175.0 - Math.random() * 40.0;
                        positions[i + 2] = 600.0 + (Math.random() - 0.5) * 350.0;
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
                    positions[i + 1] += 1.4;
                    positions[i] += (Math.sin(time * 3 + i) * 0.5);
                    positions[i + 2] += (Math.cos(time * 3 + i) * 0.5);

                    if (positions[i + 1] > 220.0) {
                        positions[i] = 650.0 + (Math.random() - 0.5) * 40.0;
                        positions[i + 1] = 90.0;
                        positions[i + 2] = 1350.0 + (Math.random() - 0.5) * 40.0;
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
