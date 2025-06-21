// ========================================
// LANGUAGE-MANAGER.JS - CON CANCELACIÓN DE PROCESOS
// ========================================

// ========================================
// CONSTANTES Y CONFIGURACIÓN
// ========================================

const SUPPORTED_LANGUAGES = ['en-us', 'es-mx', 'fr-fr'];

const LANGUAGE_DISPLAY_NAMES = {
    'en-us': 'English (US)',
    'es-mx': 'Español (Latinoamérica)',
    'fr-fr': 'Français (France)'
};

const TIMING_CONFIG = {
    LANGUAGE_CHANGE_DURATION: 1000,
    STATE_RESET_DELAY: 200,
    MIN_INTERVAL_BETWEEN_OPERATIONS: 500
};

// ========================================
// ESTADO DEL SISTEMA DE IDIOMAS
// ========================================

const languageState = {
    current: 'en-us',
    isChanging: false,
    isSystemReady: false,
    lastStateApplication: 0,
    // ✅ NUEVO: Control de cancelación
    changeTimeout: null,
    pendingLanguage: null,
    isCancellable: false
};

// ========================================
// REFERENCIAS EXTERNAS
// ========================================

let getTranslation = null;
let onLanguageChangeCallback = null;

// ========================================
// INICIALIZACIÓN DEL SISTEMA DE IDIOMAS
// ========================================

function initLanguageManager() {
    return new Promise((resolve, reject) => {
        try {
            const savedLanguage = localStorage.getItem('app-language');
            if (savedLanguage && SUPPORTED_LANGUAGES.includes(savedLanguage)) {
                languageState.current = savedLanguage;
                languageState.isSystemReady = true;
                resolve();
            } else {
                // Detectar idioma del navegador
                detectBrowserLanguage()
                    .then(detectedLanguage => {
                        languageState.current = detectedLanguage;
                        localStorage.setItem('app-language', languageState.current);
                        languageState.isSystemReady = true;
                        resolve();
                    })
                    .catch(() => {
                        languageState.current = 'en-us';
                        localStorage.setItem('app-language', languageState.current);
                        languageState.isSystemReady = true;
                        resolve();
                    });
            }
        } catch (error) {
            console.error('❌ Error initializing Language Manager:', error);
            reject(error);
        }
    });
}

// ========================================
// ✅ NUEVA FUNCIÓN: CANCELAR CAMBIO DE IDIOMA
// ========================================

function cancelLanguageChange() {
    if (!languageState.isChanging) {
        return false;
    }

    console.log('🚫 Cancelling language change process');

    // Limpiar timeout si existe
    if (languageState.changeTimeout) {
        clearTimeout(languageState.changeTimeout);
        languageState.changeTimeout = null;
    }

    // Revertir al idioma anterior
    const previousLanguage = languageState.current;
    revertLanguageChange(previousLanguage);

    // Resetear estados
    languageState.isChanging = false;
    languageState.pendingLanguage = null;
    languageState.isCancellable = false;

    console.log('✅ Language change cancelled, reverted to:', previousLanguage);
    return true;
}

// ========================================
// DETECCIÓN DE IDIOMA DEL NAVEGADOR
// ========================================

function detectBrowserLanguage() {
    return new Promise(resolve => {
        try {
            const browserLang = navigator.language || navigator.userLanguage || 'en-US';
            
            // Intentar usar el detector PHP si está disponible
            fetch('config/language-detector.php', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ browserLanguage: browserLang })
            })
            .then(response => {
                if (response.ok) {
                    return response.json();
                }
                throw new Error('Response not ok');
            })
            .then(data => {
                const detected = data.detectedLanguage || 'en-us';
                resolve(SUPPORTED_LANGUAGES.includes(detected) ? detected : 'en-us');
            })
            .catch(() => {
                // Fallback: detectar manualmente
                const manualDetection = detectLanguageManually(browserLang);
                resolve(manualDetection);
            });
        } catch (error) {
            resolve('en-us');
        }
    });
}

function detectLanguageManually(browserLang) {
    const langCode = browserLang.toLowerCase();
    
    if (langCode.startsWith('es')) {
        return 'es-mx';
    } else if (langCode.startsWith('fr')) {
        return 'fr-fr';
    } else {
        return 'en-us';
    }
}

// ========================================
// GESTIÓN DE IDIOMAS ACTUALIZADA
// ========================================

function setLanguage(language) {
    if (languageState.isChanging || language === languageState.current) {
        return Promise.resolve(false);
    }
    
    const previousLanguage = languageState.current;
    languageState.isChanging = true;
    languageState.pendingLanguage = language;
    languageState.isCancellable = true; // ✅ NUEVO: Marcar como cancelable

    console.log('🌐 Setting language:', language);
    setupLanguageLoadingUI(language, previousLanguage);

    return performLanguageChange(language)
        .then(() => {
            // Solo aplicar si no fue cancelado
            if (languageState.isChanging && languageState.pendingLanguage === language) {
                if (SUPPORTED_LANGUAGES.includes(language)) {
                    languageState.current = language;
                    localStorage.setItem('app-language', language);
                    completeLanguageChange(language);
                    
                    // Notificar al callback si existe
                    if (onLanguageChangeCallback && typeof onLanguageChangeCallback === 'function') {
                        onLanguageChangeCallback();
                    }

                    // Disparar evento de cambio de idioma
                    const event = new CustomEvent('languageChanged', {
                        detail: { language: language, previousLanguage: previousLanguage }
                    });
                    document.dispatchEvent(event);
                    
                    return true;
                } else {
                    console.warn(`Attempted to set unsupported language: ${language}`);
                    revertLanguageChange(previousLanguage);
                    return false;
                }
            } else {
                console.log('🚫 Language change was cancelled during process');
                return false;
            }
        })
        .catch(error => {
            console.error('Error changing language:', error);
            revertLanguageChange(previousLanguage);
            return false;
        })
        .finally(() => {
            setTimeout(() => {
                languageState.isChanging = false;
                languageState.pendingLanguage = null;
                languageState.isCancellable = false;
            }, 100);
        });
}

function performLanguageChange(language) {
    return new Promise((resolve, reject) => {
        // ✅ NUEVO: Guardar referencia del timeout para poder cancelarlo
        languageState.changeTimeout = setTimeout(() => {
            // Verificar si el cambio no fue cancelado
            if (languageState.isChanging && languageState.pendingLanguage === language) {
                const isValid = validateLanguageChange(language);
                if (!isValid) {
                    reject(new Error('Language validation failed'));
                } else {
                    resolve();
                }
            } else {
                reject(new Error('Language change was cancelled'));
            }
            languageState.changeTimeout = null;
        }, TIMING_CONFIG.LANGUAGE_CHANGE_DURATION);
    });
}

function validateLanguageChange(language) {
    if (!SUPPORTED_LANGUAGES.includes(language)) {
        return false;
    }
    try {
        localStorage.setItem('language-test', 'test');
        localStorage.removeItem('language-test');
    } catch (e) {
        return false;
    }
    return true;
}

// ========================================
// GESTIÓN DE UI DE CARGA
// ========================================

function setupLanguageLoadingUI(newLanguage, previousLanguage) {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        if (linkLanguage === newLanguage) {
            link.classList.remove('active');
            link.classList.add('preview-active');
            addSpinnerToLink(link);
        } else {
            link.classList.remove('active', 'preview-active');
            link.classList.add('disabled-interactive');
        }
    });
}

function completeLanguageChange(language) {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        if (linkLanguage === language) {
            link.classList.remove('preview-active', 'disabled-interactive');
            link.classList.add('active');
            removeSpinnerFromLink(link);
        } else {
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
        }
    });
}

function revertLanguageChange(previousLanguage) {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        const linkLanguage = link.getAttribute('data-language');
        link.classList.remove('preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
        if (linkLanguage === previousLanguage) {
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

function applyLanguageStates() {
    const now = Date.now();
    
    if (now - languageState.lastStateApplication < TIMING_CONFIG.MIN_INTERVAL_BETWEEN_OPERATIONS) {
        return;
    }
    
    if (languageState.isChanging) {
        return;
    }
    
    languageState.lastStateApplication = now;
    
    try {
        const languageLinks = document.querySelectorAll('.menu-link[data-language]');
        languageLinks.forEach(link => {
            const linkLanguage = link.getAttribute('data-language');
            link.classList.remove('active', 'preview-active', 'disabled-interactive');
            removeSpinnerFromLink(link);
            
            if (linkLanguage === languageState.current) {
                link.classList.add('active');
            }
        });
        
    } catch (error) {
        console.error('❌ Error applying language states:', error);
    }
}

// ========================================
// ACTUALIZACIÓN DE ETIQUETAS
// ========================================

function updateLanguageLabel() {
    try {
        const languageLink = document.querySelector('.menu-link[data-toggle="language"] .menu-link-text span');
        if (!languageLink) return;

        if (getTranslation) {
            // Usar sistema de traducciones
            const languageText = getTranslation('language', 'menu');
            const currentLanguageTranslationKey = getLanguageTranslationKey(languageState.current);
            const currentLanguageText = getTranslation(currentLanguageTranslationKey, 'menu');
            const newText = `${languageText}: ${currentLanguageText}`;
            
            if (languageLink.textContent !== newText) {
                languageLink.textContent = newText;
                console.log('🌐 Updated language label:', newText);
            }
        } else {
            // Fallback sin traducciones
            const currentLanguageDisplay = LANGUAGE_DISPLAY_NAMES[languageState.current] || languageState.current;
            const newText = 'Language: ' + currentLanguageDisplay;
            if (languageLink.textContent !== newText) {
                languageLink.textContent = newText;
            }
        }
    } catch (error) {
        console.error('❌ Error updating language label:', error);
    }
}

function getLanguageTranslationKey(language) {
    const languageMap = {
        'en-us': 'english_us',
        'es-mx': 'spanish_mx',
        'fr-fr': 'french_fr'
    };
    return languageMap[language] || 'english_us';
}

// ========================================
// CONFIGURACIÓN DE EVENT LISTENERS
// ========================================

function setupLanguageEventListeners() {
    document.addEventListener('click', (e) => {
        const languageLink = e.target.closest('.menu-link[data-language]');
        if (languageLink) {
            const language = languageLink.getAttribute('data-language');
            if (language) {
                e.preventDefault();
                setLanguage(language);
            }
        }
    });
}

// ========================================
// LIMPIAR ESTADOS DE CARGA
// ========================================

function cleanLanguageLoadingStates() {
    const languageLinks = document.querySelectorAll('.menu-link[data-language]');
    languageLinks.forEach(link => {
        link.classList.remove('active', 'preview-active', 'disabled-interactive');
        removeSpinnerFromLink(link);
    });

    setTimeout(() => {
        applyLanguageStates();
    }, 50);
}

// ========================================
// ✅ FUNCIÓN PARA RESETEAR ESTADOS INTERNOS (LLAMADA POR MODULE-MANAGER)
// ========================================

function resetLanguageStates() {
    if (languageState.changeTimeout) {
        clearTimeout(languageState.changeTimeout);
        languageState.changeTimeout = null;
    }
    
    languageState.isChanging = false;
    languageState.pendingLanguage = null;
    languageState.isCancellable = false;
}

// ========================================
// FUNCIONES DE CONFIGURACIÓN
// ========================================

function setTranslationFunction(translationFn) {
    getTranslation = translationFn;
    
    if (languageState.isSystemReady) {
        setTimeout(() => {
            updateLanguageLabel();
        }, 100);
    }
}

function setLanguageChangeCallback(callback) {
    onLanguageChangeCallback = callback;
}

// ========================================
// GETTERS PÚBLICOS
// ========================================

function getCurrentLanguage() {
    return languageState.current;
}

function getSupportedLanguages() {
    return SUPPORTED_LANGUAGES.slice();
}

function getLanguageDisplayNames() {
    return { ...LANGUAGE_DISPLAY_NAMES };
}

function isLanguageChanging() {
    return languageState.isChanging;
}

function isLanguageSystemReady() {
    return languageState.isSystemReady;
}

function getLanguageState() {
    return {
        current: languageState.current,
        isChanging: languageState.isChanging,
        isSystemReady: languageState.isSystemReady,
        supportedLanguages: SUPPORTED_LANGUAGES,
        // ✅ NUEVO: Estados de cancelación
        isCancellable: languageState.isCancellable,
        pendingLanguage: languageState.pendingLanguage
    };
}

// ========================================
// FUNCIONES DE DEBUG
// ========================================

function debugLanguageManager() {
    console.group('🐛 Language Manager Debug');
    console.log('Current Language:', languageState.current);
    console.log('Is Changing:', languageState.isChanging);
    console.log('Is Cancellable:', languageState.isCancellable);
    console.log('Pending Language:', languageState.pendingLanguage);
    console.log('System Ready:', languageState.isSystemReady);
    console.log('Supported Languages:', SUPPORTED_LANGUAGES);
    
    const activeLanguageLinks = document.querySelectorAll('.menu-link[data-language].active');
    console.log('Active Language Links:', activeLanguageLinks.length, 
        Array.from(activeLanguageLinks).map(el => el.getAttribute('data-language')));
    
    console.log('Browser Language:', navigator.language);
    console.groupEnd();
}

// ========================================
// EXPORTS (SIMPLIFICADOS Y LIMPIOS)
// ========================================

export {
    initLanguageManager,
    setLanguage,
    getCurrentLanguage,
    getSupportedLanguages,
    getLanguageDisplayNames,
    isLanguageChanging,
    isLanguageSystemReady,
    getLanguageState,
    
    applyLanguageStates,
    updateLanguageLabel,
    cleanLanguageLoadingStates,
    setupLanguageEventListeners,
    
    setTranslationFunction,
    setLanguageChangeCallback,
    
    // ✅ FUNCIÓN PARA RESETEAR ESTADOS (LLAMADA POR MODULE-MANAGER)
    resetLanguageStates,
    
    detectBrowserLanguage,
    debugLanguageManager
};