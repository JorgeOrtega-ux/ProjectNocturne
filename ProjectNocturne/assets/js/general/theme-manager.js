// ========================================
// THEME-MANAGER.JS - CON CANCELACIÓN DE PROCESOS
// ========================================

// ========================================
// CONSTANTES Y CONFIGURACIÓN
// ========================================

const SUPPORTED_THEMES = ['system', 'dark', 'light'];

const THEME_DISPLAY_NAMES = {
    'system': 'Sync with System',
    'dark': 'Dark Theme',
    'light': 'Light Theme'
};

const TIMING_CONFIG = {
    THEME_CHANGE_DURATION: 1000,
    STATE_RESET_DELAY: 200,
    MIN_INTERVAL_BETWEEN_OPERATIONS: 500
};

// ========================================
// ESTADO DEL SISTEMA DE TEMAS
// ========================================

const themeState = {
    current: 'system',
    isChanging: false,
    isSystemReady: false,
    lastStateApplication: 0,
    // ✅ NUEVO: Control de cancelación
    changeTimeout: null,
    pendingTheme: null,
    isCancellable: false
};

// ========================================
// REFERENCIAS EXTERNAS
// ========================================

let getTranslation = null;
let onThemeChangeCallback = null;

// ========================================
// INICIALIZACIÓN DEL SISTEMA DE TEMAS
// ========================================

function initThemeManager() {
    return new Promise((resolve, reject) => {
        try {
            const savedTheme = localStorage.getItem('app-theme');
            if (savedTheme && SUPPORTED_THEMES.includes(savedTheme)) {
                themeState.current = savedTheme;
            } else {
                themeState.current = 'system';
                localStorage.setItem('app-theme', themeState.current);
            }
            
            applyThemeClass(themeState.current);
            setupSystemThemeListener();
            themeState.isSystemReady = true;
            
            resolve();
        } catch (error) {
            console.error('❌ Error initializing Theme Manager:', error);
            reject(error);
        }
    });
}

// ========================================
// ✅ NUEVA FUNCIÓN: CANCELAR CAMBIO DE TEMA
// ========================================

function cancelThemeChange() {
    if (!themeState.isChanging) {
        return false;
    }

    console.log('🚫 Cancelling theme change process');

    // Limpiar timeout si existe
    if (themeState.changeTimeout) {
        clearTimeout(themeState.changeTimeout);
        themeState.changeTimeout = null;
    }

    // Revertir al tema anterior
    const previousTheme = themeState.current;
    revertThemeChange(previousTheme);

    // Resetear estados
    themeState.isChanging = false;
    themeState.pendingTheme = null;
    themeState.isCancellable = false;

    console.log('✅ Theme change cancelled, reverted to:', previousTheme);
    return true;
}

// ========================================
// GESTIÓN DE TEMAS ACTUALIZADA
// ========================================

function applyTheme(theme) {
    if (themeState.isChanging || theme === themeState.current) {
        return Promise.resolve(false);
    }
    
    const previousTheme = themeState.current;
    themeState.isChanging = true;
    themeState.pendingTheme = theme;
    themeState.isCancellable = true; // ✅ NUEVO: Marcar como cancelable

    console.log('🎨 Applying theme:', theme);
    setupThemeLoadingUI(theme, previousTheme);

    return performThemeChange(theme)
        .then(() => {
            // Solo aplicar si no fue cancelado
            if (themeState.isChanging && themeState.pendingTheme === theme) {
                applyThemeClass(theme);
                themeState.current = theme;
                localStorage.setItem('app-theme', theme);
                completeThemeChange(theme);
                
                // Notificar al callback si existe
                if (onThemeChangeCallback && typeof onThemeChangeCallback === 'function') {
                    onThemeChangeCallback();
                }
                
                // Disparar evento de cambio de tema
                const event = new CustomEvent('themeChanged', {
                    detail: { theme: theme, previousTheme: previousTheme }
                });
                document.dispatchEvent(event);
                
                return true;
            } else {
                console.log('🚫 Theme change was cancelled during process');
                return false;
            }
        })
        .catch(error => {
            console.error('Error applying theme:', error);
            revertThemeChange(previousTheme);
            return false;
        })
        .finally(() => {
            setTimeout(() => {
                themeState.isChanging = false;
                themeState.pendingTheme = null;
                themeState.isCancellable = false;
            }, 100);
        });
}

function performThemeChange(theme) {
    return new Promise((resolve, reject) => {
        // ✅ NUEVO: Guardar referencia del timeout para poder cancelarlo
        themeState.changeTimeout = setTimeout(() => {
            // Verificar si el cambio no fue cancelado
            if (themeState.isChanging && themeState.pendingTheme === theme) {
                const isValid = validateThemeChange(theme);
                if (!isValid) {
                    reject(new Error('Theme validation failed'));
                } else {
                    resolve();
                }
            } else {
                reject(new Error('Theme change was cancelled'));
            }
            themeState.changeTimeout = null;
        }, TIMING_CONFIG.THEME_CHANGE_DURATION);
    });
}

function applyThemeClass(theme) {
    const html = document.documentElement;
    html.classList.remove('dark-mode', 'light-mode');

    switch (theme) {
        case 'dark':
            html.classList.add('dark-mode');
            break;
        case 'light':
            html.classList.add('light-mode');
            break;
        case 'system':
            if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                html.classList.add('dark-mode');
            } else {
                html.classList.add('light-mode');
            }
            break;
    }
}

function validateThemeChange(theme) {
    if (!SUPPORTED_THEMES.includes(theme)) {
        return false;
    }
    try {
        localStorage.setItem('theme-test', 'test');
        localStorage.removeItem('theme-test');
    } catch (e) {
        return false;
    }
    return true;
}

// ========================================
// GESTIÓN DE UI DE CARGA
// ========================================

function setupThemeLoadingUI(newTheme, previousTheme) {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        if (linkTheme === newTheme) {
            link.classList.remove('active');
            link.classList.add('preview-active');
            addSpinnerToLink(link);
        } else {
            link.classList.remove('active', 'preview-active');
            link.classList.add('disabled-interactive');
        }
    });
}

function completeThemeChange(theme) {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        if (linkTheme === theme) {
            link.classList.remove('preview-active', 'disabled-interactive');
            link.classList.add('active');
            removeSpinnerFromLink(link);
        } else {
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
        }
    });
}

function revertThemeChange(previousTheme) {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        const linkTheme = link.getAttribute('data-theme');
        link.classList.remove('preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
        if (linkTheme === previousTheme) {
            link.classList.add('active');
        } else {
            link.classList.remove('active');
        }
    });
}

// ========================================
// UTILIDADES DE SPINNER
// ========================================

function addSpinnerToLink(link) {
    removeSpinnerFromLink(link);
    const loaderDiv = document.createElement('div');
    loaderDiv.className = 'menu-link-icon menu-link-loader';
    loaderDiv.innerHTML = '<span class="material-symbols-rounded spinning">progress_activity</span>';
    link.appendChild(loaderDiv);
}

function removeSpinnerFromLink(link) {
    const loaderDiv = link.querySelector('.menu-link-loader');
    if (loaderDiv) {
        loaderDiv.remove();
    }
}

// ========================================
// APLICACIÓN DE ESTADOS INICIALES
// ========================================

function applyThemeStates() {
    const now = Date.now();
    
    if (now - themeState.lastStateApplication < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_OPERATIONS) {
        return;
    }
    
    if (themeState.isChanging) {
        return;
    }
    
    themeState.lastStateApplication = now;
    
    try {
        const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
        themeLinks.forEach(link => {
            const linkTheme = link.getAttribute('data-theme');
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
            removeSpinnerFromLink(link);
            
            if (linkTheme === themeState.current) {
                link.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error('❌ Error applying theme states:', error);
    }
}

// ========================================
// ACTUALIZACIÓN DE ETIQUETAS
// ========================================

function updateThemeLabel() {
    try {
        const appearanceLink = document.querySelector('.menu-link[data-toggle="appearance"] .menu-link-text span');
        if (!appearanceLink) return;

        if (getTranslation) {
            // Usar sistema de traducciones
            const appearanceText = getTranslation('appearance', 'menu');
            const currentThemeTranslationKey = getThemeTranslationKey(themeState.current);
            const currentThemeText = getTranslation(currentThemeTranslationKey, 'menu');
            const newText = `${appearanceText}: ${currentThemeText}`;
            
            if (appearanceLink.textContent !== newText) {
                appearanceLink.textContent = newText;
                console.log('🎨 Updated appearance label:', newText);
            }
        } else {
            // Fallback sin traducciones
            const currentThemeDisplay = THEME_DISPLAY_NAMES[themeState.current] || themeState.current;
            const newText = 'Appearance: ' + currentThemeDisplay;
            if (appearanceLink.textContent !== newText) {
                appearanceLink.textContent = newText;
            }
        }
    } catch (error) {
        console.error('❌ Error updating theme label:', error);
    }
}

function getThemeTranslationKey(theme) {
    const themeMap = {
        'system': 'sync_with_system',
        'dark': 'dark_theme',
        'light': 'light_theme'
    };
    return themeMap[theme] || 'sync_with_system';
}

// ========================================
// LISTENER PARA TEMA DEL SISTEMA
// ========================================

function setupSystemThemeListener() {
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
            if (themeState.current === 'system' && !themeState.isChanging) {
                console.log('🌓 System theme preference changed, updating...');
                applyThemeClass('system');
                
                // Notificar cambio para actualizar etiquetas
                setTimeout(() => {
                    if (onThemeChangeCallback && typeof onThemeChangeCallback === 'function') {
                        onThemeChangeCallback();
                    }
                }, 100);
            }
        });
    }
}

// ========================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ========================================

function setupThemeEventListeners() {
    document.addEventListener('click', (e) => {
        const themeLink = e.target.closest('.menu-link[data-theme]');
        if (themeLink) {
            const theme = themeLink.getAttribute('data-theme');
            if (theme) {
                e.preventDefault();
                applyTheme(theme);
            }
        }
    });
}

// ========================================
// LIMPIAR ESTADOS DE CARGA
// ========================================

function cleanThemeLoadingStates() {
    const themeLinks = document.querySelectorAll('.menu-link[data-theme]');
    themeLinks.forEach(link => {
        link.classList.remove('active', 'preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
    });

    setTimeout(() => {
        applyThemeStates();
    }, 50);
}

// ========================================
// ✅ FUNCIÓN PARA RESETEAR ESTADOS INTERNOS (LLAMADA POR MODULE-MANAGER)
// ========================================

function resetThemeStates() {
    if (themeState.changeTimeout) {
        clearTimeout(themeState.changeTimeout);
        themeState.changeTimeout = null;
    }
    
    themeState.isChanging = false;
    themeState.pendingTheme = null;
    themeState.isCancellable = false;
}

// ========================================
// FUNCIONES DE CONFIGURACIÓN
// ========================================

function setTranslationFunction(translationFn) {
    getTranslation = translationFn;
    
    if (themeState.isSystemReady) {
        setTimeout(() => {
            updateThemeLabel();
        }, 100);
    }
}

function setThemeChangeCallback(callback) {
    onThemeChangeCallback = callback;
}

// ========================================
// GETTERS PÚBLICOS
// ========================================

function getCurrentTheme() {
    return themeState.current;
}

function getSupportedThemes() {
    return SUPPORTED_THEMES.slice();
}

function getThemeDisplayNames() {
    return { ...THEME_DISPLAY_NAMES };
}

function isThemeChanging() {
    return themeState.isChanging;
}

function isThemeSystemReady() {
    return themeState.isSystemReady;
}

function getThemeState() {
    return {
        current: themeState.current,
        isChanging: themeState.isChanging,
        isSystemReady: themeState.isSystemReady,
        supportedThemes: SUPPORTED_THEMES,
        // ✅ NUEVO: Estados de cancelación
        isCancellable: themeState.isCancellable,
        pendingTheme: themeState.pendingTheme
    };
}

// ========================================
// FUNCIONES DE DEBUG
// ========================================

function debugThemeManager() {
    console.group('🐛 Theme Manager Debug');
    console.log('Current Theme:', themeState.current);
    console.log('Is Changing:', themeState.isChanging);
    console.log('Is Cancellable:', themeState.isCancellable);
    console.log('Pending Theme:', themeState.pendingTheme);
    console.log('System Ready:', themeState.isSystemReady);
    console.log('Supported Themes:', SUPPORTED_THEMES);
    
    const activeThemeLinks = document.querySelectorAll('.menu-link[data-theme].active');
    console.log('Active Theme Links:', activeThemeLinks.length, 
        Array.from(activeThemeLinks).map(el => el.getAttribute('data-theme')));
    
    console.log('HTML Classes:', document.documentElement.className);
    console.groupEnd();
}

// ========================================
// EXPORTS (SIMPLIFICADOS Y LIMPIOS)
// ========================================

export {
    initThemeManager,
    applyTheme,
    getCurrentTheme,
    getSupportedThemes,
    getThemeDisplayNames,
    isThemeChanging,
    isThemeSystemReady,
    getThemeState,
    
    applyThemeStates,
    updateThemeLabel,
    cleanThemeLoadingStates,
    setupThemeEventListeners,
    
    setTranslationFunction,
    setThemeChangeCallback,
    
    // ✅ FUNCIÓN PARA RESETEAR ESTADOS (LLAMADA POR MODULE-MANAGER)
    resetThemeStates,
    
    debugThemeManager
};