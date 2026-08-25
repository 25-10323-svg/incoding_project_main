// AURA 3D Smart Home Digital Twin - High-Scale (50x Volume) Architectural Engine & Smart Device Systems

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
        status: 'locked' // 'locked' | 'unlocked'
    },
    gas: {
        status: 'closed', // 'open' | 'closed'
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
        humidifierMist: true,
        labels: true
    }
};

let thermodynamicsInterval = null;

// =========================================================================
// 2. DOM Elements Cache
// =========================================================================
const elements = {
    screensWrapper: document.getElementById('screens-wrapper'),
    themeToggleBtn: document.getElementById('theme-toggle'),
    systemLogOutput: document.getElementById('system-log-output'),
    toastContainer: document.getElementById('toast-container'),
    livePhoneTime: document.getElementById('live-phone-time'),
    btnAwayModeHeader: document.getElementById('btn-away-mode-header'),
    btnAwayModeHome: document.getElementById('btn-away-mode-home'),

    hdrTemp: document.getElementById('hdr-temp'),
    hdrHumidity: document.getElementById('hdr-humidity'),
    hdrBoiler: document.getElementById('hdr-boiler'),
    hdrDoor: document.getElementById('hdr-door'),

    hudTempVal: document.getElementById('hud-temp-val'),
    hudHumidityVal: document.getElementById('hud-humidity-val'),
    hudBoilerVal: document.getElementById('hud-boiler-val'),

    brightnessSlider: document.getElementById('global-brightness-slider'),
    brightnessValText: document.getElementById('global-brightness-val'),
    sliderFill: document.getElementById('slider-fill'),
    btnAllLightsOff: document.getElementById('btn-all-lights-off'),
    lightSingleButtons: document.querySelectorAll('.light-toggle-single-btn'),

    btnDoorUnlock: document.getElementById('btn-door-unlock'),
    btnDoorLock: document.getElementById('btn-door-lock'),

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
    btnCamLiving: document.getElementById('btn-cam-living'),
    btnCamMaster: document.getElementById('btn-cam-master'),
    btnCamKitchen: document.getElementById('btn-cam-kitchen'),
    btnCamReset: document.getElementById('btn-cam-reset'),
    btnToggleOndolFx: document.getElementById('btn-toggle-ondol-fx'),
    btnToggleAcFx: document.getElementById('btn-toggle-ac-fx'),
    btnToggleLabelsFx: document.getElementById('btn-toggle-labels-fx'),

    roomFocusButtons: document.querySelectorAll('[data-room-focus]')
};

// =========================================================================
// 3. Navigation Engine
// =========================================================================
function navigateTo(screenIndex) {
    state.currentScreen = screenIndex;
    const translatePercentage = -(screenIndex - 1) * 20;
    elements.screensWrapper.style.transform = `translateX(${translatePercentage}%)`;

    const screenNames = {
        1: '홈 대시보드',
        2: '조명 및 밝기',
        3: '현관 도어락',
        4: '가스 밸브 제어',
        5: '온도 · 습도 · 보일러'
    };
    addLog(`컨트롤러 화면 이동: ${screenNames[screenIndex]}`, 'action');
}

// =========================================================================
// 4. Utility: Logging, Toast & Clock
// =========================================================================
function addLog(message, type = 'system') {
    if (!elements.systemLogOutput) return;
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const logLine = document.createElement('div');
    logLine.className = `log-line ${type}`;
    logLine.innerHTML = `[${time}] ${message}`;
    elements.systemLogOutput.appendChild(logLine);
    elements.systemLogOutput.scrollTop = elements.systemLogOutput.scrollHeight;
}

function showToast(message, type = 'success') {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '⚠'} ${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 2800);
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
    addLog(`테마 모드가 [${newTheme === 'dark' ? '다크' : '라이트'}] 모드로 전환되었습니다.`, 'action');
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
    addLog(`전체 조명 밝기 ${state.brightness}%로 변경.`, 'action');
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
        addLog(`${krNames[room]} 조명 [${state.lights[room] ? 'ON' : 'OFF'}].`, 'action');
        updateLightingUI();
    });
});

// --- 6.2 Door Lock UI ---
function updateDoorUI() {
    const isUnlocked = (state.door.status === 'unlocked');
    if (isUnlocked) {
        elements.btnDoorUnlock.classList.add('active');
        elements.btnDoorLock.classList.remove('active');
        if (elements.hdrDoor) elements.hdrDoor.textContent = '현관문 열림';
    } else {
        elements.btnDoorUnlock.classList.remove('active');
        elements.btnDoorLock.classList.add('active');
        if (elements.hdrDoor) elements.hdrDoor.textContent = '현관문 잠김';
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
    showToast('현관문이 잠겼습니다.');
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
    if (state.gas.status === 'open') {
        showToast('가스 밸브가 이미 열려 있습니다.', 'error');
        return;
    }
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
    state.gas.status = 'closed';
    updateGasUI();
    showToast('가스 밸브를 안전하게 잠갔습니다.');
    addLog('가스 밸브 차단 명령 실행.', 'action');
});

elements.switchAutoGas.addEventListener('change', (e) => {
    state.gas.autoGasLock = e.target.checked;
    updateGasUI();
    addLog(`오토 가스 락 옵션 ${state.gas.autoGasLock ? '활성화' : '비활성화'}.`, 'action');
});

elements.switchAutoSafe.addEventListener('change', (e) => {
    state.gas.autoSafeCut = e.target.checked;
    updateGasUI();
    addLog(`과열 자동 차단 옵션 ${state.gas.autoSafeCut ? '활성화' : '비활성화'}.`, 'action');
});

// --- 6.4 Climate (Temp, Boiler, Humidity, Aircon) UI ---
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
    if (elements.hudTempVal) elements.hudTempVal.textContent = tempFormatted;

    // Aircon UI
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
        if (elements.hudBoilerVal) elements.hudBoilerVal.textContent = state.boiler.mode === 'ondol' ? '온돌 ON' : '난방 ON';
    } else {
        elements.badgeBoiler.textContent = 'OFF';
        elements.badgeBoiler.classList.remove('active');
        elements.btnToggleBoiler.textContent = '보일러 켜기';
        elements.btnToggleBoiler.classList.remove('active');
        elements.boilerModesContainer.style.display = 'none';
        elements.boilerSubStatus.textContent = '바닥 온돌 연동 대기';

        if (elements.hdrBoiler) elements.hdrBoiler.textContent = '보일러 대기';
        if (elements.hudBoilerVal) elements.hudBoilerVal.textContent = 'OFF';
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
    if (elements.hudHumidityVal) elements.hudHumidityVal.textContent = `${humRounded}%`;

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

// Temp Adjustments
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

// Aircon Actions
elements.btnToggleAircon.addEventListener('click', () => {
    state.aircon.active = !state.aircon.active;
    updateTempUI();
    addLog(`거실 에어컨 [${state.aircon.active ? 'ON' : 'OFF'}].`, 'action');
    showToast(`거실 에어컨 ${state.aircon.active ? 'ON' : 'OFF'}`);
});

[elements.windLowBtn, elements.windMediumBtn, elements.windHighBtn].forEach(btn => {
    btn.addEventListener('click', () => {
        state.aircon.wind = btn.dataset.wind;
        updateTempUI();
        const krWind = { low: '약풍', medium: '중풍', high: '강풍' };
        addLog(`에어컨 풍속 [${krWind[state.aircon.wind]}].`, 'action');
    });
});

// Boiler Actions
elements.btnToggleBoiler.addEventListener('click', () => {
    state.boiler.active = !state.boiler.active;
    updateTempUI();
    addLog(`스마트 보일러 [${state.boiler.active ? 'ON (온돌 연동)' : 'OFF'}].`, 'action');
    showToast(`스마트 보일러 ${state.boiler.active ? 'ON' : 'OFF'}`);
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
        addLog(`보일러 모드 [${krModes[state.boiler.mode]}].`, 'action');
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

// Humidity Actions
elements.humModeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
        state.humidity.mode = btn.dataset.humMode;
        updateHumidityUI();
        const krHum = {
            auto: '자동 케어',
            humidify: '가습기',
            dehumidify: '제습기',
            off: 'OFF'
        };
        addLog(`습도 케어 [${krHum[state.humidity.mode]}].`, 'action');
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
function executeLeaveHome(source = 'home') {
    addLog(`외출 자동화 시나리오 기동 (출처: ${source === 'header' ? '상단 네비' : '리모컨'}).`, 'action');
    showToast('외출 모드 실행! (소등, 잠금, 가스차단, 에어컨OFF, 보일러외출)');

    Object.keys(state.lights).forEach(room => {
        state.lights[room] = false;
    });
    updateLightingUI();

    if (state.door.status === 'unlocked') {
        state.door.status = 'locked';
        updateDoorUI();
    }

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

if (elements.btnAwayModeHeader) {
    elements.btnAwayModeHeader.addEventListener('click', () => executeLeaveHome('header'));
}
if (elements.btnAwayModeHome) {
    elements.btnAwayModeHome.addEventListener('click', () => executeLeaveHome('home'));
}

// =========================================================================
// 9. Network Device Simulation Management
// =========================================================================
const networkState = { light: true, lock: true, gas: true, temp: true, boiler: true, humidity: true };
const deviceCounts = { light: 6, lock: 1, gas: 2, temp: 2, boiler: 1, humidity: 1 };

function getTotalConnected() {
    return Object.keys(networkState).reduce((sum, key) => sum + (networkState[key] ? deviceCounts[key] : 0), 0);
}

function getTotalDevices() {
    return Object.values(deviceCounts).reduce((a, b) => a + b, 0);
}

function toggleNetworkDevice(deviceKey) {
    networkState[deviceKey] = !networkState[deviceKey];
    const isConnected = networkState[deviceKey];

    const btn = document.getElementById(`net-toggle-${deviceKey}`);
    if (btn) {
        btn.classList.toggle('active', isConnected);
    }

    const labelMap = { light: '💡 조명', lock: '🔒 도어락', gas: '🔥 가스', temp: '❄️ 에어컨', boiler: '♨️ 보일러', humidity: '💧 습도' };
    const label = labelMap[deviceKey] || deviceKey;
    const msg = isConnected ? `${label} 통신 복구됨.` : `${label} 통신 끊김 (OFFLINE).`;
    showToast(msg, isConnected ? 'success' : 'error');
    addLog(msg, isConnected ? 'system' : 'warning');
}

function showConnectedDevicesCount() {
    const connected = getTotalConnected();
    const total = getTotalDevices();
    const msg = `스마트 기기 연결: ${connected}개 / ${total}개 정상 작동 중`;
    showToast(msg);
    addLog(msg, 'system');
}

document.addEventListener('DOMContentLoaded', () => {
    const netBtns = document.querySelectorAll('.mini-net-btn');
    netBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const deviceKey = btn.getAttribute('data-device');
            if (deviceKey) toggleNetworkDevice(deviceKey);
        });
    });
});

// =========================================================================
// 10. Three.js 3D High-Scale Architectural Engine (50x Scale-Up & Rich Furniture)
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
        this.mistParticles = null;
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
        this.scene.background = new THREE.Color(isDark ? 0x0f172a : 0xebf0f7);
        this.scene.fog = new THREE.FogExp2(isDark ? 0x0f172a : 0xebf0f7, 0.0035);

        // 2. Camera Setup (Expansive 50x Scale Camera View)
        this.camera = new THREE.PerspectiveCamera(42, width / height, 1, 2000);
        this.camera.position.set(85, 95, 85);

        // 3. WebGL Renderer
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = 1.2;
        this.container.appendChild(this.renderer.domElement);

        // 4. Orbit Controls
        this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.05;
        this.controls.maxPolarAngle = Math.PI / 2.05;
        this.controls.minDistance = 25;
        this.controls.maxDistance = 350;
        this.controls.target.set(0, 4, 0);

        // 5. Illumination
        this.ambientLight = new THREE.AmbientLight(0xffffff, isDark ? 0.45 : 0.75);
        this.scene.add(this.ambientLight);

        this.sunLight = new THREE.DirectionalLight(0xfff8ee, 0.9);
        this.sunLight.position.set(80, 140, 60);
        this.sunLight.castShadow = true;
        this.sunLight.shadow.mapSize.width = 2048;
        this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 10;
        this.sunLight.shadow.camera.far = 300;
        this.sunLight.shadow.camera.left = -70;
        this.sunLight.shadow.camera.right = 70;
        this.sunLight.shadow.camera.top = 70;
        this.sunLight.shadow.camera.bottom = -70;
        this.sunLight.shadow.bias = -0.0005;
        this.scene.add(this.sunLight);

        // 6. Build the 50x Scale Architectural Model & Detailed Furniture
        this.buildMaterials();
        this.buildHouseModel();
        this.buildOndolHeatingGrid();
        this.buildACParticleStream();
        this.buildHumidifierMist();
        this.buildStoveFlame();
        this.buildRoomLabels();

        // 7. Bind Resize, Toolbar & Room HUD
        window.addEventListener('resize', () => this.onResize());
        this.bindToolbar();
        this.bindRoomHUD();

        // 8. Start Loop
        this.animate = this.animate.bind(this);
        requestAnimationFrame(this.animate);
    }

    buildMaterials() {
        this.materials = {
            floorWoodLiving: new THREE.MeshStandardMaterial({ color: 0xd6c4a8, roughness: 0.35, metalness: 0.05 }),
            floorWoodRooms: new THREE.MeshStandardMaterial({ color: 0xcdb89a, roughness: 0.4, metalness: 0.05 }),
            floorTileKitchen: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.1 }),
            floorTileBath: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.1 }),
            floorBalcony: new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.6 }),
            wallCutaway: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.4 }),
            wallDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3 }),
            glassWindow: new THREE.MeshPhysicalMaterial({
                color: 0x93c5fd,
                transparent: true,
                opacity: 0.45,
                roughness: 0.1,
                transmission: 0.85,
                thickness: 1.0
            }),
            windowRedMarker: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }),
            leatherSofa: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 }),
            woodDark: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.4 }),
            woodLight: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.5 }),
            furnitureWhite: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25 }),
            metalChrome: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.9, roughness: 0.15 }),
            doorWood: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 }),
            tvScreen: new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.1 }),
            carpetLiving: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.9 })
        };
    }

    buildHouseModel() {
        const root = new THREE.Group();

        // Helper: Wall
        const createWall = (x, z, w, d, h = 8.5, colorMat = this.materials.wallCutaway) => {
            const wallGeo = new THREE.BoxGeometry(w, h, d);
            const wall = new THREE.Mesh(wallGeo, colorMat);
            wall.position.set(x, h / 2, z);
            wall.castShadow = true;
            wall.receiveShadow = true;
            root.add(wall);
            return wall;
        };

        // Helper: Window with red marker
        const createWindow = (x, z, w, d, h = 5.5) => {
            const frameGeo = new THREE.BoxGeometry(w, 0.4, d);
            const frame = new THREE.Mesh(frameGeo, this.materials.windowRedMarker);
            frame.position.set(x, 4.5, z);
            root.add(frame);

            const glassGeo = new THREE.BoxGeometry(w, h, d);
            const glass = new THREE.Mesh(glassGeo, this.materials.glassWindow);
            glass.position.set(x, 4.5, z);
            root.add(glass);
        };

        // =====================================================================
        // 1. FLOORS (50x Expansive Volume matching User Layout)
        // =====================================================================
        // Living Room (거실): X: -15 to +25, Z: -8 to +45 (Size 40 x 53)
        const livingFloor = new THREE.Mesh(new THREE.PlaneGeometry(40, 53), this.materials.floorWoodLiving);
        livingFloor.rotation.x = -Math.PI / 2;
        livingFloor.position.set(5, 0.01, 18.5);
        livingFloor.receiveShadow = true;
        root.add(livingFloor);

        // Master Room (안방): X: -50 to -15, Z: -12 to +22 (Size 35 x 34)
        const masterFloor = new THREE.Mesh(new THREE.PlaneGeometry(35, 34), this.materials.floorWoodRooms);
        masterFloor.rotation.x = -Math.PI / 2;
        masterFloor.position.set(-32.5, 0.01, 5);
        masterFloor.receiveShadow = true;
        root.add(masterFloor);

        // Room B (방 B): X: -40 to -15, Z: -45 to -12 (Size 25 x 33)
        const roomBFloor = new THREE.Mesh(new THREE.PlaneGeometry(25, 33), this.materials.floorWoodRooms);
        roomBFloor.rotation.x = -Math.PI / 2;
        roomBFloor.position.set(-27.5, 0.01, -28.5);
        roomBFloor.receiveShadow = true;
        root.add(roomBFloor);

        // Balcony (발코니): X: -50 to -40, Z: -45 to -12 (Size 10 x 33)
        const balconyFloor = new THREE.Mesh(new THREE.PlaneGeometry(10, 33), this.materials.floorBalcony);
        balconyFloor.rotation.x = -Math.PI / 2;
        balconyFloor.position.set(-45, 0.01, -28.5);
        balconyFloor.receiveShadow = true;
        root.add(balconyFloor);

        // Bathroom (화장실): X: -50 to -15, Z: +22 to +45 (Size 35 x 23)
        const bathFloor = new THREE.Mesh(new THREE.PlaneGeometry(35, 23), this.materials.floorTileBath);
        bathFloor.rotation.x = -Math.PI / 2;
        bathFloor.position.set(-32.5, 0.01, 33.5);
        bathFloor.receiveShadow = true;
        root.add(bathFloor);

        // Kitchen & Dining (주방): X: -15 to +22, Z: -45 to -8 (Size 37 x 37)
        const kitchenFloor = new THREE.Mesh(new THREE.PlaneGeometry(37, 37), this.materials.floorTileKitchen);
        kitchenFloor.rotation.x = -Math.PI / 2;
        kitchenFloor.position.set(3.5, 0.01, -26.5);
        kitchenFloor.receiveShadow = true;
        root.add(kitchenFloor);

        // Entrance (현관): X: +22 to +50, Z: -45 to -10 (Size 28 x 35)
        const entranceFloor = new THREE.Mesh(new THREE.PlaneGeometry(28, 35), this.materials.floorTileKitchen);
        entranceFloor.rotation.x = -Math.PI / 2;
        entranceFloor.position.set(36, 0.01, -27.5);
        entranceFloor.receiveShadow = true;
        root.add(entranceFloor);

        // Room A (방 A): X: +22 to +50, Z: -10 to +45 (Size 28 x 55)
        const roomAFloor = new THREE.Mesh(new THREE.PlaneGeometry(28, 55), this.materials.floorWoodRooms);
        roomAFloor.rotation.x = -Math.PI / 2;
        roomAFloor.position.set(36, 0.01, 17.5);
        roomAFloor.receiveShadow = true;
        root.add(roomAFloor);

        // =====================================================================
        // 2. WALLS & WINDOWS
        // =====================================================================
        // Exterior Boundary
        createWall(-50, 0, 1.2, 90); // Left Wall
        createWall(-32.5, 45, 35, 1.2); // Bathroom Bottom
        createWall(5, 45, 40, 1.2); // Living Room Bottom Wall
        createWindow(5, 45, 22, 0.8, 6.0); // 거실 대형 창문 (Red Marker)

        createWall(36, 45, 28, 1.2); // Room A Bottom Wall
        createWall(50, 17.5, 1.2, 55); // Room A Right Wall
        createWindow(50, 17.5, 0.8, 16, 5.5); // 방 A 창문 (Red Marker)

        createWall(50, -27.5, 1.2, 35); // Entrance Right Wall
        createWall(36, -45, 28, 1.2); // Entrance Top Wall
        createWall(3.5, -45, 37, 1.2); // Kitchen Top Wall
        createWall(-27.5, -45, 25, 1.2); // Room B Top Wall
        createWall(-50, -28.5, 1.2, 33); // Balcony Outer Wall
        createWindow(-50, -28.5, 0.8, 20, 5.5); // 발코니 창문

        // Interior Dividers
        createWall(-15, 0, 1.0, 90); // Master/RoomB/Bath vs Living/Kitchen Divider Wall
        createWall(-32.5, -12, 35, 1.0); // Room B vs Master Room Divider
        createWall(-32.5, 22, 35, 1.0); // Master Room vs Bathroom Divider
        createWindow(-50, 5, 0.8, 16, 5.5); // 안방 외벽 창문 (Red Marker)

        createWall(-40, -28.5, 0.4, 33, 8.5, this.materials.glassWindow); // Room B to Balcony Glass Divider
        createWall(22, 0, 1.0, 90); // Living/Kitchen vs Entrance/RoomA Divider
        createWall(3.5, -8, 37, 1.0); // Kitchen vs Living Divider
        createWall(36, -10, 28, 1.0); // Entrance vs Room A Divider

        // Entrance Smart Door
        const doorFrame = new THREE.Group();
        doorFrame.position.set(36, 0, -45);
        const doorMesh = new THREE.Mesh(new THREE.BoxGeometry(8, 8, 0.5), this.materials.doorWood);
        doorMesh.position.set(4, 4, 0);
        doorMesh.castShadow = true;
        doorFrame.add(doorMesh);

        // Smart Digital Door Lock Touchpad on door
        const lockPad = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.2), this.materials.metalChrome);
        lockPad.position.set(7, 4, 0.35);
        doorFrame.add(lockPad);
        root.add(doorFrame);
        this.doorMesh = doorFrame;

        // =====================================================================
        // 3. RICH FUNCTIONAL FURNITURE & APPLIANCES (50x Scale)
        // =====================================================================

        // --- 🛋️ 거실 (Living Room) ---
        // Large Modern Area Rug
        const rug = new THREE.Mesh(new THREE.PlaneGeometry(28, 24), this.materials.carpetLiving);
        rug.rotation.x = -Math.PI / 2;
        rug.position.set(5, 0.02, 18);
        root.add(rug);

        // Luxury L-Shaped Leather Sectional Sofa
        const sofaMain = new THREE.Mesh(new THREE.BoxGeometry(20, 3.2, 7.5), this.materials.leatherSofa);
        sofaMain.position.set(5, 1.6, 10);
        sofaMain.castShadow = true;
        root.add(sofaMain);

        const sofaL = new THREE.Mesh(new THREE.BoxGeometry(7, 3.2, 12), this.materials.leatherSofa);
        sofaL.position.set(-1.5, 1.6, 16);
        sofaL.castShadow = true;
        root.add(sofaL);

        // Modern Glass & Walnut Coffee Table
        const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(11, 1.5, 5.5), this.materials.woodDark);
        coffeeTable.position.set(6, 0.75, 18);
        coffeeTable.castShadow = true;
        root.add(coffeeTable);

        // 75-Inch Smart TV & Media Console
        const tvConsole = new THREE.Mesh(new THREE.BoxGeometry(18, 2.0, 3.5), this.materials.furnitureWhite);
        tvConsole.position.set(5, 1.0, 36);
        tvConsole.castShadow = true;
        root.add(tvConsole);

        const tvScreen = new THREE.Mesh(new THREE.BoxGeometry(14, 7.5, 0.4), this.materials.tvScreen);
        tvScreen.position.set(5, 6.0, 36.5);
        root.add(tvScreen);

        // Smart Wall Air Conditioner with Digital Louvers
        const acUnit = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.5, 1.6), this.materials.furnitureWhite);
        acUnit.position.set(20.5, 7.0, 10);
        root.add(acUnit);
        this.acUnitMesh = acUnit;

        // Smart Ultrasonic Humidifier in Living Room
        const humidifierBody = new THREE.Mesh(new THREE.CylinderGeometry(1.2, 1.2, 3.5, 24), this.materials.furnitureWhite);
        humidifierBody.position.set(16, 1.75, 20);
        humidifierBody.castShadow = true;
        root.add(humidifierBody);
        this.humidifierMesh = humidifierBody;

        // --- 🛏️ 안방 (Master Bedroom) ---
        // King-size Bed with Headboard & Nightstands
        const masterBed = new THREE.Mesh(new THREE.BoxGeometry(16, 2.8, 19), this.materials.leatherSofa);
        masterBed.position.set(-32.5, 1.4, 6);
        masterBed.castShadow = true;
        root.add(masterBed);

        const headboard = new THREE.Mesh(new THREE.BoxGeometry(18, 6.0, 1.5), this.materials.woodDark);
        headboard.position.set(-32.5, 3.0, -3.5);
        root.add(headboard);

        const nightstandL = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 3.5), this.materials.woodDark);
        nightstandL.position.set(-43, 1.1, -2.5);
        root.add(nightstandL);

        const nightstandR = new THREE.Mesh(new THREE.BoxGeometry(4, 2.2, 3.5), this.materials.woodDark);
        nightstandR.position.set(-22, 1.1, -2.5);
        root.add(nightstandR);

        // Large Wardrobe Closet
        const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(26, 7.5, 3.5), this.materials.furnitureWhite);
        wardrobe.position.set(-32.5, 3.75, 19.5);
        root.add(wardrobe);

        // --- 🛏️ 방 B & 발코니 (Room B & Balcony) ---
        // Super Single Bed
        const bedB = new THREE.Mesh(new THREE.BoxGeometry(9, 2.5, 16), this.materials.leatherSofa);
        bedB.position.set(-22, 1.25, -30);
        bedB.castShadow = true;
        root.add(bedB);

        // Computer Desk + Chair
        const deskB = new THREE.Mesh(new THREE.BoxGeometry(9, 2.6, 4.5), this.materials.woodLight);
        deskB.position.set(-34, 1.3, -16);
        deskB.castShadow = true;
        root.add(deskB);

        // Balcony Laundry Rack
        const laundryRack = new THREE.Mesh(new THREE.BoxGeometry(6, 4.5, 2.0), this.materials.metalChrome);
        laundryRack.position.set(-45, 2.25, -28);
        root.add(laundryRack);

        // --- 🛏️ 방 A (Room A) ---
        const bedA = new THREE.Mesh(new THREE.BoxGeometry(9, 2.5, 16), this.materials.leatherSofa);
        bedA.position.set(40, 1.25, 25);
        bedA.castShadow = true;
        root.add(bedA);

        const deskA = new THREE.Mesh(new THREE.BoxGeometry(10, 2.6, 4.5), this.materials.woodLight);
        deskA.position.set(30, 1.3, 0);
        deskA.castShadow = true;
        root.add(deskA);

        const bookshelfA = new THREE.Mesh(new THREE.BoxGeometry(14, 7.5, 2.5), this.materials.woodDark);
        bookshelfA.position.set(36, 3.75, 42);
        root.add(bookshelfA);

        // --- 🍳 주방 & 식당 (Kitchen & Dining) ---
        // L-Shaped Kitchen Island & Counter
        const kitchenCounter = new THREE.Mesh(new THREE.BoxGeometry(22, 3.4, 5.5), this.materials.furnitureWhite);
        kitchenCounter.position.set(0, 1.7, -38);
        kitchenCounter.castShadow = true;
        root.add(kitchenCounter);

        const kitchenIsland = new THREE.Mesh(new THREE.BoxGeometry(16, 3.4, 5.0), this.materials.woodDark);
        kitchenIsland.position.set(2, 1.7, -24);
        kitchenIsland.castShadow = true;
        root.add(kitchenIsland);

        // Smart Boiler Unit Mounted on Kitchen Utility Wall (with LED status screen)
        const boilerBox = new THREE.Mesh(new THREE.BoxGeometry(4.5, 6.5, 2.0), this.materials.furnitureWhite);
        boilerBox.position.set(-11.5, 5.0, -42);
        root.add(boilerBox);

        const boilerScreen = new THREE.Mesh(new THREE.BoxGeometry(2.0, 1.5, 0.1), this.materials.tvScreen);
        boilerScreen.position.set(-11.5, 6.0, -40.9);
        root.add(boilerScreen);

        // Dining Table with 4 Chairs
        const diningTable = new THREE.Mesh(new THREE.BoxGeometry(13, 2.8, 7), this.materials.woodDark);
        diningTable.position.set(4, 1.4, -14);
        diningTable.castShadow = true;
        root.add(diningTable);

        // Double-door Smart Refrigerator
        const fridge = new THREE.Mesh(new THREE.BoxGeometry(5.5, 7.8, 4.5), this.materials.metalChrome);
        fridge.position.set(17, 3.9, -38);
        root.add(fridge);

        // --- 🛁 공용 욕실 (Bathroom) ---
        const bathtub = new THREE.Mesh(new THREE.BoxGeometry(12, 3.2, 6.5), this.materials.furnitureWhite);
        bathtub.position.set(-41, 1.6, 36);
        bathtub.castShadow = true;
        root.add(bathtub);

        const vanity = new THREE.Mesh(new THREE.BoxGeometry(8, 3.0, 4.5), this.materials.furnitureWhite);
        vanity.position.set(-22, 1.5, 27);
        root.add(vanity);

        // --- 🚪 현관 (Entrance Hall) ---
        const shoeCabinet = new THREE.Mesh(new THREE.BoxGeometry(16, 7.5, 3.0), this.materials.furnitureWhite);
        shoeCabinet.position.set(40, 3.75, -15);
        root.add(shoeCabinet);

        // Smart Intercom Wall Pad in Hallway
        const intercom = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.4, 0.2), this.materials.tvScreen);
        intercom.position.set(22.8, 5.0, -15);
        root.add(intercom);

        // =====================================================================
        // 4. POINT LIGHTS WITH LUXURY CEILING FIXTURES
        // =====================================================================
        const createRoomLight = (roomKey, x, y, z) => {
            const pLight = new THREE.PointLight(0xfff5dd, 0, 45, 1.5);
            pLight.position.set(x, y, z);
            root.add(pLight);

            const chandelier = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 0.4, 24), this.materials.furnitureWhite);
            chandelier.position.set(x, y + 0.8, z);
            root.add(chandelier);

            this.lights[roomKey] = pLight;
        };

        createRoomLight('livingRoom', 5, 9.5, 18.5);
        createRoomLight('masterRoom', -32.5, 9.5, 5);
        createRoomLight('roomA', 36, 9.5, 17.5);
        createRoomLight('roomB', -27.5, 9.5, -28.5);
        createRoomLight('kitchen', 3.5, 9.5, -26.5);
        createRoomLight('bathroom', -32.5, 9.5, 33.5);

        this.scene.add(root);
        this.houseRoot = root;
    }

    buildOndolHeatingGrid() {
        const group = new THREE.Group();

        const createOndolPlane = (x, z, w, d) => {
            const geo = new THREE.PlaneGeometry(w - 1.5, d - 1.5, 18, 18);
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
            createOndolPlane(5, 18.5, 40, 53),   // 거실
            createOndolPlane(-32.5, 5, 35, 34),  // 안방
            createOndolPlane(-27.5, -28.5, 25, 33), // 방 B
            createOndolPlane(36, 17.5, 28, 55),  // 방 A
            createOndolPlane(3.5, -26.5, 37, 37) // 주방
        ];

        this.scene.add(group);
        this.ondolMeshGroup = group;
    }

    buildACParticleStream() {
        const particleCount = 200;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(particleCount * 3);

        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = 20.0 - Math.random() * 1.5;
            positions[i + 1] = 6.8 - Math.random() * 1.2;
            positions[i + 2] = 10.0 + (Math.random() - 0.5) * 5.0;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0x60a5fa,
            size: 0.65,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.acParticles = new THREE.Points(geometry, material);
        this.scene.add(this.acParticles);
    }

    buildHumidifierMist() {
        const mistCount = 100;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(mistCount * 3);

        for (let i = 0; i < mistCount * 3; i += 3) {
            positions[i] = 16.0 + (Math.random() - 0.5) * 0.8;
            positions[i + 1] = 3.5 + Math.random() * 2.0;
            positions[i + 2] = 20.0 + (Math.random() - 0.5) * 0.8;
        }

        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.PointsMaterial({
            color: 0xe0f2fe,
            size: 0.5,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending
        });

        this.mistParticles = new THREE.Points(geometry, material);
        this.scene.add(this.mistParticles);
    }

    buildStoveFlame() {
        const flameGeo = new THREE.ConeGeometry(0.5, 1.0, 8);
        const flameMat = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            transparent: true,
            opacity: 0
        });
        const flame = new THREE.Mesh(flameGeo, flameMat);
        flame.position.set(0, 3.8, -38);
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

            ctx.font = 'bold 28px sans-serif';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, 128, 40);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.position.set(x, 10.5, z);
            sprite.scale.set(14, 4.4, 1);
            group.add(sprite);
        };

        createLabel('거실 (Living)', 5, 18.5);
        createLabel('안방 (Master)', -32.5, 5);
        createLabel('방 B & 발코니', -27.5, -28.5);
        createLabel('방 A (Room A)', 36, 17.5);
        createLabel('주방 & 식당', 3.5, -26.5);
        createLabel('공용 욕실', -32.5, 33.5);
        createLabel('현관 (Door)', 36, -27.5);

        this.scene.add(group);
        this.roomLabelsGroup = group;
    }

    syncLights() {
        const factor = state.brightness / 100;
        Object.keys(state.lights).forEach(room => {
            if (this.lights[room]) {
                const isOn = state.lights[room];
                this.lights[room].intensity = isOn ? (2.2 * factor + 0.5) : 0;
            }
        });
    }

    syncDoor() {}

    syncGas() {
        if (this.stoveFlame) {
            this.stoveFlame.material.opacity = (state.gas.status === 'open') ? 0.9 : 0;
        }
    }

    updateTheme(theme) {
        const isDark = (theme === 'dark');
        if (this.scene) {
            this.scene.background.setHex(isDark ? 0x0f172a : 0xebf0f7);
            this.scene.fog.color.setHex(isDark ? 0x0f172a : 0xebf0f7);
        }
        if (this.ambientLight) {
            this.ambientLight.intensity = isDark ? 0.45 : 0.75;
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
            this.animateCameraTo(new THREE.Vector3(85, 95, 85), new THREE.Vector3(0, 4, 0));
        });

        elements.btnCamTop.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamTop);
            this.animateCameraTo(new THREE.Vector3(0, 140, 0.1), new THREE.Vector3(0, 0, 0));
        });

        elements.btnCamLiving.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamLiving);
            this.animateCameraTo(new THREE.Vector3(5, 45, 60), new THREE.Vector3(5, 3, 18.5));
        });

        elements.btnCamMaster.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamMaster);
            this.animateCameraTo(new THREE.Vector3(-65, 45, 45), new THREE.Vector3(-32.5, 3, 5));
        });

        elements.btnCamKitchen.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamKitchen);
            this.animateCameraTo(new THREE.Vector3(3.5, 45, -65), new THREE.Vector3(3.5, 3, -26.5));
        });

        elements.btnCamReset.addEventListener('click', () => {
            this.setActiveToolBtn(elements.btnCamIso);
            this.animateCameraTo(new THREE.Vector3(85, 95, 85), new THREE.Vector3(0, 4, 0));
        });

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
            living: { cam: new THREE.Vector3(5, 45, 60), look: new THREE.Vector3(5, 3, 18.5) },
            master: { cam: new THREE.Vector3(-65, 45, 45), look: new THREE.Vector3(-32.5, 3, 5) },
            roomb: { cam: new THREE.Vector3(-60, 45, -60), look: new THREE.Vector3(-27.5, 3, -28.5) },
            rooma: { cam: new THREE.Vector3(65, 45, 55), look: new THREE.Vector3(36, 3, 17.5) },
            kitchen: { cam: new THREE.Vector3(3.5, 45, -65), look: new THREE.Vector3(3.5, 3, -26.5) },
            bath: { cam: new THREE.Vector3(-60, 45, 65), look: new THREE.Vector3(-32.5, 3, 33.5) },
            entrance: { cam: new THREE.Vector3(65, 45, -65), look: new THREE.Vector3(36, 3, -27.5) }
        };

        elements.roomFocusButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const roomKey = btn.dataset.roomFocus;
                const coord = roomCoords[roomKey];
                if (coord) {
                    this.setActiveToolBtn(null);
                    this.animateCameraTo(coord.cam, coord.look);
                    addLog(`3D 카메라 포커스: [${btn.textContent.trim()}]`, 'action');
                }
            });
        });
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

        // Door Swing
        if (this.doorMesh) {
            const targetRotation = state.door.status === 'unlocked' ? (Math.PI / 2.2) : 0;
            this.doorMesh.rotation.y += (targetRotation - this.doorMesh.rotation.y) * 0.1;
        }

        // Ondol Warm Grid Pulse
        if (this.ondolPlanes && this.ondolPlanes.length > 0) {
            const isBoilerOn = state.boiler.active;
            const targetOpacity = isBoilerOn ? (0.45 + 0.3 * Math.sin(time * 3.5)) : 0;
            this.ondolPlanes.forEach(plane => {
                plane.material.opacity += (targetOpacity - plane.material.opacity) * 0.1;
            });
        }

        // AC Particle Flow
        if (this.acParticles) {
            const isAcOn = state.aircon.active;
            const targetOpacity = isAcOn ? 0.85 : 0;
            this.acParticles.material.opacity += (targetOpacity - this.acParticles.material.opacity) * 0.1;

            if (isAcOn || this.acParticles.material.opacity > 0.02) {
                const positions = this.acParticles.geometry.attributes.position.array;
                const windSpeed = state.aircon.wind === 'high' ? 0.35 : (state.aircon.wind === 'medium' ? 0.22 : 0.14);

                for (let i = 0; i < positions.length; i += 3) {
                    positions[i] -= windSpeed * 1.5;
                    positions[i + 1] -= windSpeed * 0.35;
                    positions[i + 2] += (Math.sin(time * 2 + i) * 0.08);

                    if (positions[i] < -8.0 || positions[i + 1] < 0.5) {
                        positions[i] = 20.0 - Math.random() * 1.5;
                        positions[i + 1] = 6.8 - Math.random() * 1.2;
                        positions[i + 2] = 10.0 + (Math.random() - 0.5) * 5.0;
                    }
                }
                this.acParticles.geometry.attributes.position.needsUpdate = true;
            }
        }

        // Humidifier Mist Particle Animation
        if (this.mistParticles) {
            const isHumOn = (state.humidity.mode === 'humidify' || (state.humidity.mode === 'auto' && state.humidity.current < state.humidity.target));
            const targetOpacity = isHumOn ? 0.7 : 0;
            this.mistParticles.material.opacity += (targetOpacity - this.mistParticles.material.opacity) * 0.1;

            if (isHumOn || this.mistParticles.material.opacity > 0.02) {
                const positions = this.mistParticles.geometry.attributes.position.array;
                for (let i = 0; i < positions.length; i += 3) {
                    positions[i + 1] += 0.05; // rise
                    positions[i] += (Math.sin(time * 3 + i) * 0.02);
                    positions[i + 2] += (Math.cos(time * 3 + i) * 0.02);

                    if (positions[i + 1] > 7.5) {
                        positions[i] = 16.0 + (Math.random() - 0.5) * 0.8;
                        positions[i + 1] = 3.5;
                        positions[i + 2] = 20.0 + (Math.random() - 0.5) * 0.8;
                    }
                }
                this.mistParticles.geometry.attributes.position.needsUpdate = true;
            }
        }

        // Stove Flame Flicker
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
    updateGasUI();
    updateTempUI();
    initThermodynamics();

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
