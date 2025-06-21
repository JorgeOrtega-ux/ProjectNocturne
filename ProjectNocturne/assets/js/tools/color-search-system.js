// ========== ENHANCED COLOR SEARCH SYSTEM - ONLY SEARCHED COLOR VARIATIONS ==========

// ========== CONFIGURATION AND CONSTANTS ==========

const COLOR_SEARCH_CONFIG = {
    searchInput: '.menu-paletteColors .search-content-text input',
    mainColorsWrapper: '[data-colors-wrapper="main"]',
    searchColorsWrapper: '[data-colors-wrapper="search"]',
    maxResultsPerSection: 18,
    debounceDelay: 300,
    colorDatabase: {
        'red': '#ff0000',
        'green': '#00ff00',
        'blue': '#0000ff',
        'yellow': '#ffff00',
        'orange': '#ffa500',
        'purple': '#800080',
        'violet': '#8a2be2',
        'pink': '#ffc0cb',
        'black': '#000000',
        'white': '#ffffff',
        'gray': '#808080',
        'brown': '#a52a2a',
        'turquoise': '#40e0d0',
        'cyan': '#00ffff',
        'magenta': '#ff00ff',
        'lime': '#00ff00',
        'olive': '#808000',
        'navy': '#000080',
        'maroon': '#800000',
        'silver': '#c0c0c0',
        'gold': '#ffd700',
        'coral': '#ff7f50',
        'salmon': '#fa8072',
        'aqua': '#00ffff',
        'beige': '#f5f5dc',
        'cream': '#fffdd0',
        'lavender': '#e6e6fa',
        'mint': '#98fb98',
        'peach': '#ffcba4',
        'indigo': '#4b0082',
        'cerulean': '#007ba7',
        'emerald': '#50c878',
        'jade': '#00a86b',
        'teal': '#008080',
        'aquamarine': '#7fffd4',
        'chartreuse': '#7fff00',
        'vermilion': '#e34234',
        'amber': '#ffbf00',
        'sienna': '#a0522d'
    }
};

// ========== SEARCH SYSTEM STATE ==========

const searchState = {
    isInitialized: false,
    searchTimeout: null,
    currentQuery: '',
    currentResults: null,
    isSearching: false
};

// ========== TRANSLATION FUNCTIONS ==========

function getTranslation(key, category = 'tooltips') {
    if (typeof window.getTranslation === 'function') {
        return window.getTranslation(key, category);
    }
    return key;
}

function getSearchSectionTranslation(key) {
    return getTranslation(key, 'search_sections');
}

function getUnavailableText() {
    return getTranslation('color_unavailable', 'search');
}

function getSearchPlaceholder() {
    return getTranslation('search_placeholder', 'search');
}

function getNoResultsText() {
    return getTranslation('no_results', 'search');
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

function isValidForTheme(hex) {
    if (typeof window.colorTextManager === 'object' && typeof window.colorTextManager.isValidForTheme === 'function') {
        return window.colorTextManager.isValidForTheme(hex);
    }

    // Fallback if palette-colors.js is not loaded or function is not available
    if (hex === 'auto') return true;
    if (hex.startsWith('linear-gradient') || hex.startsWith('radial-gradient')) return true;

    try {
        const color = chroma(hex);
        const luminance = color.luminance();
        const currentTheme = getCurrentTheme();

        return currentTheme === 'dark'
            ? luminance >= 0.08
            : luminance <= 0.92;
    } catch (e) {
        console.warn('Error validating color for theme (fallback):', e);
        return true;
    }
}

function getAutoColor() {
    if (typeof window.colorTextManager === 'object' && typeof window.colorTextManager.getAutoColor === 'function') {
        return window.colorTextManager.getAutoColor();
    }
    // Fallback
    const currentTheme = getCurrentTheme();
    return currentTheme === 'dark' ? '#ffffff' : '#000000';
}

// ========== SECTION VISIBILITY MANAGEMENT ==========

function hideOtherColorSections() {
    const mainWrapper = document.querySelector(COLOR_SEARCH_CONFIG.mainColorsWrapper);
    if (mainWrapper) {
        mainWrapper.classList.remove('active');
        mainWrapper.classList.add('disabled');
    }
}

function showOtherColorSections() {
    const mainWrapper = document.querySelector(COLOR_SEARCH_CONFIG.mainColorsWrapper);
    if (mainWrapper) {
        mainWrapper.classList.remove('disabled');
        mainWrapper.classList.add('active');
    }
}

// ========== SEARCH SYSTEM INITIALIZATION ==========

function initColorSearch() {
    if (searchState.isInitialized) return;

    if (typeof chroma === 'undefined') {
        console.warn('Chroma.js not loaded. Color search will not function.');
        return;
    }

    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (searchWrapper) {
        searchWrapper.classList.add('disabled');
        searchWrapper.classList.remove('active');
    } else {
        console.warn('Search colors wrapper not found. Search functionality might be limited.');
    }

    setupSearchInput();
    setupClickOutsideHandler();

    searchState.isInitialized = true;
}

function setupSearchInput() {
    const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
    if (!searchInput) {
        return;
    }

    updateSearchPlaceholder();

    searchInput.addEventListener('input', handleSearchInput);
    searchInput.addEventListener('focus', handleSearchFocus);
    searchInput.addEventListener('blur', handleSearchBlur);
    searchInput.addEventListener('keydown', handleSearchKeydown);
}

function updateSearchPlaceholder() {
    const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
    if (searchInput && !searchInput.hasAttribute('data-translate-target')) {
        searchInput.placeholder = getSearchPlaceholder();
    }
}

function setupClickOutsideHandler() {
    document.addEventListener('click', (e) => {
        const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
        const paletteMenu = e.target.closest('.menu-paletteColors');

        if (!searchInput || !paletteMenu) return;

        const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
        const clickedInsideSearchInput = searchInput.contains(e.target);
        const clickedInsideSearchResults = searchResultsWrapper && searchResultsWrapper.contains(e.target);

        if (paletteMenu.contains(e.target) && !clickedInsideSearchInput && !clickedInsideSearchResults) {
            if (searchState.currentQuery) {
                clearSearch();
            }
        } else if (!paletteMenu.contains(e.target)) {
            clearSearch();
        }
    });
}

function handleSearchInput(e) {
    const query = e.target.value.trim();

    if (searchState.searchTimeout) {
        clearTimeout(searchState.searchTimeout);
    }

    if (!query) {
        showOtherColorSections();
        hideSearchSectionWrapper();
        searchState.currentQuery = '';
        searchState.currentResults = null;
        return;
    }

    searchState.searchTimeout = setTimeout(() => {
        performSearch(query);
    }, COLOR_SEARCH_CONFIG.debounceDelay);
}

function handleSearchFocus(e) {
    const query = e.target.value.trim();
    if (query && !searchState.currentResults) {
        performSearch(query);
    }
}

function handleSearchBlur(e) {
    setTimeout(() => {
        const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
        const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);

        if (!searchInput || !searchResultsWrapper) return;

        const relatedTarget = e.relatedTarget;
        const clickedInsideSearchResults = relatedTarget && searchResultsWrapper.contains(relatedTarget);

        if (!searchInput.value.trim() && !clickedInsideSearchResults) {
            clearSearch();
        }
    }, 150);
}

function handleSearchKeydown(e) {
    if (e.key === 'Escape') {
        clearSearch();
        e.target.blur();
    } else if (e.key === 'Enter') {
        e.preventDefault();
        const query = e.target.value.trim();
        if (query) {
            performSearch(query);
        } else {
            clearSearch();
        }
    }
}

// ========== MAIN SEARCH LOGIC - ONLY SEARCHED COLOR VARIATIONS ==========

function performSearch(query) {
    if (!query) {
        showOtherColorSections();
        hideSearchSectionWrapper();
        searchState.currentQuery = '';
        searchState.currentResults = null;
        return;
    }

    searchState.isSearching = true;
    searchState.currentQuery = query;

    try {
        const searchResults = processSearchQuery(query);
        searchState.currentResults = searchResults;

        if (hasValidResults(searchResults)) {
            hideOtherColorSections();
            displaySearchResults(searchResults);
            showSearchSectionWrapper();
        } else {
            hideOtherColorSections();
            displaySearchError(getNoResultsText() + ' "' + searchState.currentQuery + '"');
            showSearchSectionWrapper();
        }
    } catch (error) {
        console.error('Error performing search:', error);
        showOtherColorSections();
        displaySearchError(getTranslation('search_error', 'search'));
        hideSearchSectionWrapper();
    } finally {
        searchState.isSearching = false;
        if (typeof window.forceRefresh === 'function') {
            window.forceRefresh({ source: 'searchUpdate', preset: 'TOOLTIPS_ONLY' });
        }
    }
}

function processSearchQuery(query) {
    const results = {
        directMatch: null,
        lightVariations: [],
        darkVariations: [],
        saturatedVariations: [],
        desaturatedVariations: [],
        warmVariations: [],
        coolVariations: [],
        shades: [],
        tints: [],
        tones: []
    };

    const baseColor = getBaseColorFromQuery(query);
    if (!baseColor) {
        return results;
    }

    try {
        const chromaColor = chroma(baseColor);
        const isValid = isValidForTheme(chromaColor.hex());

        if (isValid) {
            results.directMatch = {
                hex: chromaColor.hex(),
                name: getColorName(baseColor, query),
                color: chromaColor
            };
        } else {
            results.directMatch = {
                hex: chromaColor.hex(),
                name: getColorName(baseColor, query),
                color: chromaColor,
                invalidForTheme: true
            };
        }

        results.lightVariations = generateLightVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.darkVariations = generateDarkVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.saturatedVariations = generateSaturatedVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.desaturatedVariations = generateDesaturatedVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.warmVariations = generateWarmVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.coolVariations = generateCoolVariations(chromaColor).filter(c => isValidForTheme(c.hex));
        results.shades = generateShades(chromaColor).filter(c => isValidForTheme(c.hex));
        results.tints = generateTints(chromaColor).filter(c => isValidForTheme(c.hex));
        results.tones = generateTones(chromaColor).filter(c => isValidForTheme(c.hex));

    } catch (error) {
        console.error('Error processing color with chroma.js:', error);
    }

    return results;
}

function hasValidResults(results) {
    return results.directMatch ||
        results.lightVariations.length > 0 ||
        results.darkVariations.length > 0 ||
        results.saturatedVariations.length > 0 ||
        results.desaturatedVariations.length > 0 ||
        results.warmVariations.length > 0 ||
        results.coolVariations.length > 0 ||
        results.shades.length > 0 ||
        results.tints.length > 0 ||
        results.tones.length > 0;
}

// ========== BASE COLOR RETRIEVAL ==========

function getBaseColorFromQuery(query) {
    const lowerQuery = query.toLowerCase().trim();

    if (/^#?([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(lowerQuery)) {
        return lowerQuery.startsWith('#') ? lowerQuery : '#' + lowerQuery;
    }

    if (COLOR_SEARCH_CONFIG.colorDatabase[lowerQuery]) {
        return COLOR_SEARCH_CONFIG.colorDatabase[lowerQuery];
    }

    for (const [name, hex] of Object.entries(COLOR_SEARCH_CONFIG.colorDatabase)) {
        if (name.includes(lowerQuery) || lowerQuery.includes(name)) {
            return hex;
        }
    }

    try {
        const color = chroma(lowerQuery);
        return color.hex();
    } catch (error) {
        // Not a valid CSS color name
    }

    return null;
}

function getColorName(colorHex, originalQuery) {
    const lowerQuery = originalQuery.toLowerCase().trim();

    if (COLOR_SEARCH_CONFIG.colorDatabase[lowerQuery]) {
        return lowerQuery;
    }

    for (const [name, hex] of Object.entries(COLOR_SEARCH_CONFIG.colorDatabase)) {
        if (hex.toLowerCase() === colorHex.toLowerCase()) {
            return name;
        }
    }

    return colorHex;
}

// ========== SAME COLOR VARIATION GENERATORS ==========

function generateLightVariations(baseColor) {
    const variations = [];

    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;

        for (let i = 1; i <= 8; i++) {
            const newLightness = Math.min(1, baseLightness + (i * 0.08));
            if (newLightness > baseLightness) {
                const lighter = chroma.hsl(baseHue, baseSat, newLightness);
                variations.push({
                    hex: lighter.hex(),
                    name: `Lighter ${i}`,
                    color: lighter
                });
            }
        }
    } catch (error) {
        console.error('Error generating light variations:', error);
    }

    return variations;
}

function generateDarkVariations(baseColor) {
    const variations = [];

    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;

        for (let i = 1; i <= 8; i++) {
            const newLightness = Math.max(0, baseLightness - (i * 0.08));
            if (newLightness < baseLightness) {
                const darker = chroma.hsl(baseHue, baseSat, newLightness);
                variations.push({
                    hex: darker.hex(),
                    name: `Darker ${i}`,
                    color: darker
                });
            }
        }
    } catch (error) {
        console.error('Error generating dark variations:', error);
    }

    return variations;
}

function generateSaturatedVariations(baseColor) {
    const variations = [];

    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;

        for (let i = 1; i <= 6; i++) {
            const newSat = Math.min(1, baseSat + (i * 0.12));
            if (newSat > baseSat) {
                const moreSaturated = chroma.hsl(baseHue, newSat, baseLightness);
                variations.push({
                    hex: moreSaturated.hex(),
                    name: `More Saturated ${i}`,
                    color: moreSaturated
                });
            }
        }
    } catch (error) {
        console.error('Error generating saturated variations:', error);
    }

    return variations;
}

function generateDesaturatedVariations(baseColor) {
    const variations = [];

    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;

        for (let i = 1; i <= 6; i++) {
            const newSat = Math.max(0, baseSat - (i * 0.12));
            if (newSat < baseSat) {
                const lessSaturated = chroma.hsl(baseHue, newSat, baseLightness);
                variations.push({
                    hex: lessSaturated.hex(),
                    name: `Less Saturated ${i}`,
                    color: lessSaturated
                });
            }
        }
    } catch (error) {
        console.error('Error generating desaturated variations:', error);
    }

    return variations;
}

function generateWarmVariations(baseColor) {
    const variations = [];

    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;

        for (let i = 1; i <= 4; i++) {
            const hueShift = i * 8;
            const newHue = (baseHue + hueShift) % 360;
            const warmer = chroma.hsl(newHue, baseSat, baseLightness);
            variations.push({
                hex: warmer.hex(),
                name: `Warmer ${i}`,
                color: warmer
            });
        }
    } catch (error) {
        console.error('Error generating warm variations:', error);
    }

    return variations;
}

function generateCoolVariations(baseColor) {
    const variations = [];

    try {
        const hsl = baseColor.hsl();
        const baseHue = hsl[0] || 0;
        const baseSat = hsl[1] || 0;
        const baseLightness = hsl[2] || 0;

        for (let i = 1; i <= 4; i++) {
            const hueShift = i * 8;
            const newHue = (baseHue - hueShift + 360) % 360;
            const cooler = chroma.hsl(newHue, baseSat, baseLightness);
            variations.push({
                hex: cooler.hex(),
                name: `Cooler ${i}`,
                color: cooler
            });
        }
    } catch (error) {
        console.error('Error generating cool variations:', error);
    }

    return variations;
}

function generateShades(baseColor) {
    const shades = [];

    try {
        for (let i = 1; i <= 6; i++) {
            const amount = i * 0.15;
            const shade = chroma.mix(baseColor, 'black', amount);
            shades.push({
                hex: shade.hex(),
                name: `Shade ${Math.round(amount * 100)}%`,
                color: shade
            });
        }
    } catch (error) {
        console.error('Error generating shades:', error);
    }

    return shades;
}

function generateTints(baseColor) {
    const tints = [];

    try {
        for (let i = 1; i <= 6; i++) {
            const amount = i * 0.15;
            const tint = chroma.mix(baseColor, 'white', amount);
            tints.push({
                hex: tint.hex(),
                name: `Tint ${Math.round(amount * 100)}%`,
                color: tint
            });
        }
    } catch (error) {
        console.error('Error generating tints:', error);
    }

    return tints;
}

function generateTones(baseColor) {
    const tones = [];

    try {
        for (let i = 1; i <= 6; i++) {
            const amount = i * 0.15;
            const tone = chroma.mix(baseColor, '#808080', amount);
            tones.push({
                hex: tone.hex(),
                name: `Tone Gray ${Math.round(amount * 100)}%`,
                color: tone
            });
        }
    } catch (error) {
        console.error('Error generating tones:', error);
    }

    return tones;
}

// ========== IMPROVED RESULTS VISUALIZATION ==========

function displaySearchResults(results) {
    const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (!searchResultsWrapper) return;

    searchResultsWrapper.innerHTML = '';

    const sections = [
        { key: 'directMatch', titleKey: 'search_result', icon: 'search', single: true },
        { key: 'lightVariations', titleKey: 'brightness_light', icon: 'brightness_high' },
        { key: 'darkVariations', titleKey: 'brightness_dark', icon: 'brightness_low' },
        { key: 'saturatedVariations', titleKey: 'saturation_more', icon: 'water_drop' },
        { key: 'desaturatedVariations', titleKey: 'saturation_less', icon: 'opacity' },
        { key: 'warmVariations', titleKey: 'temperature_warmer', icon: 'thermostat' },
        { key: 'coolVariations', titleKey: 'temperature_cooler', icon: 'ac_unit' },
        { key: 'tints', titleKey: 'tints', icon: 'light_mode' },
        { key: 'shades', titleKey: 'shades', icon: 'dark_mode' },
        { key: 'tones', titleKey: 'tones', icon: 'contrast' }
    ];

    sections.forEach(sectionInfo => {
        const data = results[sectionInfo.key];
        const colorsToDisplay = sectionInfo.single ? (data ? [data] : []) : (data || []);

        if (colorsToDisplay.length > 0) {
            const fragment = document.createDocumentFragment();
            const sectionElement = createSearchResultSection(
                sectionInfo.titleKey,
                sectionInfo.icon,
                colorsToDisplay
            );
            fragment.appendChild(sectionElement);
            searchResultsWrapper.appendChild(fragment);
        }
    });

    if (searchResultsWrapper.children.length === 0) {
        displaySearchError(getTranslation('no_valid_results', 'search') + ' "' + searchState.currentQuery + '"');
    }
}

function createSearchResultSection(titleKey, icon, colors) {
    const section = document.createElement('div');
    section.className = 'menu-content';
    section.setAttribute('data-section', titleKey);

    const header = document.createElement('div');
    header.className = 'menu-content-header';
    header.innerHTML = `
        <div class="menu-content-header-primary">
            <span class="material-symbols-rounded">${icon}</span>
            <span>${getSearchSectionTranslation(titleKey)}</span>
        </div>
    `;

    const content = document.createElement('div');
    content.className = 'menu-content-general';

    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'color-wrapper';

    colors.slice(0, COLOR_SEARCH_CONFIG.maxResultsPerSection).forEach(colorData => {
        const colorElement = window.colorTextManager.createColorElementForSearch(colorData);

        if (colorData.invalidForTheme) {
            colorElement.classList.add('invalid-for-theme');
        }

        colorElement.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            handleSearchColorClick(colorData);
        });

        colorElement.addEventListener('mouseenter', () => {
            if (!colorElement.classList.contains('active')) {
                colorElement.style.transform = 'scale(1.05)';
            }
        });

        colorElement.addEventListener('mouseleave', () => {
            if (!colorElement.classList.contains('active')) {
                colorElement.style.transform = 'scale(1)';
            }
        });

        colorWrapper.appendChild(colorElement);
    });

    content.appendChild(colorWrapper);
    section.appendChild(header);
    section.appendChild(content);

    return section;
}

function handleSearchColorClick(colorData) {
    if (colorData.invalidForTheme) {
        console.warn('Color blocked for current theme:', colorData.hex);
        return;
    }

    if (window.colorTextManager && window.colorTextManager.setColor) {
        window.colorTextManager.setColor(colorData.hex, colorData.name || colorData.hex, 'search');
    }

    clearSearch();

    const event = new CustomEvent('searchColorSelected', {
        detail: {
            color: colorData.hex,
            name: colorData.name || colorData.hex,
            source: 'search'
        }
    });
    document.dispatchEvent(event);
}

// ========== ERROR AND STATE HANDLING ==========

function displaySearchError(message) {
    const searchResultsWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (!searchResultsWrapper) return;

    searchResultsWrapper.innerHTML = '';

    const errorSection = document.createElement('div');
    errorSection.className = 'menu-content';
    errorSection.setAttribute('data-section', 'no-results');

    errorSection.innerHTML = `
        <div class="menu-content-header">
            <div class="menu-content-header-primary">
                <span class="material-symbols-rounded">error</span>
                <span>${getSearchSectionTranslation('no_results_title')}</span>
            </div>
        </div>
        <div class="menu-content-general">
            <p style="color: #888; text-align: center; padding: 20px;">${message}</p>
        </div>
    `;
    searchResultsWrapper.appendChild(errorSection);
}

function showSearchSectionWrapper() {
    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (searchWrapper) {
        searchWrapper.classList.remove('disabled');
        searchWrapper.classList.add('active');
    }
}

function hideSearchSectionWrapper() {
    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);
    if (searchWrapper) {
        searchWrapper.classList.remove('active');
        searchWrapper.classList.add('disabled');
        searchWrapper.innerHTML = '';
    }
}

function clearSearch() {
    const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
    if (searchInput) {
        searchInput.value = '';
    }

    showOtherColorSections();
    hideSearchSectionWrapper();

    searchState.currentQuery = '';
    searchState.currentResults = null;

    if (searchState.searchTimeout) {
        clearTimeout(searchState.searchTimeout);
        searchState.searchTimeout = null;
    }

    if (typeof window.forceRefresh === 'function') {
        window.forceRefresh({ source: 'searchCleared', preset: 'TOOLTIPS_ONLY' });
    }
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

// ========== PUBLIC API ==========

function refreshSearchSystem() {
    if (searchState.isInitialized) {
        updateSearchPlaceholder();
        setupSearchInput();

        const searchInput = document.querySelector(COLOR_SEARCH_CONFIG.searchInput);
        if (searchInput && searchInput.value.trim()) {
            performSearch(searchInput.value.trim());
        } else {
            showOtherColorSections();
            hideSearchSectionWrapper();
        }
    }
}

function addCustomColor(name, hex) {
    COLOR_SEARCH_CONFIG.colorDatabase[name.toLowerCase()] = hex;
}

function removeCustomColor(name) {
    delete COLOR_SEARCH_CONFIG.colorDatabase[name.toLowerCase()];
}

function getSearchState() {
    return {
        isInitialized: searchState.isInitialized,
        currentQuery: searchState.currentQuery,
        isSearching: searchState.isSearching,
        totalColorsInDatabase: Object.keys(COLOR_SEARCH_CONFIG.colorDatabase).length,
        currentTheme: getCurrentTheme()
    };
}

function debugSearchSystem() {
    console.group('🔍 Color Search System Debug (Enhanced - Only Same Color Variations)');
    console.log('State:', getSearchState());
    console.log('Available colors (internal database):', Object.keys(COLOR_SEARCH_CONFIG.colorDatabase).length);
    console.log('Current results:', searchState.currentResults);
    console.log('Current theme:', getCurrentTheme());

    const mainWrapper = document.querySelector(COLOR_SEARCH_CONFIG.mainColorsWrapper);
    const searchWrapper = document.querySelector(COLOR_SEARCH_CONFIG.searchColorsWrapper);

    console.log('Main Colors Wrapper State:', {
        exists: !!mainWrapper,
        active: mainWrapper ? mainWrapper.classList.contains('active') : null,
        disabled: mainWrapper ? mainWrapper.classList.contains('disabled') : null
    });
    console.log('Search Colors Wrapper State:', {
        exists: !!searchWrapper,
        active: searchWrapper ? searchWrapper.classList.contains('active') : null,
        disabled: searchWrapper ? searchWrapper.classList.contains('disabled') : null,
        childCount: searchWrapper ? searchWrapper.children.length : null
    });

    const testColors = ['#000000', '#ffffff', '#ff0000', '#808080'];
    console.log('Theme validation test:');
    testColors.forEach(color => {
        console.log(`  ${color}: ${isValidForTheme(color) ? '✅ Valid' : '❌ Invalid'} for ${getCurrentTheme()} theme`);
    });

    console.log('Enhanced features:');
    console.log('  - Same color variations only: ✅');
    console.log('  - Light/Dark variations: ✅');
    console.log('  - Saturation control: ✅');
    console.log('  - Warm/Cool subtle shifts: ✅');
    console.log('  - Tints, Shades, and Tones: ✅');
    console.log('  - NO complementary colors: ✅');
    console.log('  - NO analogous colors: ✅');
    console.log('  - NO triadic colors: ✅');
    console.log('  - ONLY variations of searched color: ✅');

    console.groupEnd();
}

// ========== INTEGRATION WITH MAIN SYSTEM ==========

function integrateWithColorSystem() {
    document.addEventListener('moduleActivated', (e) => {
        if (e.detail && e.detail.module === 'togglePaletteColors') {
            setTimeout(() => {
                if (window.colorTextManager && !window.colorTextManager.getColorInfo().isInitialized) {
                    window.colorTextManager.initColorTextSystem();
                }
                if (!searchState.isInitialized) {
                    initColorSearch();
                } else {
                    refreshSearchSystem();
                }
            }, 100);
        }
    });

    document.addEventListener('moduleDeactivated', (e) => {
        if (e.detail && e.detail.module === 'togglePaletteColors') {
            clearSearch();
        }
    });

    document.addEventListener('themeChanged', (e) => {
        console.log('🔍 Theme changed detected in search system:', e.detail);
        if (searchState.currentQuery && searchState.currentResults) {
            setTimeout(() => {
                performSearch(searchState.currentQuery);
            }, 300);
        }
    });

    document.addEventListener('languageChanged', (e) => {
        console.log('🔍 Language changed detected in search system:', e.detail);
        setTimeout(() => {
            updateSearchPlaceholder();
            if (searchState.currentQuery && searchState.currentResults) {
                performSearch(searchState.currentQuery);
            }
        }, 500);
    });

    document.addEventListener('translationsApplied', (e) => {
        setTimeout(() => {
            updateSearchPlaceholder();
        }, 100);
    });
}

// ========== AUTO-INITIALIZATION AND INTEGRATION ==========

function autoInit() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', integrateWithColorSystem);
    } else {
        integrateWithColorSystem();
    }

    window.colorSearchDebug = debugSearchSystem;
    window.clearColorSearch = clearSearch;
    window.showColorSections = showOtherColorSections;
    window.hideColorSections = hideOtherColorSections;
    window.showSearchSectionWrapper = showSearchSectionWrapper;
    window.hideSearchSectionWrapper = hideSearchSectionWrapper;
}

window.colorSearchManager = {
    init: initColorSearch,
    refresh: refreshSearchSystem,
    clear: clearSearch,
    addColor: addCustomColor,
    removeColor: removeCustomColor,
    getState: getSearchState,
    debug: debugSearchSystem,
    hideOtherSections: hideOtherColorSections,
    showOtherSections: showOtherColorSections,
    performSearch: performSearch,
    isValidForTheme: isValidForTheme,
    getCurrentTheme: getCurrentTheme,
    updatePlaceholder: updateSearchPlaceholder,
    showSearchSectionWrapper: showSearchSectionWrapper,
    hideSearchSectionWrapper: hideSearchSectionWrapper
};

autoInit();

export {
    initColorSearch,
    refreshSearchSystem,
    clearSearch,
    addCustomColor,
    removeCustomColor,
    getSearchState,
    debugSearchSystem,
    hideOtherColorSections,
    showOtherColorSections,
    performSearch,
    isValidForTheme,
    getCurrentTheme,
    updateSearchPlaceholder,
    showSearchSectionWrapper,
    hideSearchSectionWrapper
};