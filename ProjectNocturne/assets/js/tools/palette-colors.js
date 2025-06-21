// ========== COLOR MANAGEMENT SYSTEM WITH IMPROVED TRANSLATIONS ==========

// ========== CONFIGURATION AND CONSTANTS ==========

const COLOR_SYSTEM_CONFIG = {
    currentColor: 'auto',
    currentTheme: 'system',
    storageKey: 'selected-text-color',
    activeColorKey: 'active-color-selection',
    activeColorSectionKey: 'active-color-last-section',
    recentColorsKey: 'recent-text-colors',
    maxRecentColors: 12,
    textSelectors: [
        '.tool-alarm span',
        '.tool-timer span',
        '.tool-stopwatch span',
        '.tool-worldClock span',
    ],
    gradientColors: [
        { name: 'midnight_express', hex: 'linear-gradient(90deg, #182848 0%, #4b6cb7 100%)' },
        { name: 'deep_amethyst', hex: 'linear-gradient(90deg, #3F2B96 0%, #A8C0FF 100%)' },
        { name: 'sky_ocean', hex: 'linear-gradient(90deg, #000851 0%, #1CB5E0 100%)' },
        { name: 'electric_dream', hex: 'linear-gradient(90deg, #3a47d5 0%, #00d2ff 100%)' },

        { name: 'emerald_forest', hex: 'linear-gradient(90deg, #008552 0%, #9ebd13 100%)' },
        { name: 'spring_mint', hex: 'linear-gradient(90deg, #92FE9D 0%, #00C9FF 100%)' },
        { name: 'citrus_burst', hex: 'linear-gradient(90deg, #3ad59f 0%, #f8ff00 100%)' },
        { name: 'golden_desert', hex: 'linear-gradient(90deg, #c67700 0%, #fcff9e 100%)' },

        { name: 'desert_rose', hex: 'linear-gradient(90deg, #d53369 0%, #daae51 100%)' },
        { name: 'vibrant_fusion', hex: 'linear-gradient(90deg, #FC466B 0%, #3F5EFB 100%)' },
        { name: 'magic_purple', hex: 'linear-gradient(90deg, #515ada 0%, #efd5ff 100%)' },
        { name: 'soft_lavender', hex: 'linear-gradient(90deg, #d9e7ff 0%, #e3ffe7 100%)' }
    ],
    enableCollapsibleSections: true,
    collapsedSectionsKey: 'collapsed-color-sections',
    enableGradientColorsSection: true,
    moveRecentToFront: true,
};

// ========== CENTRALIZED STATE ==========

const colorSystemState = {
    isInitialized: false,
    currentColor: COLOR_SYSTEM_CONFIG.currentColor,
    currentTheme: COLOR_SYSTEM_CONFIG.currentTheme,
    colorElements: new Map(),
    recentColors: [],
    isThemeChanging: false,
    collapsedSections: new Set()
};

// ========== TRANSLATION FUNCTIONS ==========

function getTranslation(key, category = 'tooltips') {
    if (typeof window.getTranslation === 'function') {
        return window.getTranslation(key, category);
    }
    return key;
}

function getUnavailableText() {
    return getTranslation('color_unavailable', 'color_system');
}

function getRecentColorsHeader() {
    return getTranslation('recent_colors', 'color_system');
}

function getMainColorsHeader() {
    return getTranslation('main_colors', 'color_system');
}

function getDefaultColorsHeader() {
    return getTranslation('default_colors', 'color_system');
}

function getNoRecentColorsText() {
    return getTranslation('no_recent_colors', 'color_system');
}

function getGradientColorsHeader() {
    return getTranslation('gradient_colors', 'color_system');
}

// ========== THEME VALIDATION FUNCTIONS ==========

function getCurrentTheme() {
    const html = document.documentElement;
    if (html.classList.contains('dark-mode')) {
        return 'dark';
    } else if (html.classList.contains('light-mode')) {
        return 'light';
    }
    return 'system';
}

function updateCurrentTheme() {
    const newTheme = getCurrentTheme();
    if (newTheme !== colorSystemState.currentTheme) {
        colorSystemState.currentTheme = newTheme;

        handleThemeColorCompatibility();

        return true;
    }
    return false;
}

function handleThemeColorCompatibility() {
    if (colorSystemState.isThemeChanging) return;
    colorSystemState.isThemeChanging = true;

    if (colorSystemState.currentColor === 'auto') {
        applyAutoColor();
    } else if (isGradientColor(colorSystemState.currentColor)) {
        applyColorToElements(colorSystemState.currentColor);
    }
    else {
        if (!isValidForTheme(colorSystemState.currentColor)) {
            console.log('耳 Current color', colorSystemState.currentColor, 'is not compatible with new theme, switching to auto');

            colorSystemState.currentColor = 'auto';
            applyAutoColor();

            localStorage.setItem(COLOR_SYSTEM_CONFIG.storageKey, 'auto');
            localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorKey, 'auto');
            localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorSectionKey, 'auto');

            const autoElement = document.querySelector('.color-content[data-color="auto"]');
            if (autoElement) {
                setActiveColorInAllSections(autoElement);
            }

            dispatchColorChangeEvent({ hex: 'auto', name: 'auto' });
        } else {
            applyColorToElements(colorSystemState.currentColor);
        }
    }

    setTimeout(() => {
        colorSystemState.isThemeChanging = false;
    }, 100);
}

function isValidForTheme(hex) {
    if (hex === 'auto') return true;
    if (isGradientColor(hex)) return true;

    try {
        const color = chroma(hex);
        const luminance = color.luminance();
        const currentTheme = colorSystemState.currentTheme;

        return currentTheme === 'dark'
            ? luminance >= 0.08
            : luminance <= 0.92;
    } catch (e) {
        console.warn('Error validating color for theme:', e);
        return true;
    }
}

function getAutoColor() {
    const currentTheme = colorSystemState.currentTheme;
    return currentTheme === 'dark' ? '#ffffff' : '#000000';
}

function applyAutoColor() {
    const autoColorHex = getAutoColor();
    applyColorToElements(autoColorHex);

    const autoElement = document.querySelector('.color-content[data-color="auto"]');
    if (autoElement) {
        setActiveColorInAllSections(autoElement);
    }
}

// ========== MAIN INITIALIZATION ==========

function initColorTextSystem() {
    if (colorSystemState.isInitialized) return;

    updateCurrentTheme();
    loadStoredData();
    loadCollapsedSectionsState();
    setupColorElements();
    attachEventListeners();
    applyStoredColor();
    setInitialActiveState();
    renderRecentColors('initial');
    renderGradientColors();
    setupThemeChangeListener();
    setupLanguageChangeListener();
    updateColorSectionHeaders();
    setupCollapsibleSections();

    setTimeout(() => {
        if (window.colorSearchManager && !window.colorSearchManager.getState().isInitialized) {
            window.colorSearchManager.init();
        }
    }, 100);

    document.addEventListener('searchColorSelected', (e) => {
        if (e.detail && e.detail.color) {
            if (isGradientColor(e.detail.color) || isValidForTheme(e.detail.color)) {
                setColor(e.detail.color, e.detail.name || e.detail.color, 'search', true);
            } else {
                console.warn('Invalid color or gradient for current theme:', e.detail.color);
            }
        }
    });

    colorSystemState.isInitialized = true;

    window.colorTextManager = {
        refresh: refreshColorSystem,
        debugInfo: debugColorSystem,
        getCurrentColor: getCurrentColor,
        getRecentColors: getRecentColors,
        clearRecentColors: clearRecentColors,
        setColor: setColor,
        resetToDefault: resetToDefault,
        getColorInfo: getColorInfo,
        createColorElementForSearch: createSearchColorElement,
        isValidForTheme: isValidForTheme,
        getCurrentTheme: () => colorSystemState.currentTheme,
        toggleSectionCollapse: toggleSectionCollapse
    };
}

// ========== THEME AND LANGUAGE CHANGE LISTENER ==========

function setupThemeChangeListener() {
    document.addEventListener('themeChanged', (e) => {
        if (updateCurrentTheme()) {
            updateColorTooltips();
            renderGradientColors();
            applyCollapsedSectionsState();
            setupCollapsibleSections();
        }
    });

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                if (updateCurrentTheme()) {
                    updateColorTooltips();
                    renderGradientColors();
                    applyCollapsedSectionsState();
                    setupCollapsibleSections();
                }
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['class']
    });
}

function setupLanguageChangeListener() {
    document.addEventListener('languageChanged', (e) => {
        console.log('倹 Language changed detected in color system:', e.detail);
        setTimeout(() => {
            updateColorSectionHeaders();
            updateColorTooltips();
            renderRecentColors('language_change');
            renderGradientColors();
            applyCollapsedSectionsState();
            setupCollapsibleSections();
        }, 500);
    });

    document.addEventListener('translationsApplied', (e) => {
        setTimeout(() => {
            updateColorSectionHeaders();
            updateColorTooltips();
        }, 100);
    });
}

// ========== HEADERS AND TOOLTIPS UPDATE ==========

function updateColorSectionHeaders() {
    const mainColorsHeader = document.querySelector('[data-section="main-colors"] .menu-content-header span:last-child');
    if (mainColorsHeader) {
        mainColorsHeader.textContent = getMainColorsHeader();
    }

    const recentColorsHeader = document.querySelector('[data-section="recent-colors"] .menu-content-header span:last-child');
    if (recentColorsHeader) {
        recentColorsHeader.textContent = getRecentColorsHeader();
    }

    const defaultColorsHeader = document.querySelector('[data-section="default-colors"] .menu-content-header span:last-child');
    if (defaultColorsHeader) {
        defaultColorsHeader.textContent = getDefaultColorsHeader();
    }

    if (COLOR_SYSTEM_CONFIG.enableGradientColorsSection) {
        const gradientColorsHeader = document.querySelector('[data-section="gradient-colors"] .menu-content-header span:last-child');
        if (gradientColorsHeader) {
            gradientColorsHeader.textContent = getGradientColorsHeader();
        }
    }
}

function updateColorTooltips() {
    document.querySelectorAll('.color-content').forEach(element => {
        updateSingleColorTooltip(element);
    });
}

function updateSingleColorTooltip(element) {
    const colorHex = element.getAttribute('data-hex');
    const colorName = element.getAttribute('data-color');
    const colorSection = element.getAttribute('data-section');
    const baseTooltipKey = element.getAttribute('data-translate');

    let tooltipText = '';

    if (isGradientColor(colorHex)) {
        const hexRegex = /#[0-9A-Fa-f]{6}|#[0-9A-Fa-f]{3}/g;
        const matches = colorHex.match(hexRegex);
        if (matches && matches.length >= 2) {
            const hex1 = matches[0];
            const hex2 = matches[1];
            tooltipText = `${getTranslation('linear_gradient_90deg', 'tooltips') || 'Linear Gradient 90ﾂｰ'}${getTranslation('color_separator', 'tooltips') || ': '}${hex1}, ${hex2}`;
        } else {
            tooltipText = getTranslation(baseTooltipKey, 'tooltips');
        }
    } else if (colorHex === 'auto') {
        tooltipText = getTranslation('auto', 'tooltips');
    } else {
        const isSearchGeneratedName = (colorName && (
            colorName.includes('Lighter') ||
            colorName.includes('Darker') ||
            colorName.includes('More Saturated') ||
            colorName.includes('Less Saturated') ||
            colorName.includes('Warmer') ||
            colorName.includes('Cooler') ||
            colorName.includes('Shade') ||
            colorName.includes('Tint') ||
            colorName.includes('Tone')
        ));

        if (colorSection === 'search' || (colorSection === 'recent' && isSearchGeneratedName)) {
            tooltipText = colorHex;
        } else {
            const translatedName = getTranslation(baseTooltipKey, 'tooltips');
            const isPredefinedColorName = (typeof window.getTranslation === 'function' && window.getTranslation(baseTooltipKey, 'tooltips') !== baseTooltipKey);

            if (isPredefinedColorName) {
                tooltipText = translatedName;
            } else {
                tooltipText = colorHex;
            }
        }

        if (element.classList.contains('color-content') && !isValidForTheme(colorHex)) {
            const unavailableText = getUnavailableText();
            if (unavailableText && unavailableText !== 'color_unavailable') {
                tooltipText += ` (${unavailableText})`;
            } else {
                tooltipText += ' (Not available)';
            }
        }
    }
    element.setAttribute('data-tooltip', tooltipText);
}

// ========== STORAGE MANAGEMENT ==========

function loadStoredData() {
    try {
        const storedColor = localStorage.getItem(COLOR_SYSTEM_CONFIG.storageKey);
        if (storedColor) {
            colorSystemState.currentColor = storedColor;
        } else {
            colorSystemState.currentColor = 'auto';
            localStorage.setItem(COLOR_SYSTEM_CONFIG.storageKey, 'auto');
            localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorKey, 'auto');
        }

        const storedRecents = localStorage.getItem(COLOR_SYSTEM_CONFIG.recentColorsKey);
        if (storedRecents) {
            colorSystemState.recentColors = JSON.parse(storedRecents);
        } else {
            const autoColorHex = getAutoColor();
            const autoColorName = autoColorHex === '#ffffff' ? 'white' : 'black';

            colorSystemState.recentColors = [{
                hex: autoColorHex,
                name: autoColorName,
                timestamp: Date.now()
            }];
            saveRecentColors();
        }
    } catch (error) {
        console.error('Error loading stored data for color system:', error);
        colorSystemState.currentColor = 'auto';
        const autoColorHex = getAutoColor();
        const autoColorName = autoColorHex === '#ffffff' ? 'white' : 'black';

        colorSystemState.recentColors = [{
            hex: autoColorHex,
            name: autoColorName,
            timestamp: Date.now()
        }];
    }
}

function saveColor(color, colorHex, colorNameForRecent, section) {
    try {
        localStorage.setItem(COLOR_SYSTEM_CONFIG.storageKey, color);
        localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorKey, colorHex);
        localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorSectionKey, section);
        addToRecentColors(colorHex, colorNameForRecent);
    } catch (error) {
        console.error('Error saving color:', error);
    }
}

function saveRecentColors() {
    try {
        localStorage.setItem(COLOR_SYSTEM_CONFIG.recentColorsKey, JSON.stringify(colorSystemState.recentColors));
    } catch (error) {
        console.error('Error saving recent colors:', error);
    }
}

// ========== IMPROVED RECENT COLORS MANAGEMENT ==========

function addToRecentColors(colorHex, colorNameForRecent, source = 'manual', forceMoveToFront = false) {
    let actualHex = colorHex;
    let actualName = colorNameForRecent;

    if (colorHex === 'auto') {
        actualHex = getAutoColor();
        actualName = getTranslation('auto', 'tooltips');
    }
    else if (isGradientColor(colorHex)) {
        const gradient = COLOR_SYSTEM_CONFIG.gradientColors.find(g => g.hex === colorHex);
        actualName = gradient ? gradient.name : colorNameForRecent;
    } else {
        const translatedNameCheck = getTranslation(colorNameForRecent, 'tooltips');
        if (translatedNameCheck === colorNameForRecent && colorNameForRecent !== colorHex) {
            actualName = colorHex;
        }
    }


    const existingIndex = colorSystemState.recentColors.findIndex(color => color.hex === actualHex);

    const shouldMoveToFront = forceMoveToFront || COLOR_SYSTEM_CONFIG.moveRecentToFront;

    let needsReRender = false;

    if (shouldMoveToFront && (existingIndex !== 0 || existingIndex === -1)) {
        if (existingIndex !== -1) {
            colorSystemState.recentColors.splice(existingIndex, 1);
        }

        colorSystemState.recentColors.unshift({
            hex: actualHex,
            name: actualName,
            timestamp: Date.now()
        });
        needsReRender = true;
    } else if (!shouldMoveToFront && existingIndex === -1) {
        colorSystemState.recentColors.unshift({
            hex: actualHex,
            name: actualName,
            timestamp: Date.now()
        });
        needsReRender = true;
    }

    if (needsReRender) {
        if (colorSystemState.recentColors.length > COLOR_SYSTEM_CONFIG.maxRecentColors) {
            colorSystemState.recentColors = colorSystemState.recentColors.slice(0, COLOR_SYSTEM_CONFIG.maxRecentColors);
        }
        saveRecentColors();
        renderRecentColors(source);
    }
}

function renderRecentColors(source = 'manual') {
    const recentSection = document.querySelector('[data-section="recent-colors"]');
    if (!recentSection) {
        return;
    }

    const recentContainer = recentSection.querySelector('.menu-content-general');
    if (!recentContainer) {
        return;
    }

    recentContainer.innerHTML = '';

    if (colorSystemState.recentColors.length === 0) {
        recentContainer.innerHTML = `<p style="color: #888; text-align: center; padding: 20px;">${getNoRecentColorsText()}</p>`;
        return;
    }

    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'color-wrapper';

    colorSystemState.recentColors.forEach(recentColor => {
        const colorElement = createRecentColorElement(recentColor);
        colorWrapper.appendChild(colorElement);
    });

    recentContainer.appendChild(colorWrapper);

    setTimeout(() => {
        setupRecentColorEvents();
        setInitialActiveState();

        if (typeof window.forceRefresh === 'function') {
            window.forceRefresh({ source: 'recentColorsRendered', preset: 'TOOLTIPS_ONLY' });
        }
    }, 10);
}

function createRecentColorElement(recentColor) {
    const colorContent = document.createElement('div');
    colorContent.className = 'color-content recent-color';
    colorContent.setAttribute('data-hex', recentColor.hex);
    colorContent.setAttribute('data-color', recentColor.name);
    colorContent.setAttribute('data-section', 'recent');

    const translatedNameCheck = getTranslation(recentColor.name, 'tooltips');
    if (translatedNameCheck === recentColor.name) {
        colorContent.setAttribute('data-translate', recentColor.hex);
    } else {
        colorContent.setAttribute('data-translate', recentColor.name);
    }
    colorContent.setAttribute('data-translate-category', 'tooltips');
    colorContent.setAttribute('data-translate-target', 'tooltip');

    updateSingleColorTooltip(colorContent);

    colorContent.removeAttribute('title');

    const colorDiv = document.createElement('div');
    colorDiv.className = 'color';

    if (isGradientColor(recentColor.hex)) {
        colorDiv.style.backgroundImage = recentColor.hex;
        colorDiv.classList.add('gradient-preview');
    } else {
        colorDiv.style.backgroundColor = recentColor.hex;
        if (isLightColor(recentColor.hex)) {
            colorDiv.style.border = '1px solid #00000020';
        }
    }

    colorContent.appendChild(colorDiv);
    return colorContent;
}

function setupRecentColorEvents() {
    const recentColorElements = document.querySelectorAll('.recent-color');

    recentColorElements.forEach(element => {
        if (element._recentColorHandlers) {
            element.removeEventListener('click', element._recentColorHandlers.click);
            element.removeEventListener('mouseenter', element._recentColorHandlers.mouseenter);
            element.removeEventListener('mouseleave', element._recentColorHandlers.mouseleave);
        }

        const colorHex = element.getAttribute('data-hex');
        const colorName = element.getAttribute('data-color');
        const colorSection = element.getAttribute('data-section');

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleColorClick(element, { hex: colorHex, name: colorName, section: colorSection });
        };

        const mouseEnterHandler = () => {
            if (!element.classList.contains('active')) {
                element.style.transform = 'scale(1.05)';
            }
        };

        const mouseLeaveHandler = () => {
            if (!element.classList.contains('active')) {
                element.style.transform = 'scale(1)';
            }
        };

        element.addEventListener('click', clickHandler);
        element.addEventListener('mouseenter', mouseEnterHandler);
        element.addEventListener('mouseleave', mouseLeaveHandler);

        element._recentColorHandlers = {
            click: clickHandler,
            mouseenter: mouseEnterHandler,
            mouseleave: mouseLeaveHandler
        };
    });
}

// ========== ELEMENT CONFIGURATION ==========

function setupColorElements() {
    const colorElements = document.querySelectorAll('.color-content:not(.recent-color):not(.search-color)');
    colorSystemState.colorElements.clear();

    colorElements.forEach(element => {
        const colorHex = element.getAttribute('data-hex');
        const colorName = element.getAttribute('data-color');
        const colorSection = element.getAttribute('data-section');

        if (colorHex && colorName && colorSection) {
            colorSystemState.colorElements.set(element, {
                hex: colorHex,
                name: colorName,
                section: colorSection,
                element: element
            });

            element.setAttribute('data-translate', colorName);
            element.setAttribute('data-translate-category', 'tooltips');
            element.setAttribute('data-translate-target', 'tooltip');

            updateSingleColorTooltip(element);

            element.removeAttribute('title');
        }
    });
}

function setInitialActiveState() {
    const activeColorHex = localStorage.getItem(COLOR_SYSTEM_CONFIG.activeColorKey) || COLOR_SYSTEM_CONFIG.currentColor;
    const activeColorSection = localStorage.getItem(COLOR_SYSTEM_CONFIG.activeColorSectionKey) || null;

    let activeElement = null;

    if (activeColorHex === 'auto') {
        activeElement = document.querySelector('.color-content[data-color="auto"]');
    } else {
        if (activeColorSection) {
            activeElement = document.querySelector(`.color-content[data-hex="${activeColorHex}"][data-section="${activeColorSection}"]`);
        }

        if (!activeElement) {
            if (activeColorSection === 'recent') {
                activeElement = document.querySelector(`.color-content.recent-color[data-hex="${activeColorHex}"]`);
            } else {
                activeElement = document.querySelector(`.color-content[data-hex="${activeColorHex}"]`);
            }
        }
    }

    setActiveColorInAllSections(activeElement);
}


// ========== GRADIENT COLORS RENDERING ==========

function renderGradientColors() {
    const mainColorsWrapper = document.querySelector('[data-colors-wrapper="main"]');
    if (!mainColorsWrapper) return;

    let gradientSection = document.querySelector('[data-section="gradient-colors"]');

    if (COLOR_SYSTEM_CONFIG.enableGradientColorsSection) {
        if (!gradientSection) {
            gradientSection = document.createElement('div');
            gradientSection.className = 'menu-content';
            gradientSection.setAttribute('data-section', 'gradient-colors');
            gradientSection.setAttribute('data-collapsible-section', 'true');

            gradientSection.innerHTML = `
                <div class="menu-content-header">
                    <div class="menu-content-header-primary">
                        <span class="material-symbols-rounded">gradient</span>
                        <span>${getTranslation('gradient_colors', 'color_system')}</span>
                    </div>
                </div>
                <div class="menu-content-general" id="gradient-colors-content" data-section-collapsed="false">
                    <div class="color-wrapper"></div>
                </div>
            `;
            mainColorsWrapper.appendChild(gradientSection);
        }

        const gradientContainer = gradientSection.querySelector('.menu-content-general .color-wrapper');
        if (!gradientContainer) return;

        gradientContainer.innerHTML = '';

        COLOR_SYSTEM_CONFIG.gradientColors.forEach(gradient => {
            const gradientElement = createGradientColorElement(gradient);
            gradientContainer.appendChild(gradientElement);
        });

        attachEventListeners();

        setInitialActiveState();

    } else {
        if (gradientSection) {
            gradientSection.remove();
        }
    }
}

function createGradientColorElement(gradient) {
    const colorContent = document.createElement('div');
    colorContent.className = 'color-content gradient-color';
    colorContent.setAttribute('data-hex', gradient.hex);
    colorContent.setAttribute('data-color', gradient.name);
    colorContent.setAttribute('data-section', 'gradient');

    colorContent.setAttribute('data-translate', gradient.name);
    colorContent.setAttribute('data-translate-category', 'tooltips');
    colorContent.setAttribute('data-translate-target', 'tooltip');

    updateSingleColorTooltip(colorContent);

    const colorDiv = document.createElement('div');
    colorDiv.className = 'color gradient-preview';
    colorDiv.style.backgroundImage = gradient.hex;

    colorContent.appendChild(colorDiv);

    return colorContent;
}

function isGradientColor(hex) {
    return hex.startsWith('linear-gradient') || hex.startsWith('radial-gradient');
}


// ========== EVENTS ==========

function attachEventListeners() {
    document.querySelectorAll('.color-content:not(.recent-color):not(.search-color)').forEach(element => {
        if (element._colorHandlers) {
            element.removeEventListener('click', element._colorHandlers.click);
            element.removeEventListener('mouseenter', element._colorHandlers.mouseenter);
            element.removeEventListener('mouseleave', element._colorHandlers.mouseleave);
        }

        const colorHex = element.getAttribute('data-hex');
        const colorName = element.getAttribute('data-color');
        const colorSection = element.getAttribute('data-section');

        const clickHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleColorClick(element, { hex: colorHex, name: colorName, section: colorSection });
        };

        const mouseEnterHandler = () => {
            if (!element.classList.contains('active')) {
                element.style.transform = 'scale(1.05)';
            }
        };

        const mouseLeaveHandler = () => {
            if (!element.classList.contains('active')) {
                element.style.transform = 'scale(1)';
            }
        };

        element.addEventListener('click', clickHandler);
        element.addEventListener('mouseenter', mouseEnterHandler);
        element.addEventListener('mouseleave', mouseLeaveHandler);

        element._colorHandlers = {
            click: clickHandler,
            mouseenter: mouseEnterHandler,
            mouseleave: mouseLeaveHandler
        };
    });

    setupRecentColorEvents();
    setupCollapsibleSectionEvents();
    setupMutationObserver();
    setupModuleEventListeners();
}

function setupMutationObserver() {
    const observer = new MutationObserver((mutations) => {
        let shouldReapplyColors = false;
        let shouldRefreshTooltips = false;

        mutations.forEach(mutation => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType !== Node.ELEMENT_NODE) return false;

                    const hasTextElements = COLOR_SYSTEM_CONFIG.textSelectors.some(selector => {
                        return node.matches && node.matches(selector) ||
                            node.querySelector && node.querySelector(selector);
                    });

                    const hasColorElements = node.matches && node.matches('.color-content') ||
                        node.querySelector && node.querySelector('.color-content');

                    if (hasTextElements) {
                        shouldReapplyColors = true;
                    }
                    if (hasColorElements) {
                        shouldRefreshTooltips = true;
                    }
                });
            }
        });

        if (shouldReapplyColors) {
            setTimeout(() => {
                if (colorSystemState.currentColor === 'auto') {
                    applyAutoColor();
                } else {
                    applyColorToElements(colorSystemState.currentColor);
                }
            }, 100);
        }
        if (shouldRefreshTooltips) {
            if (typeof window.forceRefresh === 'function') {
                window.forceRefresh({ source: 'colorSystemMutation', preset: 'TOOLTIPS_ONLY' });
            }
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-translate', 'data-translate-category', 'data-translate-target', 'data-tooltip', 'data-hex']
    });
}

function setupModuleEventListeners() {
    document.addEventListener('moduleActivated', (e) => {
        if (e.detail && e.detail.module === 'togglePaletteColors') {
            setTimeout(() => {
                refreshColorSystem();
            }, 100);
        }
    });

    document.addEventListener('textColorChanged', (e) => {
    });
}

// ========== COLOR CLICK HANDLING ==========

function handleColorClick(element, colorData) {
    if (!isGradientColor(colorData.hex) && colorData.hex !== 'auto' && !isValidForTheme(colorData.hex)) {
        console.warn('Color blocked for current theme:', colorData.hex);
        return;
    }

    colorSystemState.currentColor = colorData.hex;
    localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorKey, colorData.hex);
    localStorage.setItem(COLOR_SYSTEM_CONFIG.storageKey, colorData.hex);
    localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorSectionKey, colorData.section);

    if (colorData.hex === 'auto') {
        applyAutoColor();
    } else {
        applyColorToElements(colorData.hex);
        setTimeout(() => {
            setActiveColorInAllSections(element);
        }, 0);
    }

    addToRecentColors(colorData.hex, colorData.name, colorData.section);

    dispatchColorChangeEvent({ hex: colorData.hex, name: colorData.name });
}

function setActiveColorInAllSections(clickedElement) {
    document.querySelectorAll('.color-content').forEach(el => {
        el.classList.remove('active');
        el.style.transform = 'scale(1)';
    });

    if (clickedElement) {
        clickedElement.classList.add('active');
        clickedElement.style.transform = 'scale(1.1)';
    }
}

// ========== COLLAPSIBLE SECTIONS FUNCTIONALITY ==========

function setupCollapsibleSectionEvents() {
    document.querySelectorAll('.menu-content-header-secondary .collapse-btn').forEach(button => {
        if (button._collapseHandler) {
            button.removeEventListener('click', button._collapseHandler);
            delete button._collapseHandler;
        }
        const secondaryHeaderContainer = button.closest('.menu-content-header-secondary');
        if (secondaryHeaderContainer) {
            secondaryHeaderContainer.remove();
        }
    });

    if (!COLOR_SYSTEM_CONFIG.enableCollapsibleSections) {
        return;
    }

    const collapsibleHeaders = document.querySelectorAll('.menu-content[data-collapsible-section="true"]');
    collapsibleHeaders.forEach(sectionContainer => {
        const header = sectionContainer.querySelector('.menu-content-header');
        let secondaryHeader = header.querySelector('.menu-content-header-secondary');
        let collapseButton = header.querySelector('.collapse-btn');

        if (!secondaryHeader) {
            secondaryHeader = document.createElement('div');
            secondaryHeader.className = 'menu-content-header-secondary';
            header.appendChild(secondaryHeader);
        }

        if (!collapseButton) {
            collapseButton = document.createElement('button');
            collapseButton.className = 'collapse-btn';
            collapseButton.setAttribute('data-collapsible', 'true');
            collapseButton.innerHTML = '<span class="material-symbols-rounded expand-icon">expand_more</span>';
            secondaryHeader.appendChild(collapseButton);
        }

        if (collapseButton._collapseHandler) {
            collapseButton.removeEventListener('click', collapseButton._collapseHandler);
        }

        const handler = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const sectionId = sectionContainer.getAttribute('data-section');
            toggleSectionCollapse(sectionId);
        };
        collapseButton.addEventListener('click', handler);
        collapseButton._collapseHandler = handler;
    });
}


function setupCollapsibleSections() {
    setupCollapsibleSectionEvents();
    applyCollapsedSectionsState();
}

function toggleSectionCollapse(sectionId) {
    if (!COLOR_SYSTEM_CONFIG.enableCollapsibleSections) return;

    const sectionContainer = document.querySelector(`.menu-content[data-section="${sectionId}"]`);
    if (!sectionContainer) return;

    const contentElement = sectionContainer.querySelector('.menu-content-general');
    const collapseButton = sectionContainer.querySelector('.collapse-btn');
    const expandIcon = collapseButton ? collapseButton.querySelector('.expand-icon') : null;

    if (!contentElement || !collapseButton || !expandIcon) return;

    const isCollapsed = contentElement.getAttribute('data-section-collapsed') === 'true';

    if (isCollapsed) {
        contentElement.classList.remove('collapsed');
        contentElement.classList.add('expanded');
        contentElement.setAttribute('data-section-collapsed', 'false');
        collapseButton.setAttribute('aria-expanded', 'true');
        expandIcon.style.transform = 'rotate(0deg)';
        colorSystemState.collapsedSections.delete(sectionId);
    } else {
        contentElement.classList.remove('expanded');
        contentElement.classList.add('collapsed');
        contentElement.setAttribute('data-section-collapsed', 'true');
        collapseButton.setAttribute('aria-expanded', 'false');
        expandIcon.style.transform = 'rotate(-90deg)';
        colorSystemState.collapsedSections.add(sectionId);
    }

    saveCollapsedSectionsState();
}

function loadCollapsedSectionsState() {
    if (!COLOR_SYSTEM_CONFIG.enableCollapsibleSections) return;
    try {
        const storedCollapsed = localStorage.getItem(COLOR_SYSTEM_CONFIG.collapsedSectionsKey);
        if (storedCollapsed) {
            colorSystemState.collapsedSections = new Set(JSON.parse(storedCollapsed));
        } else {
            colorSystemState.collapsedSections = new Set();
        }
    } catch (error) {
        console.error('Error loading collapsed sections state:', error);
        colorSystemState.collapsedSections = new Set();
    }
}

function saveCollapsedSectionsState() {
    if (!COLOR_SYSTEM_CONFIG.enableCollapsibleSections) return;
    try {
        localStorage.setItem(COLOR_SYSTEM_CONFIG.collapsedSectionsKey, JSON.stringify(Array.from(colorSystemState.collapsedSections)));
    }
    catch (error) {
        console.error('Error saving collapsed sections state:', error);
    }
}

function applyCollapsedSectionsState() {
    if (!COLOR_SYSTEM_CONFIG.enableCollapsibleSections) return;

    setTimeout(() => {
        document.querySelectorAll('.menu-content[data-collapsible-section="true"]').forEach(sectionContainer => {
            const sectionId = sectionContainer.getAttribute('data-section');
            const contentElement = sectionContainer.querySelector('.menu-content-general');
            const collapseButton = sectionContainer.querySelector('.collapse-btn');
            const expandIcon = collapseButton ? collapseButton.querySelector('.expand-icon') : null;

            if (contentElement && collapseButton && expandIcon) {
                if (colorSystemState.collapsedSections.has(sectionId)) {
                    contentElement.classList.add('collapsed');
                    contentElement.classList.remove('expanded');
                    contentElement.setAttribute('data-section-collapsed', 'true');
                    collapseButton.setAttribute('aria-expanded', 'false');
                    expandIcon.style.transform = 'rotate(-90deg)';
                } else {
                    contentElement.classList.remove('collapsed');
                    contentElement.classList.add('expanded');
                    contentElement.setAttribute('data-section-collapsed', 'false');
                    collapseButton.setAttribute('aria-expanded', 'true');
                    expandIcon.style.transform = 'rotate(0deg)';
                }
            }
        });
    }, 100);
}

// ========== COLOR APPLICATION ==========

function applyStoredColor() {
    if (colorSystemState.currentColor === 'auto') {
        applyAutoColor();
    } else {
        applyColorToElements(colorSystemState.currentColor);
    }
}

function applyColorToElements(colorValue = null) {
    const finalColorValue = colorValue || (colorSystemState.currentColor === 'auto' ? getAutoColor() : colorSystemState.currentColor);

    COLOR_SYSTEM_CONFIG.textSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            if (isGradientColor(finalColorValue)) {
                element.style.color = '';
                element.style.backgroundImage = finalColorValue;
                element.style.webkitBackgroundClip = 'text';
                element.style.backgroundClip = 'text';
                element.style.webkitTextFillColor = 'transparent';
                element.style.color = 'transparent';
            } else {
                element.style.backgroundImage = '';
                element.style.webkitBackgroundClip = '';
                element.style.backgroundClip = '';
                element.style.webkitTextFillColor = '';
                element.style.color = finalColorValue;
            }
        });
    });
}

function getElementCount() {
    let count = 0;
    COLOR_SYSTEM_CONFIG.textSelectors.forEach(selector => {
        count += document.querySelectorAll(selector).length;
    });
    return count;
}

// ========== UTILITIES ==========

function isLightColor(hex) {
    if (typeof chroma !== 'undefined') {
        try {
            return chroma(hex).luminance() > 0.7;
        } catch (e) {
        }
    }
    const r = parseInt(hex.substr(1, 2), 16);
    const g = parseInt(hex.substr(3, 2), 16);
    const b = parseInt(hex.substr(5, 2), 16);
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.7;
}

// ========== CUSTOM EVENTS ==========

function dispatchColorChangeEvent(colorData) {
    const event = new CustomEvent('textColorChanged', {
        detail: {
            color: colorData.hex,
            colorName: colorData.name,
            timestamp: Date.now(),
            recentColors: [...colorSystemState.recentColors],
            currentTheme: colorSystemState.currentTheme
        }
    });
    document.dispatchEvent(event);
}

// ========== PUBLIC API ==========

function getCurrentColor() {
    return colorSystemState.currentColor;
}

function getRecentColors() {
    return [...colorSystemState.recentColors];
}

function clearRecentColors() {
    colorSystemState.recentColors = [];
    saveRecentColors();
    renderRecentColors();
}

function setColor(colorHex, colorName = 'custom_color', source = 'manual', forceMoveToFront = false) {
    if (!isGradientColor(colorHex) && colorHex !== 'auto' && !isValidForTheme(colorHex)) {
        console.warn('Color blocked for current theme:', colorHex);
        return false;
    }

    if (isValidHexColor(colorHex) || colorHex === 'auto' || isGradientColor(colorHex)) {
        colorSystemState.currentColor = colorHex;

        localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorKey, colorHex);
        localStorage.setItem(COLOR_SYSTEM_CONFIG.storageKey, colorHex);
        localStorage.setItem(COLOR_SYSTEM_CONFIG.activeColorSectionKey, source);

        if (colorHex === 'auto') {
            applyAutoColor();
        } else {
            applyColorToElements(colorHex);
            const activeElement = document.querySelector(`.color-content[data-hex="${colorHex}"][data-section="${source}"]`) ||
                document.querySelector(`.color-content[data-hex="${colorHex}"]`);
            if (activeElement) {
                setActiveColorInAllSections(activeElement);
            }
        }

        addToRecentColors(colorHex, colorName, source, forceMoveToFront);

        dispatchColorChangeEvent({ hex: colorHex, name: colorName });
        return true;
    }
    return false;
}

function resetToDefault() {
    setColor('auto', 'auto');
}

function addTextSelector(selector) {
    if (!COLOR_SYSTEM_CONFIG.textSelectors.includes(selector)) {
        COLOR_SYSTEM_CONFIG.textSelectors.push(selector);
        if (colorSystemState.currentColor === 'auto') {
            applyAutoColor();
        } else {
            applyColorToElements();
        }
    }
}

function removeTextSelector(selector) {
    const index = COLOR_SYSTEM_CONFIG.textSelectors.indexOf(selector);
    if (index > -1) {
        COLOR_SYSTEM_CONFIG.textSelectors.splice(index, 1);
    }
}

function isValidHexColor(hex) {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
}

function getColorInfo() {
    const activeElement = document.querySelector('.color-content.active');
    let activeColorName = null;

    if (activeElement) {
        if (activeElement.hasAttribute('data-color') && !activeElement.classList.contains('recent-color') && !activeElement.classList.contains('search-color')) {
            activeColorName = activeElement.getAttribute('data-color');
        } else {
            activeColorName = activeElement.getAttribute('data-color') || activeElement.getAttribute('data-hex');
        }
    }

    return {
        currentColor: colorSystemState.currentColor,
        activeColorName: activeColorName,
        totalElements: getElementCount(),
        totalColors: colorSystemState.colorElements.size + (COLOR_SYSTEM_CONFIG.enableGradientColorsSection ? COLOR_SYSTEM_CONFIG.gradientColors.length : 0),
        recentColorsCount: colorSystemState.recentColors.length,
        recentColors: [...colorSystemState.recentColors],
        currentTheme: colorSystemState.currentTheme,
        isThemeChanging: colorSystemState.isThemeChanging,
        isInitialized: colorSystemState.isInitialized,
        collapsibleSectionsEnabled: COLOR_SYSTEM_CONFIG.enableCollapsibleSections,
        collapsedSections: Array.from(colorSystemState.collapsedSections),
        gradientColorsSectionEnabled: COLOR_SYSTEM_CONFIG.enableGradientColorsSection
    };
}

function createSearchColorElement(colorData) {
    const colorContent = document.createElement('div');
    colorContent.className = 'color-content search-color';
    colorContent.setAttribute('data-hex', colorData.hex);
    colorContent.setAttribute('data-color', colorData.name || colorData.hex);
    colorContent.setAttribute('data-section', 'search');

    // FIX: The tooltip for search results should always be the hex code.
    // We set data-translate to the hex value, as tooltip-controller prioritizes this attribute.
    colorContent.setAttribute('data-translate', colorData.hex);

    colorContent.setAttribute('data-translate-category', 'tooltips');
    colorContent.setAttribute('data-translate-target', 'tooltip');

    updateSingleColorTooltip(colorContent);

    colorContent.removeAttribute('title');

    const colorDiv = document.createElement('div');
    colorDiv.className = 'color';

    if (isGradientColor(colorData.hex)) {
        colorDiv.style.backgroundImage = colorData.hex;
        colorDiv.classList.add('gradient-preview');
    } else {
        colorDiv.style.backgroundColor = colorData.hex;
        if (isLightColor(colorData.hex)) {
            colorDiv.style.border = '1px solid #00000020';
        }
    }

    colorContent.appendChild(colorDiv);
    return colorContent;
}

// ========== DEBUGGING ==========

function debugColorSystem() {
    console.group('耳 Color Text Manager Debug (Enhanced with Translations)');
    console.log('Current color:', colorSystemState.currentColor);
    console.log('Current theme:', colorSystemState.currentTheme);
    console.log('Auto color would be:', getAutoColor());
    console.log('Is theme changing:', colorSystemState.isThemeChanging);
    console.log('Total solid color elements (main/default):', colorSystemState.colorElements.size);
    console.log('Total gradient colors (config):', COLOR_SYSTEM_CONFIG.gradientColors.length);
    console.log('Text selectors:', COLOR_SYSTEM_CONFIG.textSelectors);
    console.log('Elements affected:', getElementCount());
    console.log('Recent colors:', colorSystemState.recentColors);
    console.log('Move Recent to Front enabled:', COLOR_SYSTEM_CONFIG.moveRecentToFront);
    console.log('Last active color HEX (from localStorage):', localStorage.getItem(COLOR_SYSTEM_CONFIG.activeColorKey));
    console.log('Last active color section (from localStorage):', localStorage.getItem(COLOR_SYSTEM_CONFIG.activeColorSectionKey));

    console.group('Collapsible Sections Debug');
    console.log('Collapsible sections enabled:', COLOR_SYSTEM_CONFIG.enableCollapsibleSections);
    console.log('Currently collapsed sections:', Array.from(colorSystemState.collapsedSections));
    document.querySelectorAll('.menu-content[data-collapsible-section="true"]').forEach(section => {
        const sectionId = section.getAttribute('data-section');
        const content = section.querySelector('.menu-content-general');
        const button = section.querySelector('.collapse-btn');
        console.log(`  Section "${sectionId}":`, {
            isCollapsed: content ? content.classList.contains('collapsed') : 'N/A',
            ariaExpanded: button ? button.getAttribute('aria-expanded') : 'N/A',
            iconTransform: button ? button.querySelector('.expand-icon')?.style.transform : 'N/A'
        });
    });
    console.groupEnd();

    console.group('Gradient Colors Section Debug');
    console.log('Gradient colors section enabled:', COLOR_SYSTEM_CONFIG.enableGradientColorsSection);
    const gradientSectionElement = document.querySelector('[data-section="gradient-colors"]');
    console.log('Gradient section element present in DOM:', !!gradientSectionElement);
    console.groupEnd();


    console.group('Recent Colors Analysis');
    colorSystemState.recentColors.forEach((color, index) => {
        console.log(`Recent ${index}:`, {
            hex: color.hex,
            name: color.name,
            isGradient: isGradientColor(color.hex),
            isValidForCurrentTheme: isGradientColor(color.hex) || isValidForTheme(color.hex),
            timestamp: new Date(color.timestamp).toLocaleTimeString()
        });
    });
    console.groupEnd();

    const recentElements = document.querySelectorAll('.recent-color');
    recentElements.forEach((el, index) => {
        console.log(`Recent Element ${index}:`, {
            hex: el.getAttribute('data-hex'),
            name: el.getAttribute('data-color'),
            translateKey: el.getAttribute('data-translate'),
            hasActive: el.classList.contains('active'),
            hasHandlers: !!el._recentColorHandlers,
            tooltip: el.getAttribute('data-tooltip'),
            isGradient: isGradientColor(el.getAttribute('data-hex'))
        });
    });

    const searchElements = document.querySelectorAll('.search-color');
    searchElements.forEach((el, index) => {
        console.log(`Search Result ${index}:`, {
            hex: el.getAttribute('data-hex'),
            name: el.getAttribute('data-color'),
            translateKey: el.getAttribute('data-translate'),
            hasActive: el.classList.contains('active'),
            isValidForTheme: isGradientColor(el.getAttribute('data-hex')) || isValidForTheme(el.getAttribute('data-hex')),
            tooltip: el.getAttribute('data-tooltip'),
            isGradient: isGradientColor(el.getAttribute('data-hex'))
        });
    });

    console.log('Color info:', getColorInfo());
    console.groupEnd();
}

// ========== RESET AND CLEANUP ==========

function destroyColorSystem() {
    colorSystemState.colorElements.forEach((colorData, element) => {
        if (element._colorHandlers) {
            element.removeEventListener('click', element._colorHandlers.click);
            element.removeEventListener('mouseenter', element._colorHandlers.mouseenter);
            element.removeEventListener('mouseleave', element._colorHandlers.mouseleave);
            delete element._colorHandlers;
        }
    });

    document.querySelectorAll('.recent-color').forEach(element => {
        if (element._recentColorHandlers) {
            element.removeEventListener('click', element._recentColorHandlers.click);
            element.removeEventListener('mouseenter', element._recentColorHandlers.mouseenter);
            element.removeEventListener('mouseleave', element._recentColorHandlers.mouseleave);
            delete element._recentColorHandlers;
        }
    });

    document.querySelectorAll('.gradient-color').forEach(element => {
        if (element._colorHandlers) {
            element.removeEventListener('click', element._colorHandlers.click);
            element.removeEventListener('mouseenter', element._colorHandlers.mouseenter);
            element.removeEventListener('mouseleave', element._colorHandlers.mouseleave);
            delete element._colorHandlers;
        }
    });

    document.querySelectorAll('.collapse-btn').forEach(button => {
        if (button._collapseHandler) {
            button.removeEventListener('click', button._collapseHandler);
            delete button._collapseHandler;
        }
    });


    colorSystemState.colorElements.clear();
    colorSystemState.isInitialized = false;
    if (window.colorTextManager) {
        delete window.colorTextManager;
    }
}

function refreshColorSystem() {
    updateCurrentTheme();
    setupColorElements();
    updateColorSectionHeaders();
    updateColorTooltips();

    if (colorSystemState.currentColor === 'auto') {
        applyAutoColor();
    } else {
        applyColorToElements();
    }
    setInitialActiveState();
    renderRecentColors('refresh');
    renderGradientColors();
    setupCollapsibleSections();

    if (window.colorSearchManager) {
        window.colorSearchManager.refresh();
    }
    if (typeof window.forceRefresh === 'function') {
        window.forceRefresh({ source: 'colorSystemRefresh', preset: 'TOOLTIPS_ONLY' });
    }
}

// ========== GLOBAL API FOR DEBUGGING ==========

window.debugColorSystem = () => {
    if (window.colorTextManager) {
        window.colorTextManager.debugInfo();
    } else {
        console.warn('ColorTextManager not initialized.');
    }
};

window.clearRecentColors = () => {
    if (window.colorTextManager) {
        window.colorTextManager.clearRecentColors();
    } else {
        console.warn('ColorTextManager not initialized.');
    }
};

document.addEventListener('DOMContentLoaded', initColorTextSystem);

// ========== EXPORTS ==========

export {
    initColorTextSystem,
    refreshColorSystem,
    getCurrentColor,
    getRecentColors,
    clearRecentColors,
    setColor,
    resetToDefault,
    getColorInfo,
    debugColorSystem,
    isValidForTheme,
    getAutoColor,
    updateColorSectionHeaders,
    updateColorTooltips,
    isGradientColor,
    toggleSectionCollapse
};