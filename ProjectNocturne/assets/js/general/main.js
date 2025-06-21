// ========================================
// MAIN.JS - ACTUALIZADO PARA NUEVAS FUNCIONES DEL MODULE MANAGER
// ========================================

import {
    initModuleManager,
    activateModule,
    deactivateModule,
    toggleModule,
    deactivateAllModules,
    isModuleCurrentlyChanging,
    logModuleStates,
    resetModuleChangeFlag,
    showControlCenterMenu,
    showSpecificOverlay,
    getActiveModule,
    isModuleActive,
    isAnyModuleActive
} from './module-manager.js';

// Import the new style manager from general-tools.js
import { initializeTextStyleManager } from '../tools/general-tools.js';

// Import functions from palette-colors.js
import { getCurrentColor, getColorInfo, isGradientColor } from '../tools/palette-colors.js'; //


// ========================================
// MÓDULO DEL SIDEBAR MÓVIL
// ========================================

function initSidebarMobile() {
    const btn = document.querySelector('[data-module="toggleSidebarMovile"]');
    const sidebar = document.querySelector('.sidebar-wrapper.mobile-sidebar');

    if (!btn || !sidebar) {
        return;
    }

    function handleSidebarToggle() {
        if (btn.hasAttribute('disabled')) {
            btn.removeAttribute('disabled');
        } else {
            btn.setAttribute('disabled', 'true');
        }

        if (sidebar.classList.contains('disabled')) {
            sidebar.classList.remove('disabled');
            sidebar.classList.add('active');
        } else {
            sidebar.classList.remove('active');
            sidebar.classList.add('disabled');
        }
    }

    btn.addEventListener('click', handleSidebarToggle);

    function updateSidebarVisibility() {
        const screenWidth = window.innerWidth;

        if (screenWidth > 768) {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                sidebar.classList.add('disabled');
            }
            btn.removeAttribute('disabled');
        }
    }

    updateSidebarVisibility();
    window.addEventListener('resize', updateSidebarVisibility);
}

// ========================================
// SISTEMA DE SECCIONES DE LA SIDEBAR
// ========================================

const activeSectionStates = {
    everything: true,
    alarm: false,
    stopwatch: false,
    timer: false,
    worldClock: false
};

const iconToSection = {
    'home': 'everything',
    'alarm': 'alarm',
    'timelapse': 'stopwatch',
    'timer': 'timer',
    'schedule': 'worldClock'
};

function logSectionStates() {
    console.groupCollapsed('📋 Current Section States');
    const statesForTable = {};
    const sections = Object.keys(activeSectionStates);
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        statesForTable[section.toUpperCase()] = {
            Status: activeSectionStates[section] ? '✅ ACTIVE' : '❌ INACTIVE'
        };
    }
    console.table(statesForTable);
    console.groupEnd();
}

function activateSection(sectionName, showLog) {
    if (showLog === undefined) showLog = true;

    const sections = Object.keys(activeSectionStates);
    for (let i = 0; i < sections.length; i++) {
        activeSectionStates[sections[i]] = false;
    }

    if (activeSectionStates.hasOwnProperty(sectionName)) {
        activeSectionStates[sectionName] = true;

        updateSidebarButtons(sectionName);
        updateSectionContent(sectionName);

        if (showLog) {
            logSectionStates();
        }

        const event = new CustomEvent('sectionChanged', {
            detail: { activeSection: sectionName, states: activeSectionStates }
        });
        document.dispatchEvent(event);
    }
}

function updateSidebarButtons(activeSection) {
    const allSidebarButtons = document.querySelectorAll('.sidebar-button');

    for (let i = 0; i < allSidebarButtons.length; i++) {
        const button = allSidebarButtons[i];
        const icon = button.querySelector('.material-symbols-rounded');
        if (icon) {
            const iconName = icon.textContent.trim();
            const sectionName = iconToSection[iconName];

            if (sectionName === activeSection) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        }
    }
}

function updateSectionContent(activeSection) {
    const allSections = document.querySelectorAll('.section-content > div[class*="section-"]');
    for (let i = 0; i < allSections.length; i++) {
        const section = allSections[i];
        section.classList.remove('active');
        section.classList.add('disabled');
    }

    const targetSection = document.querySelector('.section-' + activeSection);
    if (targetSection) {
        targetSection.classList.remove('disabled');
        targetSection.classList.add('active');
    }
}

function initSidebarSections() {
    const sidebarButtons = document.querySelectorAll('.sidebar-button');

    if (sidebarButtons.length === 0) {
        return;
    }

    for (let i = 0; i < sidebarButtons.length; i++) {
        const button = sidebarButtons[i];
        const icon = button.querySelector('.material-symbols-rounded');
        if (icon) {
            const iconName = icon.textContent.trim();
            const sectionName = iconToSection[iconName];

            if (sectionName) {
                button.addEventListener('click', function (sectionName) {
                    return function (e) {
                        e.preventDefault();
                        activateSection(sectionName);
                    };
                }(sectionName));
            }
        }
    }

    activateSection('everything', false);
}

// ========================================
// FUNCIONES PÚBLICAS PARA MANEJO EXTERNO DE SECCIONES
// ========================================

function getActiveSection() {
    const sections = Object.keys(activeSectionStates);
    for (let i = 0; i < sections.length; i++) {
        if (activeSectionStates[sections[i]]) {
            return sections[i];
        }
    }
    return null;
}

function getAllSectionStates() {
    const copy = {};
    const sections = Object.keys(activeSectionStates);
    for (let i = 0; i < sections.length; i++) {
        copy[sections[i]] = activeSectionStates[sections[i]];
    }
    return copy;
}

function switchToSection(sectionName) {
    if (activeSectionStates.hasOwnProperty(sectionName)) {
        activateSection(sectionName);
        return true;
    }
    return false;
}

// ========================================
// INICIALIZACIÓN - DELEGADO AL MODULE MANAGER
// ========================================

function initControlCenter() {
    // Delegado al module manager
}

function initNewOverlayModules() {
    // Delegado al module manager
}

// ========================================
// FUNCIONES UNIFICADAS DE CONTROL DE MÓDULOS
// ========================================

function closeActiveModule(options = {}) {
    const activeModule = getActiveModule();
    if (activeModule) {
        deactivateModule(activeModule, options);
    }
}

function closeAllModules(options = {}) {
    const { source = 'closeAllModules' } = options;
    
    if (isAnyModuleActive()) {
        deactivateAllModules();
        console.log('🔧 All modules closed from:', source);
    }
}

function activateModuleByName(moduleName) {
    activateModule(moduleName);
}

function toggleModuleByName(moduleName) {
    toggleModule(moduleName);
}

// ========================================
// FUNCIONES DE UTILIDAD PARA MÓDULOS
// ========================================

function getModuleInfo(moduleName) {
    return {
        active: isModuleActive(moduleName),
        name: moduleName
    };
}

function isControlCenterActive() {
    return isModuleActive('controlCenter');
}

function isAnyOverlayActive() {
    return isModuleActive('menuAlarm') || 
           isModuleActive('menuTimer') || 
           isModuleActive('menuWorldClock') || 
           isModuleActive('menuPaletteColors') ||
           isModuleActive('overlayContainer');
}

// ========================================
// FUNCIONES ESPECÍFICAS PARA OVERLAYS
// ========================================

function activateSpecificOverlay(overlayName) {
    // Mapear nombres de overlay a toggles
    const overlayToToggleMap = {
        'menuAlarm': 'toggleMenuAlarm',
        'menuTimer': 'toggleMenuTimer',
        'menuWorldClock': 'toggleMenuWorldClock',
        'menuPaletteColors': 'togglePaletteColors'
    };

    const toggle = overlayToToggleMap[overlayName];
    if (toggle) {
        activateModule(toggle);
        return true;
    }
    return false;
}

function closeSpecificOverlay(overlayName) {
    if (isModuleActive('overlayContainer')) {
        deactivateModule('overlayContainer');
        return true;
    }
    return false;
}

function switchOverlay(overlayName) {
    // Si hay un overlay activo, cambiar al nuevo
    if (isModuleActive('overlayContainer')) {
        const currentOverlay = getCurrentActiveOverlay();
        if (currentOverlay !== overlayName) {
            // Activar el nuevo overlay (esto cerrará el actual y abrirá el nuevo)
            return activateSpecificOverlay(overlayName);
        }
        return false;
    } else {
        // No hay overlay activo, activar el solicitado
        return activateSpecificOverlay(overlayName);
    }
}

function getCurrentActiveOverlay() {
    // Esta función debería obtener el overlay activo del module manager
    // Por ahora, verificamos manualmente
    const overlayContainer = document.querySelector('.module-overlay');
    if (overlayContainer && overlayContainer.classList.contains('active')) {
        const activeOverlay = overlayContainer.querySelector('.menu-alarm.active, .menu-timer.active, .menu-worldClock.active, .menu-paletteColors.active');
        if (activeOverlay) {
            const dataMenu = activeOverlay.getAttribute('data-menu');
            const overlayMap = {
                'Alarm': 'menuAlarm',
                'Timer': 'menuTimer',
                'WorldClock': 'menuWorldClock',
                'paletteColors': 'menuPaletteColors'
            };
            return overlayMap[dataMenu] || null;
        }
    }
    return null;
}

// ========================================
// FUNCIONES MEJORADAS PARA CONTROL CENTER
// ========================================

function activateControlCenterMenu(menuName) {
    if (isControlCenterActive()) {
        showControlCenterMenu(menuName);
        return true;
    } else {
        // Activar control center primero, luego cambiar menú
        activateModule('controlCenter');
        setTimeout(() => {
            showControlCenterMenu(menuName);
        }, 100);
        return true;
    }
}

function switchControlCenterMenu(menuName) {
    return activateControlCenterMenu(menuName);
}

// ========================================
// FUNCIONES DE DEBUGGING Y ESTADO
// ========================================

function logAllStates() {
    console.group('🌙 ProjectNocturne - Complete System Status');
    logSectionStates();
    logModuleStates();
    console.log('📊 Active Module:', getActiveModule() || 'None');
    console.log('📊 Any Module Active:', isAnyModuleActive());
    console.log('📊 Control Center Active:', isControlCenterActive());
    console.log('📊 Any Overlay Active:', isAnyOverlayActive());
    console.log('📊 Current Active Overlay:', getCurrentActiveOverlay() || 'None');
    console.groupEnd();
}

function getSystemStatus() {
    return {
        sections: {
            active: getActiveSection(),
            all: getAllSectionStates()
        },
        modules: {
            active: getActiveModule(),
            anyActive: isAnyModuleActive(),
            controlCenterActive: isControlCenterActive(),
            anyOverlayActive: isAnyOverlayActive(),
            currentActiveOverlay: getCurrentActiveOverlay(),
            isChanging: isModuleCurrentlyChanging()
        }
    };
}

// ========================================
// FUNCIONES WRAPPER PARA COMPATIBILIDAD
// ========================================

function closeControlCenter(options = {}) {
    deactivateModule('controlCenter', options);
}

function closeOverlays(options = {}) {
    if (isModuleActive('overlayContainer')) {
        deactivateModule('overlayContainer', options);
    }
}

// Función específica para cerrar overlay por nombre
function closeOverlayByName(overlayName) {
    const currentOverlay = getCurrentActiveOverlay();
    if (currentOverlay === overlayName) {
        return closeSpecificOverlay(overlayName);
    }
    return false;
}

// ========================================
// FUNCIONES DE EVENTOS PERSONALIZADOS
// ========================================

function dispatchModuleEvent(eventName, detail = {}) {
    const event = new CustomEvent(eventName, {
        detail: {
            ...detail,
            timestamp: Date.now(),
            activeModule: getActiveModule(),
            activeSection: getActiveSection()
        }
    });
    document.dispatchEvent(event);
}

function onModuleActivated(callback) {
    document.addEventListener('moduleActivated', callback);
}

function onModuleDeactivated(callback) {
    document.addEventListener('moduleDeactivated', callback);
}

function onOverlayChanged(callback) {
    document.addEventListener('overlayChanged', callback);
}

// ========================================
// FUNCIONES DE UTILIDAD AVANZADAS
// ========================================

function isModuleBusy() {
    return isModuleCurrentlyChanging();
}

function waitForModuleReady() {
    return new Promise((resolve) => {
        if (!isModuleCurrentlyChanging()) {
            resolve();
            return;
        }

        const checkReady = () => {
            if (!isModuleCurrentlyChanging()) {
                resolve();
            } else {
                setTimeout(checkReady, 50);
            }
        };

        setTimeout(checkReady, 50);
    });
}

function executeWhenModuleReady(callback) {
    waitForModuleReady().then(callback);
}

// ========================================
// FUNCIONES DE CONFIGURACIÓN Y PREFERENCIAS
// ========================================

function setModulePreference(moduleName, preference, value) {
    try {
        const key = `module-${moduleName}-${preference}`;
        localStorage.setItem(key, JSON.stringify(value));
        return true;
    } catch (error) {
        console.error('Error setting module preference:', error);
        return false;
    }
}

function getModulePreference(moduleName, preference, defaultValue = null) {
    try {
        const key = `module-${moduleName}-${preference}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : defaultValue;
    } catch (error) {
        console.error('Error getting module preference:', error);
        return defaultValue;
    }
}

// ========================================
// GETTERS PARA DATOS DE PERSONALIZACIÓN
// ========================================

function getAppliedColor() {
    // Check if colorTextManager is available on window object
    if (window.colorTextManager && typeof window.colorTextManager.getCurrentColor === 'function' && typeof window.colorTextManager.getColorInfo === 'function') {
        const color = window.colorTextManager.getCurrentColor();
        const info = window.colorTextManager.getColorInfo();
        return {
            color: color,
            colorName: info.activeColorName,
            isGradient: isGradientColor(color), // Use the imported isGradientColor function
            isValidForTheme: window.colorTextManager.isValidForTheme(color) // Directly call isValidForTheme from window.colorTextManager
        };
    }
    return {
        color: 'N/A',
        colorName: 'N/A',
        isGradient: 'N/A',
        isValidForTheme: 'N/A'
    };
}

function getAppliedFontScale() {
    // Check if centralizedFontManager is available on window object
    if (window.centralizedFontManager && typeof window.centralizedFontManager.getCurrentScale === 'function' && typeof window.centralizedFontManager.getCurrentActualSize === 'function') {
        const scale = window.centralizedFontManager.getCurrentScale();
        const pixelSize = window.centralizedFontManager.getCurrentActualSize();
        return {
            scale: scale,
            pixelSize: pixelSize
        };
    }
    return { scale: 'N/A', pixelSize: 'N/A' };
}

function getAppliedTextStyle() {
    // Check if textStyleState is available (it's internal to general-tools.js via its closure,
    // but its state is persisted via localStorage and reflected by classes on elements).
    // The easiest way to check is to directly read localStorage and check for classes.
    return {
        isBold: localStorage.getItem('textStyle_isBold') === 'true',
        isItalic: localStorage.getItem('textStyle_isItalic') === 'true'
    };
}

// ========================================
// INITIALIZE TEXT STYLE MANAGER
// ========================================
document.addEventListener('DOMContentLoaded', initializeTextStyleManager);

// ========================================
// EXPORTS - FUNCIONES COMPLETAS Y UNIFICADAS
// ========================================

export {
    // Inicialización
    initSidebarMobile,
    initSidebarSections,
    initControlCenter,
    initNewOverlayModules,
    
    // Gestión de secciones
    logSectionStates,
    getActiveSection,
    getAllSectionStates,
    switchToSection,
    activateSection,
    
    // Gestión de módulos (funciones base)
    activateModuleByName as activateModule,
    deactivateModule,
    toggleModuleByName as toggleModule,
    closeActiveModule,
    closeAllModules,
    
    // Gestión específica de Control Center
    activateControlCenterMenu,
    switchControlCenterMenu,
    showControlCenterMenu,
    
    // Gestión específica de Overlays
    activateSpecificOverlay,
    closeSpecificOverlay,
    switchOverlay,
    getCurrentActiveOverlay,
    showSpecificOverlay,
    
    // Estado y control
    isModuleCurrentlyChanging,
    isModuleBusy,
    resetModuleChangeFlag,
    logModuleStates,
    
    isAnyModuleActive,
    isControlCenterActive,
    isAnyOverlayActive,
    getModuleInfo,
    getSystemStatus,
    logAllStates,
    
    getActiveModule,
    isModuleActive,
    
    closeControlCenter,
    closeOverlays,
    closeOverlayByName,
    

    waitForModuleReady,
    executeWhenModuleReady,
    
    dispatchModuleEvent,
    onModuleActivated,
    onModuleDeactivated,
    onOverlayChanged,
    
    setModulePreference,
    getModulePreference,

    getAppliedColor,
    getAppliedFontScale,
    getAppliedTextStyle
};