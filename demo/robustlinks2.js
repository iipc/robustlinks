/** robustlinks2.ts
 *
 * @overview A general purpose library for handling Robust Link data.
 * Provides tools necessary for creating, augmenting, and parsing Robust
 * Links.
 *
 * Currently assumes another client will handle specific data fetching
 * methods for TimeGates and TimeMaps.
 *
 * @author Yorick Chollet <yorick.chollet@gmail.com>
 * @author Harihar Shankar <hariharshankar@gmail.com>
 * @author Shawn M. Jones <jones.shawn.m@gmail.com>
 * @author Dylan O'Connor <dylankconnor@gmail.com>
 * @version 3.0.0
 * License can be obtained at http://mementoweb.github.io/SiteStory/license.html
 *
*/
/**
 * The `RobustLinksV2` class provides functionality for managing and configuring
 * robust linking behavior within an application. It includes utilities for
 * validating URLs, managing a list of excluded archive patterns, and parsing
 * and creating Robust Links based on the specification.
 *
 * It can be used as a module to be initialized once and then used throughout
 * your application to manage robust links.
 */
export class RobustLinksV2 {
    // Internal constants for the module -> Not in the constructor because we want to guarantee imutability
    NAME = 'RobustLinksV2';
    VERSION = '3.0.0';
    // Public configurable properties, initialized with @default
    id;
    urimPattern;
    debug;
    timeGate;
    enableDropdown;
    dropdownArrowColor;
    dropdownArrowSize;
    dropdownArrowHtml;
    // Private properties for internal use
    exclusions;
    _archivePatternRegexes = null;
    _patternsLoadingPromise = null;
    /**
     * Creates a new RobustLinksV2 instance with optional configurations.
     * Default values are provided for all configurable properties.
     *
     * @param {RobustLinksConfig} [config] - Optional configuration options to override @default
     */
    constructor(config) {
        /**
         * Ensures config is initialized
         *
         * @type {RobustLinksConfig}
         *
         */
        config = config || {};
        /**
         * Initializes the ID of the RobustLinksV2 instance.
         *
         * @type {string}
         */
        this.id = `${this.NAME}:${this.VERSION}`;
        /**
         * Initializes the default TimeGate URL for archive lookups.
         *
         * @type {string}
         */
        this.timeGate = config.timeGate || "https://web.archive.org/";
        /**
         * Initializes the URI-M pattern used for constructing Memento URIs with a specific datetime.
         *
         * @type {string}
         */
        this.urimPattern = `${this.timeGate}<datetime>/<urir>`;
        /**
         * Initializes a collection of URL exclusion patterns, primarily for identifying known archive URLs.
         *
         * @type {{ [key: string]: (url: string) => boolean }}
         */
        this._patternsLoadingPromise = this._loadAndCompileArchivePatterns();
        this.exclusions = {
            isKnownArchive: (url) => {
                // This method must now handle the async nature of patterns.
                // For simplicity here, it will only work *after* patterns are loaded.
                // A more robust solution might queue checks or always return false until loaded.
                if (this._archivePatternRegexes) {
                    return this._archivePatternRegexes.some(regex => regex.test(url));
                }
                else {
                    this.logDebug('RobustLinksV2: isKnownArchive called before patterns were loaded.');
                    return false; // Or throw an error, depending on desired behavior
                }
            }
        };
        /**
         * Initializes the debug mode setting. If true, debug messages will be logged to the console.
         *
         * @type {boolean}
         */
        this.debug = config.debug || false;
        /**
         * Initializes dropdown arrow as visible or invisible.
         *
         * @type {boolean}
         *
         */
        this.enableDropdown = config.enableDropdown === true;
        /**
         * Initializes color of dropdown arrow, regardless of visibility
         * @default blue
         *
         * @type {string}
         */
        this.dropdownArrowColor = config.dropdownArrowColor || "#333";
        /**
         * Initializes the size of the dropdown arrow, regardless of visibility.
         * @default 6px
         *
         * @type {string}
         */
        this.dropdownArrowSize = config.dropdownArrowSize || '12px';
        /**
         * Initializes a custom dropdown arrow, based on string html
         * @default a down arrow
         *
         * @type {string}
         */
        this.dropdownArrowHtml = config.dropdownArrowHtml || '▼';
        /**
         * Determines if robust links object will auto run on all present links
         * @default false
         *
         * @type {boolean | object}
         */
        const autoInitConfig = config.autoInit !== undefined ? config.autoInit : false;
        // --- Auto-initialization based on config ---
        this._initAuto(autoInitConfig);
    }
    // ---- EXTERNAL FUNCTIONS ----
    /**
     * Generates a Memento URI (URI-M) using the configured `urimPattern`.
     * This method creates a URI that points to a specific historical version
     * of an original resource at a given datetime. It's often a "TimeGate" URI
     * used to negotiate the best available memento.
     *
     * @param originalUrl The URI of the original resource (URI-R). Must be an absolute HTTP/HTTPS URL.
     * @param dateTime Optional. The desired historical datetime for the memento. If omitted,
     * the URI will act as a TimeGate to the *latest* known Memento (e.g., `https://web.archive.org/originalUrl`).
     * @returns A string representing the Memento URI (URI-M or URI-G).
     * @throws {Error} if the originalUrl is not a valid absolute HTTP/HTTPS URL.
     */
    createMementoUri(originalUrl, dateTime) {
        if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl)) {
            this.logDebug(`RobustLinksV2: originalUrl "${originalUrl}" is not a valid absolute HTTP/HTTPS URL for Memento URI creation.`);
            throw new Error(`Invalid originalUrl: "${originalUrl}" is not an absolute HTTP/HTTPS URI.`);
        }
        let mementoUri;
        if (dateTime) {
            // If a specific datetime is provided, construct a URI-M (or a TimeGate with specific time)
            // Note: formatDateTime is an assumed utility function for converting Date to YYYYMMDDhhmmss
            const datetimeString = this.formatDateTime(dateTime);
            mementoUri = this.urimPattern
                .replace('<datetime>', datetimeString)
                .replace('<urir>', originalUrl);
            this.logDebug(`RobustLinksV2: Created Memento URI-M: ${mementoUri} for originalUrl: ${originalUrl} at datetime: ${dateTime.toISOString()}`);
        }
        else {
            // If no datetime, construct a TimeGate URI (URI-G) to get the latest
            // This will use the normalized defaultTimeGate (e.g., https://web.archive.org/)
            // resulting in the correct format: https://web.archive.org/originalUrl
            mementoUri = `${this.timeGate}${originalUrl}`;
            this.logDebug(`RobustLinksV2: Created Memento TimeGate URI (latest): ${mementoUri} for originalUrl: ${originalUrl}`);
        }
        return mementoUri;
    }
    /**
     * Checks if a string is a valid absolute HTTP or HTTPS URL.
     * This method is marked as `static` because it doesn't depend on any instance properties
     * and can be called directly on the class (e.g., `RobustLinksV2.isValidAbsoluteUrl(...)`).
     *
     * @param url The string to validate.
     * @returns True if it's a valid absolute HTTP/HTTPS URL, false otherwise.
     */
    static isValidAbsoluteUrl(url) {
        try {
            const parsedUrl = new URL(url);
            // Ensure it's http or https protocol and has a non-empty hostname
            return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && parsedUrl.hostname.length > 0;
        }
        catch (e) {
            // If URL constructor throws an error, it's not a valid URL
            return false;
        }
    }
    /**
     * Parses a datetime string according to the Robust Links specification rules.
     * Handles both ISO8601 and Web Archive URI formats, and correctly interprets
     * date-only strings as noon UTC.
     * @param datetimeStr The datetime string to parse.
     * @returns A Date object representing the parsed datetime, or null if invalid.
     */
    static parseDatetime(datetimeStr) {
        // ISO8601 Date: YYYY-MM-DD
        const isoDateMatch = datetimeStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateMatch) {
            // Interpret as noon UTC
            return new Date(Date.UTC(parseInt(isoDateMatch[1]), // Year
            parseInt(isoDateMatch[2]) - 1, // Month (0-indexed)
            parseInt(isoDateMatch[3]), // Day
            12, 0, 0, 0 // Noon UTC
            ));
        }
        // ISO8601 Datetime: YYYY-MM-DDThh:mm:ssZ
        const isoDatetimeMatch = datetimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/);
        if (isoDatetimeMatch) {
            return new Date(Date.UTC(parseInt(isoDatetimeMatch[1]), parseInt(isoDatetimeMatch[2]) - 1, parseInt(isoDatetimeMatch[3]), parseInt(isoDatetimeMatch[4]), parseInt(isoDatetimeMatch[5]), parseInt(isoDatetimeMatch[6])));
        }
        // Web Archive URI Date: YYYYMMDD
        const waDateMatch = datetimeStr.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (waDateMatch) {
            // Interpret as noon UTC
            return new Date(Date.UTC(parseInt(waDateMatch[1]), parseInt(waDateMatch[2]) - 1, parseInt(waDateMatch[3]), 12, 0, 0, 0));
        }
        // Web Archive URI Datetime: YYYYMMDDhhmmss
        const waDatetimeMatch = datetimeStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        if (waDatetimeMatch) {
            return new Date(Date.UTC(parseInt(waDatetimeMatch[1]), parseInt(waDatetimeMatch[2]) - 1, parseInt(waDatetimeMatch[3]), parseInt(waDatetimeMatch[4]), parseInt(waDatetimeMatch[5]), parseInt(waDatetimeMatch[6])));
        }
        return null;
    }
    /**
     * Parses the data-versionurl string into an array of RobustLinkSnapshot objects.
     * @param versionUrlString The raw string value of the data-versionurl attribute.
     * @returns An array of RobustLinkSnapshot.
     */
    static parseVersionUrl(versionUrlString) {
        if (!versionUrlString) {
            return [];
        }
        const snapshots = [];
        // Split by space, then filter out empty strings to handle multiple spaces
        const parts = versionUrlString.split(' ').filter(part => part.length > 0);
        let i = 0;
        while (i < parts.length) {
            const uri = parts[i];
            // Check if the current part is a valid URI
            if (!RobustLinksV2.isValidAbsoluteUrl(uri)) {
                // If it's not a valid URI, it might be a malformed datetime or just junk.
                // We'll skip it and log a warning if debug is enabled.
                // For a robust implementation, you might want to throw an error here,
                // or have a stricter ABNF-based parser.
                console.warn(`RobustLinksV2: Skipping invalid URI in data-versionurl: "${uri}"`);
                i++;
                continue;
            }
            // Check if the next part looks like a datetime
            const nextPart = parts[i + 1];
            const isDatetime = nextPart && RobustLinksV2.parseDatetime(nextPart) !== null;
            if (isDatetime) {
                snapshots.push({ uri, datetime: nextPart });
                i += 2; // Consume URI and datetime
            }
            else {
                snapshots.push({ uri });
                i += 1; // Consume only URI
            }
        }
        return snapshots;
    }
    /**
     * Takes an object representing the raw HTML attributes of an <a> element
     * and returns a parsed and validated ParsedRobustLink object.
     *
     * This method implements the logic for handling missing attributes as per
     * Section 3.5 "Missing attribute information" of the specification.
     *
     * @param rawAttributes The raw attributes from an HTML <a> element.
     * @param defaultLinkText Optional text content of the <a> tag, used for the `linkText` property.
     * @returns A ParsedRobustLink object.
     * @throws {Error} if required attributes are missing or invalid, even after attempting @default
     */
    parseRobustLink(rawAttributes, defaultLinkText) {
        let { href, 'data-originalurl': originalUrl, 'data-versiondate': versionDateStr, 'data-versionurl': versionUrlStr } = rawAttributes;
        // Apply default for data-originalurl if missing (Section 3.5)
        if (!originalUrl && href) {
            if (this.debug) {
                this.logDebug(`RobustLinksV2: data-originalurl missing, defaulting to href: ${href}`);
            }
            originalUrl = href; // Use href as data-originalurl if not provided
        }
        // --- Basic validation of required attributes after defaulting ---
        if (!href) {
            throw new Error("Robust Link parsing failed: 'href' attribute is missing and required.");
        }
        if (!originalUrl) {
            throw new Error("Robust Link parsing failed: 'data-originalurl' (or default from href) is missing and required.");
        }
        if (!versionDateStr) {
            // For data-versiondate, the spec allows client applications to attempt to determine a plausible value
            // if not provided, e.g., document creation/last modification date.
            // For this draft, we will currently treat it as a hard error if not present,
            // or you could add a fallback (e.g., to current date, though this is less precise).
            // For now, let's make it throw if not provided, to keep it explicit.
            throw new Error("Robust Link parsing failed: 'data-versiondate' attribute is missing and required.");
        }
        // --- URI Absolute Validation ---
        if (!RobustLinksV2.isValidAbsoluteUrl(href)) {
            throw new Error(`Invalid href: "${href}" is not an absolute URI.`);
        }
        if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl)) {
            throw new Error(`Invalid data-originalurl: "${originalUrl}" is not an absolute URI.`);
        }
        // --- Parse and Validate data-versiondate ---
        const parsedVersionDate = RobustLinksV2.parseDatetime(versionDateStr);
        if (!parsedVersionDate) {
            throw new Error(`Invalid data-versiondate format: "${versionDateStr}". Must follow ISO8601 or Web Archive URI datetime formats.`);
        }
        // --- Parse and Validate data-versionurl ---
        const parsedVersionSnapshots = RobustLinksV2.parseVersionUrl(versionUrlStr);
        // `parseVersionUrl` already handles basic URI validity for snapshots.
        // If it encounters malformed parts, it warns and skips.
        return {
            href,
            originalUrl,
            versionDate: parsedVersionDate,
            versionSnapshots: parsedVersionSnapshots,
            linkText: defaultLinkText
        };
    }
    /**
     * Discovers all robust links within a given HTML element (or the entire document body)
     * and parses them into ParsedRobustLink objects.
     * Invalid robust links found will be logged as errors and skipped.
     *
     * @param rootElement The HTML element to search within. @default `document.body`.
     * @returns An array of ParsedRobustLink objects found.
     */
    findAndParseRobustLinks(rootElement) {
        this.logDebug('RobustLinksV2: Searching for and parsing existing robust links.');
        const links = [];
        const scope = rootElement || document.body;
        const anchorElements = scope.querySelectorAll('a[data-originalurl][data-versiondate]'); // Select only potential robust links
        anchorElements.forEach(anchor => {
            const href = anchor.getAttribute('href');
            const dataOriginalUrl = anchor.getAttribute('data-originalurl');
            const dataVersionDate = anchor.getAttribute('data-versiondate');
            const dataVersionUrl = anchor.getAttribute('data-versionurl');
            const linkText = anchor.textContent || undefined; // Get link text, default to undefined if empty
            const rawAttributes = {
                href: href || '', // Ensure href is always a string for the interface
                'data-originalurl': dataOriginalUrl || undefined,
                'data-versiondate': dataVersionDate || undefined,
                'data-versionurl': dataVersionUrl || undefined
            };
            try {
                const parsedLink = this.parseRobustLink(rawAttributes, linkText);
                links.push(parsedLink);
            }
            catch (error) {
                console.error(`RobustLinksV2: Could not parse robust link for href "${href || 'N/A'}". Error: ${error.message}`);
                // Continue to the next link
            }
        });
        this.logDebug(`RobustLinksV2: Found and parsed ${links.length} robust links.`);
        return links;
    }
    /**
     * Generates an HTML <a> tag string for a given ParsedRobustLink object.
     * This can be used to programmatically create Robust Links for insertion into the DOM.
     * @param parsedLink The ParsedRobustLink object to convert into HTML.
     * @returns A string representing the HTML <a> tag.
     */
    createRobustLinkHtml(parsedLink) {
        // Format versionDate to YYYY-MM-DD for data-versiondate attribute
        // Note: Date.toISOString() gives YYYY-MM-DDTHH:mm:ss.sssZ, we only want the date part.
        const versionDateStr = parsedLink.versionDate.toISOString().split('T')[0];
        let versionUrlAttr = '';
        if (parsedLink.versionSnapshots && parsedLink.versionSnapshots.length > 0) {
            // Format versionSnapshots into the space-separated string for data-versionurl
            const snapshotParts = parsedLink.versionSnapshots.map(s => {
                // Encode URI components to ensure valid HTML attribute value, especially if URIs contain spaces or special chars
                return `${s.uri}${s.datetime ? ` ${s.datetime}` : ''}`;
            });
            versionUrlAttr = ` data-versionurl="${snapshotParts.join(' ')}"`;
        }
        // Use linkText if provided, otherwise default to href
        const linkText = parsedLink.linkText || parsedLink.href;
        // Construct the HTML string. Ensure attributes are properly quoted.
        return `<a href="${parsedLink.href}" data-originalurl="${parsedLink.originalUrl}" data-versiondate="${versionDateStr}"${versionUrlAttr}>${linkText}</a>`;
    }
    /**
     * Determines if a given URL is considered an "archive URL" based on predefined patterns.
     * This uses the `isKnownArchive` exclusion rule.
     * @param url The URL to check.
     * @returns True if the URL matches a known archive pattern, false otherwise.
     */
    isArchiveUrl(url) {
        return this.exclusions.isKnownArchive(url);
    }
    /**
     * Updates an existing HTML <a> element to become a Robust Link by setting
     * its data-originalurl, data-versiondate, and optionally data-versionurl attributes.
     * It can also optionally update the href attribute.
     *
     * @param anchorElement The HTMLAnchorElement to update.
     * @param options An object containing the necessary data to make the link robust.
     * - originalUrl: The URI of the resource that motivates the Robust Link. Must be absolute.
     * - versionDate: The intended linking datetime.
     * - versionSnapshots: Optional array of parsed snapshot URIs and their datetimes.
     * - newHref: Optional string to set as the new href attribute for the anchor.
     * @throws {Error} if inputs are invalid or required data is missing.
     */
    updateAnchorToRobustLink(anchorElement, options) {
        if (!anchorElement || !(anchorElement instanceof HTMLAnchorElement)) {
            throw new Error("Invalid anchorElement provided. Must be an HTMLAnchorElement.");
        }
        if (!RobustLinksV2.isValidAbsoluteUrl(options.originalUrl)) {
            throw new Error(`Invalid originalUrl: "${options.originalUrl}" is not an absolute HTTP/HTTPS URI.`);
        }
        if (!(options.versionDate instanceof Date) || isNaN(options.versionDate.getTime())) {
            throw new Error("Invalid versionDate provided. Must be a valid Date object.");
        }
        if (this.enableDropdown && !anchorElement.dataset.hasRobustDropdown) {
            this.logDebug("Attaching dropdown");
            this._attachDropdownToLink(anchorElement, options.originalUrl);
            anchorElement.dataset.hasRobustDropdown = 'true';
        }
        anchorElement.setAttribute('data-originalurl', options.originalUrl);
        // Format versionDate to YYYY-MM-DD for data-versiondate attribute
        const versionDateStr = options.versionDate.toISOString().split('T')[0];
        anchorElement.setAttribute('data-versiondate', versionDateStr);
        if (options.versionSnapshots && options.versionSnapshots.length > 0) {
            const snapshotParts = options.versionSnapshots.map(s => `${s.uri}${s.datetime ? ` ${s.datetime}` : ''}`);
            anchorElement.setAttribute('data-versionurl', snapshotParts.join(' '));
        }
        else {
            anchorElement.removeAttribute('data-versionurl');
        }
        if (options.newHref) {
            if (RobustLinksV2.isValidAbsoluteUrl(options.newHref)) {
                anchorElement.setAttribute('href', options.newHref);
            }
            else {
                this.logDebug(`RobustLinksV2: newHref "${options.newHref}" is not a valid absolute HTTP/HTTPS URL. Href not updated.`);
            }
        }
        this.logDebug(`RobustLinksV2: Updated <a> tag with href "${anchorElement.href}" to robust link.`);
    }
    /**
     * Iterates through all <a> tags matching a given CSS selector and transforms them
     * into robust links using data provided by a callback function.
     *
     * @param selector The CSS selector string (e.g., 'a', 'a.my-class') to select elements.
     * @param dataProducer A callback function that receives each HTMLAnchorElement and its
     * index, and returns an object containing the originalUrl, versionDate,
     * and optional versionSnapshots and newHref for that link.
     * If the function returns null or undefined, the link is skipped.
     * @param rootElement The HTML element to search within. @default `document.body`.
     * @returns An array of HTMLAnchorElement that were successfully made robust.
     */
    async makeAllLinksRobust(selector, dataProducer, // The null/undefined allows for an explicitly synchronous producer too, but the Promise handles async
    rootElement) {
        this.logDebug(`RobustLinksV2: Attempting to make all links matching selector "${selector}" robust.`);
        const updatedLinks = [];
        const scope = rootElement || document.body;
        const anchorElements = scope.querySelectorAll(selector);
        await this.getExclusionsReadyPromise();
        if (!dataProducer) {
            dataProducer = this._createDefaultDataProducer();
        }
        // Use Promise.allSettled to handle all async operations concurrently
        // and collect results safely, even if some fail or are skipped.
        const results = await Promise.allSettled(Array.from(anchorElements).map(async (anchor, index) => {
            try {
                // Await the dataProducer's result
                const linkData = await dataProducer(anchor, index);
                if (linkData) {
                    this.updateAnchorToRobustLink(anchor, linkData);
                    return anchor; // Return the updated anchor if successful
                }
                else {
                    this.logDebug(`RobustLinksV2: Skipping link "${anchor.href}" as dataProducer returned null/undefined.`);
                    return null; // Indicate skipped
                }
            }
            catch (error) {
                if (error instanceof Error) {
                    console.error(`RobustLinksV2: Error making link with href "${anchor.href}" robust. Error: ${error.message}`);
                }
                else {
                    console.error(`RobustLinksV2: An unknown error occurred making link with href "${anchor.href}" robust.`, error);
                }
                return null;
            }
        }));
        // Process results from Promise.allSettled
        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value !== null) {
                updatedLinks.push(result.value);
            }
        });
        this.logDebug(`RobustLinksV2: Successfully made ${updatedLinks.length} links robust.`);
        return updatedLinks;
    }
    /**
     * Helper to get the promise that resolves when patterns are loaded.
     * Useful for external code that might need to wait.
     */
    async getExclusionsReadyPromise() {
        return this._patternsLoadingPromise || Promise.resolve(); // Return existing promise or resolved if not loading
    }
    // ------ INTERNAL FUNCTIONS --------
    /**
     * @WIP unfinished function
     *
     * Checks if a link is "rotted" by performing a network request.
     * A link is considered rotted if it returns a non-successful HTTP status code (4xx, 5xx)
     * or if the request fails completely (e.g., due to a DNS error).
     *
     * @param url The URL to check.
     * @returns A promise that resolves to `true` if the link is rotted, `false` otherwise.
     */
    async _isLinkRotted(url) {
        // Placeholder for the actual rotting check logic.
        // In a real scenario, this would involve a fetch request and checking status codes.
        this.logDebug(`_isLinkRotted: Checking if ${url} is rotted (simulated).`);
        return true;
    }
    /**
     * Creates a default dataProducer function that checks if a link is rotted
     * before generating robust link data.
     * This function is designed to be used when `autoInit` or `defaultDataProducer` is true.
     * It will:
     * - Check if the link is valid and not already an archive.
     * - **Perform an async check to see if the link is rotted.**
     * - Only if the link is rotted, it returns a data object to robustify the link.
     * - Otherwise, it returns null, and the link is skipped.
     *
     * @returns A `dataProducer` function that returns a Promise.
     */
    _createDefaultDataProducer() {
        return async (anchor, index) => {
            const originalUrl = anchor.href;
            const isArchiveUrl = this.isArchiveUrl(originalUrl);
            if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl) || isArchiveUrl) {
                this.logDebug(`RobustLinksV2: Skipping "${originalUrl}" (invalid or already archive).`);
                return null;
            }
            const isRotted = await this._isLinkRotted(originalUrl);
            if (isRotted) {
                this.logDebug(`RobustLinksV2: Link "${originalUrl}" is rotted. Robustifying.`);
                const versionDate = new Date();
                const newHref = this.createMementoUri(originalUrl);
                return {
                    originalUrl: originalUrl,
                    versionDate: versionDate,
                    newHref: newHref,
                    versionSnapshots: []
                };
            }
            else {
                this.logDebug(`RobustLinksV2: Link "${originalUrl}" is healthy. Skipping robustification.`);
                return null;
            }
        };
    }
    /**
     * Formats a Date object into the 14-digit YYYYMMDDhhmmss UTC string required for Memento URIs.
     * This is a helper for createMementoUri.
     * @param date The Date object to format.
     * @returns A 14-digit datetime string (e.g., "20231026143000").
     */
    formatDateTime(date) {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0'); // Month is 0-indexed
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
    /**
     * Logs a debug message to the console if `this.debug` is true.
     * @param message The message to log.
     * @param optionalParams Optional additional parameters to log.
     */
    logDebug(message, ...optionalParams) {
        if (this.debug) {
            console.log(`[${this.NAME} DEBUG] ${message}`, ...optionalParams);
        }
    }
    /**
     * Loads archive patterns from JSON and compiles them into an array of RegExp objects.
     * @private
     * @returns {Promise<void>} A promise that resolves when patterns are loaded and compiled.
     */
    async _loadAndCompileArchivePatterns() {
        try {
            const response = await fetch('./archiveExclusions.json'); // Adjust path as needed
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const archivePatterns = await response.json();
            this._archivePatternRegexes = archivePatterns.map(pattern => {
                const processedPattern = pattern.replace(/\./g, '\\.');
                return new RegExp(`^${processedPattern}`, 'i');
            });
            this.logDebug('RobustLinksV2: Archive patterns loaded and compiled.');
        }
        catch (error) {
            console.error('RobustLinksV2: Error loading archive exclusion patterns:', error);
            // Decide how to handle this error: maybe proceed without exclusions, or prevent functionality.
            this._archivePatternRegexes = []; // Fail gracefully with empty patterns
        }
    }
    /**
     * Autoinitializes the robust links class based off of a config, selecting specific links to be made
     * Robust, with custom dropdown arrows. This is now an async function to handle the link checking.
     * * @private
     * @returns {null}
     */
    async _initAuto(autoInitConfig) {
        if (!autoInitConfig) {
            this.logDebug('RobustLinksV2: Auto-initialization disabled due to no init config.');
            return;
        }
        this.logDebug('RobustLinksV2: Auto-initialization enabled.');
        let selector = 'a:not([data-originalurl])';
        let dataProducer;
        let rootElement = undefined;
        if (typeof autoInitConfig === 'boolean' && autoInitConfig === true) {
            dataProducer = this._createDefaultDataProducer();
            this.logDebug('RobustLinksV2: Auto-initializing with default selector and data producer.');
        }
        else if (typeof autoInitConfig === 'object') {
            selector = autoInitConfig.selector || selector;
            rootElement = autoInitConfig.rootElement;
            if (autoInitConfig.dataProducer) {
                dataProducer = (anchor, index) => {
                    const producerResult = autoInitConfig.dataProducer.call(this, anchor, index);
                    return Promise.resolve(producerResult);
                };
                this.logDebug('RobustLinksV2: Auto-initializing with specified selector and custom data producer.');
            }
            else {
                dataProducer = this._createDefaultDataProducer();
            }
        }
        if (dataProducer) {
            const updatedLinks = await this.makeAllLinksRobust(selector, dataProducer, rootElement);
            this.logDebug(`RobustLinksV2: Auto-initialization completed. Robustified ${updatedLinks.length} links.`);
        }
    }
    /**
     * Attaches a dropdown menu to a robust link.
     * This function orchestrates the creation of dropdown elements,
     * adding options, inserting them into the DOM, and setting up event listeners.
     *
     * @param anchorElement The HTMLAnchorElement to attach the dropdown to.
     * @param originalUrl The original URL of the link, used to generate dropdown options.
     * @private
     */
    _attachDropdownToLink(anchorElement, originalUrl) {
        this.logDebug(`Attaching dropdown to link: ${originalUrl}`);
        const { dropdownWrapper, dropdownArrow, dropdownContent } = this._createDropdownElements();
        const { currentLinkOption, archiveOption } = this._addDropdownOptions(dropdownContent, originalUrl);
        this._insertDropdownIntoDOM(anchorElement, dropdownWrapper, dropdownArrow, dropdownContent);
        this._setupDropdownEventListeners(dropdownArrow, dropdownContent, currentLinkOption, originalUrl);
        // Add a class to the robust link to easily identify and style it if needed
        anchorElement.classList.add('robust-link-with-dropdown');
    }
    /**
     * Creates the core HTML elements for the dropdown: wrapper, arrow, and content.
     * @private
     * @returns An object containing the created HTMLElement references.
     */
    _createDropdownElements() {
        // In _createDropdownElements
        const dropdownArrow = document.createElement('span');
        dropdownArrow.className = 'robust-link-dropdown-arrow';
        dropdownArrow.innerHTML = this.dropdownArrowHtml;
        dropdownArrow.style.color = this.dropdownArrowColor;
        dropdownArrow.style.fontSize = this.dropdownArrowSize;
        const dropdownWrapper = document.createElement('span');
        dropdownWrapper.className = 'robust-link-dropdown-wrapper';
        dropdownArrow.className = 'robust-link-dropdown-arrow';
        dropdownArrow.innerHTML = this.dropdownArrowHtml;
        dropdownArrow.setAttribute('role', 'button');
        dropdownArrow.setAttribute('aria-haspopup', 'menu');
        dropdownArrow.setAttribute('aria-expanded', 'false');
        const dropdownContent = document.createElement('div');
        dropdownContent.className = 'robust-link-dropdown-content';
        dropdownContent.setAttribute('role', 'menu');
        dropdownContent.setAttribute('aria-orientation', 'vertical');
        return { dropdownWrapper, dropdownArrow, dropdownContent };
    }
    /**
     * Creates and appends the "View Current Link" and "View Latest Archive" options to the dropdown content.
     * @param dropdownContent The HTMLDivElement representing the dropdown's content area.
     * @param originalUrl The original URL to be used for the options.
     * @private
     * @returns An object containing references to the created option elements.
     */
    _addDropdownOptions(dropdownContent, originalUrl) {
        const currentLinkOption = document.createElement('a');
        currentLinkOption.href = originalUrl;
        currentLinkOption.textContent = 'View Current Link';
        currentLinkOption.target = '_blank';
        currentLinkOption.classList.add('robust-link-dropdown-item');
        currentLinkOption.setAttribute('role', 'menuitem');
        currentLinkOption.tabIndex = -1;
        const archiveOption = document.createElement('a');
        archiveOption.href = this.createMementoUri(originalUrl);
        archiveOption.textContent = 'View Latest Archive';
        archiveOption.target = '_blank';
        archiveOption.classList.add('robust-link-dropdown-item');
        archiveOption.setAttribute('role', 'menuitem');
        archiveOption.tabIndex = -1;
        dropdownContent.appendChild(currentLinkOption);
        dropdownContent.appendChild(archiveOption);
        return { currentLinkOption, archiveOption };
    }
    /**
     * Inserts the created dropdown elements into the DOM relative to the anchor element.
     * @param anchorElement The original anchor element.
     * @param dropdownWrapper The main wrapper for the dropdown.
     * @param dropdownArrow The dropdown arrow element.
     * @param dropdownContent The dropdown content element.
     * @private
     */
    _insertDropdownIntoDOM(anchorElement, dropdownWrapper, dropdownArrow, dropdownContent) {
        dropdownWrapper.appendChild(dropdownArrow);
        dropdownWrapper.appendChild(dropdownContent);
        // Insert the wrapper right after the anchor element
        anchorElement.parentNode?.insertBefore(dropdownWrapper, anchorElement.nextSibling);
        // Move the anchor element inside the wrapper
        dropdownWrapper.prepend(anchorElement);
    }
    /**
     * Sets up all necessary event listeners for the dropdown's functionality.
     * @param dropdownArrow The arrow element that toggles the dropdown.
     * @param dropdownContent The content area of the dropdown.
     * @param currentLinkOption The "View Current Link" option (for initial focus).
     * @param originalUrl The original URL for logging purposes.
     * @private
     */
    _setupDropdownEventListeners(dropdownArrow, dropdownContent, currentLinkOption, originalUrl) {
        // Toggle dropdown visibility on arrow click
        dropdownArrow.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();
            const isVisible = dropdownContent.classList.toggle('show');
            dropdownArrow.style.transform = isVisible ? 'rotate(180deg)' : 'rotate(0deg)';
            dropdownArrow.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
            this.logDebug(`Dropdown for ${originalUrl} ${isVisible ? 'opened' : 'closed'}.`);
        };
        // Local document click listener for THIS dropdown (closes if clicked outside)
        document.addEventListener('click', (event) => {
            const dropdownWrapper = dropdownArrow.closest('.robust-link-dropdown-wrapper'); // Get wrapper via ancestor
            if (dropdownContent.classList.contains('show') && dropdownWrapper && !dropdownWrapper.contains(event.target)) {
                dropdownContent.classList.remove('show');
                dropdownArrow.style.transform = 'rotate(0deg)';
                dropdownArrow.setAttribute('aria-expanded', 'false');
                this.logDebug(`Dropdown for ${originalUrl} closed by outside click.`);
            }
        });
        // Local keydown listener for Escape key for THIS dropdown
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && dropdownContent.classList.contains('show')) {
                dropdownContent.classList.remove('show');
                dropdownArrow.style.transform = 'rotate(0deg)';
                dropdownArrow.setAttribute('aria-expanded', 'false');
                this.logDebug(`Dropdown for ${originalUrl} closed by Escape key.`);
                dropdownArrow.focus(); // Return focus to the arrow button
            }
        });
        // Keyboard navigation for arrow button
        dropdownArrow.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                dropdownArrow.click();
            }
        });
        // Keyboard navigation within the dropdown content
        dropdownContent.addEventListener('keydown', (event) => {
            const focusableItems = Array.from(dropdownContent.querySelectorAll('[role="menuitem"]'));
            const focusedItem = document.activeElement;
            let newFocusedItem = null;
            if (focusableItems.length === 0)
                return;
            let focusedItemIndex = focusableItems.indexOf(focusedItem);
            // Handle initial focus or out-of-bounds focus for ArrowDown/Up
            if (focusedItemIndex === -1 || !dropdownContent.contains(focusedItem)) {
                if (event.key === 'ArrowDown') {
                    newFocusedItem = focusableItems[0];
                    event.preventDefault();
                }
                else if (event.key === 'ArrowUp') {
                    newFocusedItem = focusableItems[focusableItems.length - 1];
                    event.preventDefault();
                }
            }
            else {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    const nextIndex = (focusedItemIndex + 1) % focusableItems.length;
                    newFocusedItem = focusableItems[nextIndex];
                }
                else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    const prevIndex = (focusedItemIndex - 1 + focusableItems.length) % focusableItems.length;
                    newFocusedItem = focusableItems[prevIndex];
                }
            }
            if (newFocusedItem) {
                newFocusedItem.focus();
                this.logDebug(`[Dropdown Keydown]: Focused:`, newFocusedItem);
            }
        });
    }
}
