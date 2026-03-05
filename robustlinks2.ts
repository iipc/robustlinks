import * as RobustLinkTypes from './robustlinks.types'; 
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
 *
 * NOTE: This is a reference implementation. Robust Links annotations are always
 * the explicit choice of the page author. This library deliberately does NOT
 * auto-generate or guess annotations on behalf of authors. See:
 * https://hvdsomp.info/robustlinks/#examples
 */
export class RobustLinksV2 {
    // Internal constants for the module -> Not in the constructor because we want to guarantee immutability
    private readonly NAME: string = 'RobustLinksV2';
    private readonly VERSION: string = '3.0.0';

    // Public configurable properties, initialized with @default
    public id: string;
    public urimPattern: string;
    public debug: boolean;
    public timeGate: string;
    public enableDropdown: boolean;
    public dropdownArrowColor: string;
    public dropdownArrowSize: string;
    public dropdownArrowHtml: string;

    // Private properties for internal use
    private exclusions: { [key: string]: (url: string) => boolean };
    private _archivePatternRegexes: RegExp[] | null = null;
    private _patternsLoadingPromise: Promise<void> | null = null;

    /**
     * Creates a new RobustLinksV2 instance with optional configurations.
     * Default values are provided for all configurable properties.
     *
     * @param {RobustLinksConfig} [config] - Optional configuration options to override @default
     */
    constructor(config?: RobustLinkTypes.RobustLinksConfig) {
        config = config || {};

        /**
         * Initializes the ID of the RobustLinksV2 instance.
         * @type {string}
         */
        this.id = `${this.NAME}:${this.VERSION}`;

        /**
         * Initializes the default TimeGate URL for archive lookups.
         * Note: Because this default may change over time, integrators should
         * reference this library via its persistent DOI rather than bundling
         * a local copy. That way, an updated default is picked up automatically.
         *
         * @type {string}
         */
        this.timeGate = config.timeGate || "https://web.archive.org/";

        /**
         * Initializes the URI-M pattern used for constructing Memento URIs with a specific datetime.
         * @type {string}
         */
        this.urimPattern = `${this.timeGate}<datetime>/<urir>`;

        /**
         * Loads and compiles the archive exclusion patterns from JSON.
         * These patterns are used solely to support `isArchiveUrl()`, which
         * callers may use when deciding whether to apply robust-link markup.
         * They do NOT cause this library to automatically annotate or skip links.
         *
         * @type {{ [key: string]: (url: string) => boolean }}
         */
        this._patternsLoadingPromise = this._loadAndCompileArchivePatterns();

        this.exclusions = {
            isKnownArchive: (url: string) => {
                if (this._archivePatternRegexes) {
                    return this._archivePatternRegexes.some(regex => regex.test(url));
                } else {
                    this.logDebug('RobustLinksV2: isKnownArchive called before patterns were loaded.');
                    return false;
                }
            }
        };

        /**
         * If true, debug messages will be logged to the console.
         * @type {boolean}
         */
        this.debug = config.debug || false;

        /**
         * Controls whether a dropdown arrow is rendered next to robust links
         * when `updateAnchorToRobustLink` is called.
         * @type {boolean}
         */
        this.enableDropdown = config.enableDropdown === true;

        /**
         * Color of the dropdown arrow.
         * @default "#333"
         * @type {string}
         */
        this.dropdownArrowColor = config.dropdownArrowColor || "#333";

        /**
         * Font size of the dropdown arrow.
         * @default "12px"
         * @type {string}
         */
        this.dropdownArrowSize = config.dropdownArrowSize || '12px';

        /**
         * HTML content of the dropdown arrow indicator.
         * @default "▼"
         * @type {string}
         */
        this.dropdownArrowHtml = config.dropdownArrowHtml || '▼';

        // /**
        //  * Determines if robust links object will auto run on all present links
        //  * @default false
        //  *
        //  * @type {boolean | object}
        //  */
        // const autoInitConfig = config.autoInit !== undefined ? config.autoInit : false;

        // // --- Auto-initialization based on config ---
        // this._initAuto(autoInitConfig);
    }

    // ---- EXTERNAL FUNCTIONS ----

    // ---- CONVERT TO ROBUST LINK ----

    /**
     * Iterates through all <a> tags matching a given CSS selector and transforms them
     * into robust links using data provided by a callback function.
     *
     * The caller is responsible for supplying a `dataProducer` that returns the
     * correct annotation data for each link. This library will never guess or
     * auto-generate annotation data on behalf of the page author.
     *
     * @param selector The CSS selector string (e.g., 'a', 'a.my-class') to select elements.
     * @param dataProducer A callback function that receives each HTMLAnchorElement and its
     *   index, and returns an object containing the originalUrl, versionDate, and optional
     *   versionSnapshots and newHref for that link.
     *   Return null or undefined to leave a particular link unchanged.
     * @param rootElement The HTML element to search within. @default `document.body`.
     * @returns An array of HTMLAnchorElement that were successfully made robust.
     */
    public async makeAllLinksRobust(
        selector: string,
        dataProducer: (anchor: HTMLAnchorElement, index: number) => Promise<{
            originalUrl: string;
            versionDate: Date;
            versionSnapshots?: RobustLinkTypes.RobustLinkSnapshot[];
            newHref?: string;
        } | null | undefined>,
        rootElement?: HTMLElement
    ): Promise<HTMLAnchorElement[]> {
        this.logDebug(`RobustLinksV2: Attempting to make all links matching selector "${selector}" robust.`);
        const updatedLinks: HTMLAnchorElement[] = [];
        const scope = rootElement || document.body;
        const anchorElements = scope.querySelectorAll<HTMLAnchorElement>(selector);

        await this.getExclusionsReadyPromise();

        const results = await Promise.allSettled(
            Array.from(anchorElements).map(async (anchor, index) => {
                try {
                    const linkData = await dataProducer(anchor, index);
                    if (linkData) {
                        this.updateAnchorToRobustLink(anchor, linkData);
                        return anchor;
                    } else {
                        this.logDebug(`RobustLinksV2: Skipping link "${anchor.href}" as dataProducer returned null/undefined.`);
                        return null;
                    }
                } catch (error: unknown) {
                    if (error instanceof Error) {
                        console.error(`RobustLinksV2: Error making link with href "${anchor.href}" robust. Error: ${error.message}`);
                    } else {
                        console.error(`RobustLinksV2: An unknown error occurred making link with href "${anchor.href}" robust.`, error);
                    }
                    return null;
                }
            })
        );

        results.forEach(result => {
            if (result.status === 'fulfilled' && result.value !== null) {
                updatedLinks.push(result.value);
            }
        });

        this.logDebug(`RobustLinksV2: Successfully made ${updatedLinks.length} links robust.`);
        return updatedLinks;
    }

    /**
     * Updates an existing HTML <a> element to become a Robust Link by setting
     * its data-originalurl, data-versiondate, and optionally data-versionurl attributes.
     * It can also optionally update the href attribute.
     *
     * @param anchorElement The HTMLAnchorElement to update.
     * @param options An object containing the necessary data to make the link robust.
     *   - originalUrl: The URI of the resource that motivates the Robust Link. Must be absolute.
     *   - versionDate: The intended linking datetime.
     *   - versionSnapshots: Optional array of parsed snapshot URIs and their datetimes.
     *   - newHref: Optional string to set as the new href attribute for the anchor.
     * @throws {Error} if inputs are invalid or required data is missing.
     */
    public updateAnchorToRobustLink(
        anchorElement: HTMLAnchorElement,
        options: {
            originalUrl: string;
            versionDate: Date;
            versionSnapshots?: RobustLinkTypes.RobustLinkSnapshot[];
            newHref?: string;
        }
    ): void {
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

        const versionDateStr = options.versionDate.toISOString().split('T')[0];
        anchorElement.setAttribute('data-versiondate', versionDateStr);

        if (options.versionSnapshots && options.versionSnapshots.length > 0) {
            const snapshotParts = options.versionSnapshots.map(s => `${s.uri}${s.datetime ? ` ${s.datetime}` : ''}`);
            anchorElement.setAttribute('data-versionurl', snapshotParts.join(' '));
        } else {
            anchorElement.removeAttribute('data-versionurl');
        }

        if (options.newHref) {
            if (RobustLinksV2.isValidAbsoluteUrl(options.newHref)) {
                anchorElement.setAttribute('href', options.newHref);
            } else {
                this.logDebug(`RobustLinksV2: newHref "${options.newHref}" is not a valid absolute HTTP/HTTPS URL. Href not updated.`);
            }
        }

        this.logDebug(`RobustLinksV2: Updated <a> tag with href "${anchorElement.href}" to robust link.`);
    }

    /**
     * Generates an HTML <a> tag string for a given ParsedRobustLink object.
     * This can be used to programmatically create Robust Links for insertion into the DOM.
     *
     * @param parsedLink The ParsedRobustLink object to convert into HTML.
     * @returns A string representing the HTML <a> tag.
     */
    public createRobustLinkHtml(parsedLink: RobustLinkTypes.ParsedRobustLink): string {
        const versionDateStr = parsedLink.versionDate.toISOString().split('T')[0];

        let versionUrlAttr = '';
        if (parsedLink.versionSnapshots && parsedLink.versionSnapshots.length > 0) {
            const snapshotParts = parsedLink.versionSnapshots.map(s =>
                `${s.uri}${s.datetime ? ` ${s.datetime}` : ''}`
            );
            versionUrlAttr = ` data-versionurl="${snapshotParts.join(' ')}"`;
        }

        const linkText = parsedLink.linkText || parsedLink.href;

        return `<a href="${parsedLink.href}" data-originalurl="${parsedLink.originalUrl}" data-versiondate="${versionDateStr}"${versionUrlAttr}>${linkText}</a>`;
    }

    /**
     * Generates a Memento URI (URI-M) using the configured `urimPattern`.
     * This method creates a URI that points to a specific historical version
     * of an original resource at a given datetime.
     *
     * @param originalUrl The URI of the original resource (URI-R). Must be an absolute HTTP/HTTPS URL.
     * @param dateTime Optional. The desired historical datetime for the memento. If omitted,
     *   the URI will act as a TimeGate to the latest known Memento.
     * @returns A string representing the Memento URI (URI-M or URI-G).
     * @throws {Error} if the originalUrl is not a valid absolute HTTP/HTTPS URL.
     */
    public createMementoUri(originalUrl: string, dateTime?: Date): string {
        if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl)) {
            this.logDebug(`RobustLinksV2: originalUrl "${originalUrl}" is not a valid absolute HTTP/HTTPS URL for Memento URI creation.`);
            throw new Error(`Invalid originalUrl: "${originalUrl}" is not an absolute HTTP/HTTPS URI.`);
        }

        let mementoUri: string;

        if (dateTime) {
            const datetimeString = this.formatDateTime(dateTime);
            mementoUri = this.urimPattern
                .replace('<datetime>', datetimeString)
                .replace('<urir>', originalUrl);
            this.logDebug(`RobustLinksV2: Created Memento URI-M: ${mementoUri} for originalUrl: ${originalUrl} at datetime: ${dateTime.toISOString()}`);
        } else {
            mementoUri = `${this.timeGate}${originalUrl}`;
            this.logDebug(`RobustLinksV2: Created Memento TimeGate URI (latest): ${mementoUri} for originalUrl: ${originalUrl}`);
        }

        return mementoUri;
    }

    // ---- DATA VALIDATION ----

    /**
     * Checks if a string is a valid absolute HTTP or HTTPS URL.
     * This method is `static` because it doesn't depend on any instance properties.
     *
     * @param url The string to validate.
     * @returns True if it's a valid absolute HTTP/HTTPS URL, false otherwise.
     */
    public static isValidAbsoluteUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return (parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:') && parsedUrl.hostname.length > 0;
        } catch (e) {
            return false;
        }
    }

    /**
     * Parses a datetime string according to the Robust Links specification rules.
     * Handles both ISO8601 and Web Archive URI formats, and correctly interprets
     * date-only strings as noon UTC.
     *
     * @param datetimeStr The datetime string to parse.
     * @returns A Date object representing the parsed datetime, or null if invalid.
     */
    public static parseDatetime(datetimeStr: RobustLinkTypes.RobustLinkDatetimeString): Date | null {
        // ISO8601 Date: YYYY-MM-DD
        const isoDateMatch = datetimeStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (isoDateMatch) {
            return new Date(Date.UTC(
                parseInt(isoDateMatch[1]),
                parseInt(isoDateMatch[2]) - 1,
                parseInt(isoDateMatch[3]),
                12, 0, 0, 0
            ));
        }

        // ISO8601 Datetime: YYYY-MM-DDThh:mm:ssZ
        const isoDatetimeMatch = datetimeStr.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})Z$/);
        if (isoDatetimeMatch) {
            return new Date(Date.UTC(
                parseInt(isoDatetimeMatch[1]),
                parseInt(isoDatetimeMatch[2]) - 1,
                parseInt(isoDatetimeMatch[3]),
                parseInt(isoDatetimeMatch[4]),
                parseInt(isoDatetimeMatch[5]),
                parseInt(isoDatetimeMatch[6])
            ));
        }

        // Web Archive URI Date: YYYYMMDD
        const waDateMatch = datetimeStr.match(/^(\d{4})(\d{2})(\d{2})$/);
        if (waDateMatch) {
            return new Date(Date.UTC(
                parseInt(waDateMatch[1]),
                parseInt(waDateMatch[2]) - 1,
                parseInt(waDateMatch[3]),
                12, 0, 0, 0
            ));
        }

        // Web Archive URI Datetime: YYYYMMDDhhmmss
        const waDatetimeMatch = datetimeStr.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/);
        if (waDatetimeMatch) {
            return new Date(Date.UTC(
                parseInt(waDatetimeMatch[1]),
                parseInt(waDatetimeMatch[2]) - 1,
                parseInt(waDatetimeMatch[3]),
                parseInt(waDatetimeMatch[4]),
                parseInt(waDatetimeMatch[5]),
                parseInt(waDatetimeMatch[6])
            ));
        }

        return null;
    }

    /**
     * Parses the data-versionurl string into an array of RobustLinkSnapshot objects.
     *
     * @param versionUrlString The raw string value of the data-versionurl attribute.
     * @returns An array of RobustLinkSnapshot.
     */
    public static parseVersionUrl(versionUrlString: string | undefined): RobustLinkTypes.RobustLinkSnapshot[] {
        if (!versionUrlString) {
            return [];
        }

        const snapshots: RobustLinkTypes.RobustLinkSnapshot[] = [];
        const parts = versionUrlString.split(' ').filter(part => part.length > 0);
        let i = 0;

        while (i < parts.length) {
            const uri = parts[i];
            if (!RobustLinksV2.isValidAbsoluteUrl(uri)) {
                console.warn(`RobustLinksV2: Skipping invalid URI in data-versionurl: "${uri}"`);
                i++;
                continue;
            }

            const nextPart = parts[i + 1];
            const isDatetime = nextPart && RobustLinksV2.parseDatetime(nextPart) !== null;

            if (isDatetime) {
                snapshots.push({ uri, datetime: nextPart });
                i += 2;
            } else {
                snapshots.push({ uri });
                i += 1;
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
     * @param defaultLinkText Optional text content of the <a> tag.
     * @returns A ParsedRobustLink object.
     * @throws {Error} if required attributes are missing or invalid.
     */
    public parseRobustLink(rawAttributes: RobustLinkTypes.RobustLinkRawAttributes, defaultLinkText?: string): RobustLinkTypes.ParsedRobustLink {
        let { href, 'data-originalurl': originalUrl, 'data-versiondate': versionDateStr, 'data-versionurl': versionUrlStr } = rawAttributes;

        // Apply default for data-originalurl if missing (Section 3.5)
        if (!originalUrl && href) {
            this.logDebug(`RobustLinksV2: data-originalurl missing, defaulting to href: ${href}`);
            originalUrl = href;
        }

        if (!href) {
            throw new Error("Robust Link parsing failed: 'href' attribute is missing and required.");
        }
        if (!originalUrl) {
            throw new Error("Robust Link parsing failed: 'data-originalurl' (or default from href) is missing and required.");
        }
        if (!versionDateStr) {
            throw new Error("Robust Link parsing failed: 'data-versiondate' attribute is missing and required.");
        }

        if (!RobustLinksV2.isValidAbsoluteUrl(href)) {
            throw new Error(`Invalid href: "${href}" is not an absolute URI.`);
        }
        if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl)) {
            throw new Error(`Invalid data-originalurl: "${originalUrl}" is not an absolute URI.`);
        }

        const parsedVersionDate = RobustLinksV2.parseDatetime(versionDateStr);
        if (!parsedVersionDate) {
            throw new Error(`Invalid data-versiondate format: "${versionDateStr}". Must follow ISO8601 or Web Archive URI datetime formats.`);
        }

        const parsedVersionSnapshots = RobustLinksV2.parseVersionUrl(versionUrlStr);

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
    public findAndParseRobustLinks(rootElement?: HTMLElement): RobustLinkTypes.ParsedRobustLink[] {
        this.logDebug('RobustLinksV2: Searching for and parsing existing robust links.');
        const links: RobustLinkTypes.ParsedRobustLink[] = [];
        const scope = rootElement || document.body;

        // Select any anchor that has at least one robust link attribute — this ensures
        // links missing data-originalurl or data-versiondate are still caught and
        // error-logged rather than silently ignored.
        const anchorElements = scope.querySelectorAll('a[data-originalurl], a[data-versiondate]');

        anchorElements.forEach(anchor => {
            // Use getAttribute('href') rather than anchor.href so that relative hrefs
            // are not silently resolved to absolute URLs by the browser before validation.
            const href = anchor.getAttribute('href');
            const dataOriginalUrl = anchor.getAttribute('data-originalurl');
            const dataVersionDate = anchor.getAttribute('data-versiondate');
            const dataVersionUrl = anchor.getAttribute('data-versionurl');
            const linkText = anchor.textContent || undefined;

            const rawAttributes: RobustLinkTypes.RobustLinkRawAttributes = {
                href: href || '',
                'data-originalurl': dataOriginalUrl || undefined,
                'data-versiondate': dataVersionDate || undefined,
                'data-versionurl': dataVersionUrl || undefined
            };

            try {
                const parsedLink = this.parseRobustLink(rawAttributes, linkText);
                links.push(parsedLink);
            } catch (error: any) {
                console.error(`RobustLinksV2: Could not parse robust link for href "${href || 'N/A'}". Error: ${error.message}`);
            }
        });

        this.logDebug(`RobustLinksV2: Found and parsed ${links.length} robust links.`);
        return links;
    }

    /**
     * Determines if a given URL matches a known web archive pattern.
     *
     * This is a utility provided for callers that want to inspect a URL before
     * deciding how to annotate it. It does NOT influence how this library
     * processes or skips any links automatically.
     *
     * Note: Per the Robust Links specification, Memento URIs may legitimately
     * appear as the `href` of a robust link (e.g., linking directly to a snapshot).
     * Do not assume that an archive URL should be excluded from annotation.
     * See: https://hvdsomp.info/robustlinks/#example-snapshot-1
     *
     * @param url The URL to check.
     * @returns True if the URL matches a known archive pattern, false otherwise.
     */
    public isArchiveUrl(url: string): boolean {
        return this.exclusions.isKnownArchive(url);
    }

    // ---- HELPER FUNCTIONS -----

    /**
     * Returns a promise that resolves once archive exclusion patterns have been loaded.
     * Useful for callers that want to ensure `isArchiveUrl` is ready before use.
     */
    public async getExclusionsReadyPromise(): Promise<void> {
        return this._patternsLoadingPromise || Promise.resolve();
    }


    // ---- INTERNAL FUNCTIONS ----

    // /**
    //  * Autoinitializes the robust links class based off of a config, selecting specific links to be made
    //  * Robust, with custom dropdown arrows. This is now an async function to handle the link checking.
    //  * @private
    //  * @returns {null}
    //  */
    // private async _initAuto(autoInitConfig: RobustLinkTypes.RobustLinksConfig['autoInit']): Promise<void> {
    //     if (!autoInitConfig) {
    //         this.logDebug('RobustLinksV2: Auto-initialization disabled due to no init config.');
    //         return;
    //     }
    //
    //     this.logDebug('RobustLinksV2: Auto-initialization enabled.');
    //
    //     let selector: string = 'a:not([data-originalurl])';
    //     let dataProducer: ((anchor: HTMLAnchorElement, index: number) => Promise<{
    //         originalUrl: string;
    //         versionDate: Date;
    //         versionSnapshots?: RobustLinkTypes.RobustLinkSnapshot[];
    //         newHref?: string;
    //     } | null | undefined>) | undefined;
    //     let rootElement: HTMLElement | undefined = undefined;
    //
    //     if (typeof autoInitConfig === 'boolean' && autoInitConfig === true) {
    //         dataProducer = this._createDefaultDataProducer();
    //         this.logDebug('RobustLinksV2: Auto-initializing with default selector and data producer.');
    //     } else if (typeof autoInitConfig === 'object') {
    //         selector = autoInitConfig.selector || selector;
    //         rootElement = autoInitConfig.rootElement;
    //
    //         if (autoInitConfig.dataProducer) {
    //             dataProducer = (anchor: HTMLAnchorElement, index: number) => {
    //                 const producerResult = autoInitConfig.dataProducer!.call(this, anchor, index);
    //                 return Promise.resolve(producerResult);
    //             };
    //             this.logDebug('RobustLinksV2: Auto-initializing with specified selector and custom data producer.');
    //         } else {
    //             dataProducer = this._createDefaultDataProducer();
    //         }
    //     }
    //
    //     if (dataProducer) {
    //         const updatedLinks = await this.makeAllLinksRobust(selector, dataProducer, rootElement);
    //         this.logDebug(`RobustLinksV2: Auto-initialization completed. Robustified ${updatedLinks.length} links.`);
    //     }
    // }

    // /**
    //  * @WIP unfinished function
    //  *
    //  * Checks if a link is "rotted" by performing a network request.
    //  * A link is considered rotted if it returns a non-successful HTTP status code (4xx, 5xx)
    //  * or if the request fails completely (e.g., due to a DNS error).
    //  *
    //  * @param url The URL to check.
    //  * @returns A promise that resolves to `true` if the link is rotted, `false` otherwise.
    //  */
    // private async _isLinkRotted(url: string): Promise<boolean> {
    //     this.logDebug(`_isLinkRotted: Checking if ${url} is rotted (simulated).`);
    //     return true;
    // }

    // /**
    //  * Creates a default dataProducer function that checks if a link is rotted
    //  * before generating robust link data.
    //  *
    //  * @returns A `dataProducer` function that returns a Promise.
    //  */
    // private _createDefaultDataProducer(): (anchor: HTMLAnchorElement, index: number) => Promise<{
    //     originalUrl: string;
    //     versionDate: Date;
    //     versionSnapshots?: RobustLinkTypes.RobustLinkSnapshot[];
    //     newHref?: string;
    // } | null | undefined> {
    //     return async (anchor: HTMLAnchorElement, index: number) => {
    //         const originalUrl = anchor.href;
    //         const isArchiveUrl = this.isArchiveUrl(originalUrl);
    //
    //         if (!RobustLinksV2.isValidAbsoluteUrl(originalUrl) || isArchiveUrl) {
    //             this.logDebug(`RobustLinksV2: Skipping "${originalUrl}" (invalid or already archive).`);
    //             return null;
    //         }
    //
    //         const isRotted = await this._isLinkRotted(originalUrl);
    //
    //         if (isRotted) {
    //             this.logDebug(`RobustLinksV2: Link "${originalUrl}" is rotted. Robustifying.`);
    //             const versionDate = new Date();
    //             const newHref = this.createMementoUri(originalUrl);
    //             return {
    //                 originalUrl: originalUrl,
    //                 versionDate: versionDate,
    //                 newHref: newHref,
    //                 versionSnapshots: []
    //             };
    //         } else {
    //             this.logDebug(`RobustLinksV2: Link "${originalUrl}" is healthy. Skipping robustification.`);
    //             return null;
    //         }
    //     };
    // }

    /**
     * Formats a Date object into the 14-digit YYYYMMDDhhmmss UTC string required for Memento URIs.
     *
     * @param date The Date object to format.
     * @returns A 14-digit datetime string (e.g., "20231026143000").
     */
    private formatDateTime(date: Date): string {
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        const seconds = String(date.getUTCSeconds()).padStart(2, '0');

        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }

    /**
     * Logs a debug message to the console if `this.debug` is true.
     *
     * @param message The message to log.
     * @param optionalParams Optional additional parameters to log.
     */
    private logDebug(message: string, ...optionalParams: any[]): void {
        if (this.debug) {
            console.log(`[${this.NAME} DEBUG] ${message}`, ...optionalParams);
        }
    }

    /**
     * Loads archive patterns from JSON and compiles them into an array of RegExp objects.
     *
     * @private
     * @returns {Promise<void>} A promise that resolves when patterns are loaded and compiled.
     */
    private async _loadAndCompileArchivePatterns(): Promise<void> {
        try {
            const response = await fetch('./archiveExclusions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const archivePatterns: string[] = await response.json();
            this._archivePatternRegexes = archivePatterns.map(pattern => {
                const processedPattern = pattern.replace(/\./g, '\\.');
                return new RegExp(`^${processedPattern}`, 'i');
            });
            this.logDebug('RobustLinksV2: Archive patterns loaded and compiled.');
        } catch (error) {
            console.error('RobustLinksV2: Error loading archive exclusion patterns:', error);
            this._archivePatternRegexes = [];
        }
    }

    /**
     * Attaches a dropdown menu to a robust link.
     *
     * @param anchorElement The HTMLAnchorElement to attach the dropdown to.
     * @param originalUrl The original URL of the link, used to generate dropdown options.
     * @private
     */
    private _attachDropdownToLink(anchorElement: HTMLAnchorElement, originalUrl: string): void {
        this.logDebug(`Attaching dropdown to link: ${originalUrl}`);

        const { dropdownWrapper, dropdownArrow, dropdownContent } = this._createDropdownElements();
        const { currentLinkOption, archiveOption } = this._addDropdownOptions(dropdownContent, originalUrl);

        this._insertDropdownIntoDOM(anchorElement, dropdownWrapper, dropdownArrow, dropdownContent);

        this._setupDropdownEventListeners(
            dropdownArrow,
            dropdownContent,
            currentLinkOption,
            originalUrl
        );

        anchorElement.classList.add('robust-link-with-dropdown');
    }

    /**
     * Creates the core HTML elements for the dropdown: wrapper, arrow, and content.
     *
     * @private
     * @returns An object containing the created HTMLElement references.
     */
    private _createDropdownElements(): {
        dropdownWrapper: HTMLSpanElement;
        dropdownArrow: HTMLSpanElement;
        dropdownContent: HTMLDivElement;
    } {
        const dropdownWrapper = document.createElement('span');
        dropdownWrapper.className = 'robust-link-dropdown-wrapper';

        const dropdownArrow = document.createElement('span');
        dropdownArrow.className = 'robust-link-dropdown-arrow';
        dropdownArrow.innerHTML = this.dropdownArrowHtml;
        dropdownArrow.style.color = this.dropdownArrowColor;
        dropdownArrow.style.fontSize = this.dropdownArrowSize;
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
     *
     * @param dropdownContent The HTMLDivElement representing the dropdown's content area.
     * @param originalUrl The original URL to be used for the options.
     * @private
     * @returns An object containing references to the created option elements.
     */
    private _addDropdownOptions(dropdownContent: HTMLDivElement, originalUrl: string): {
        currentLinkOption: HTMLAnchorElement;
        archiveOption: HTMLAnchorElement;
    } {
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
     *
     * @param anchorElement The original anchor element.
     * @param dropdownWrapper The main wrapper for the dropdown.
     * @param dropdownArrow The dropdown arrow element.
     * @param dropdownContent The dropdown content element.
     * @private
     */
    private _insertDropdownIntoDOM(
        anchorElement: HTMLAnchorElement,
        dropdownWrapper: HTMLSpanElement,
        dropdownArrow: HTMLSpanElement,
        dropdownContent: HTMLDivElement
    ): void {
        dropdownWrapper.appendChild(dropdownArrow);
        dropdownWrapper.appendChild(dropdownContent);
        anchorElement.parentNode?.insertBefore(dropdownWrapper, anchorElement.nextSibling);
        dropdownWrapper.prepend(anchorElement);
    }

    /**
     * Sets up all necessary event listeners for the dropdown's functionality.
     *
     * @param dropdownArrow The arrow element that toggles the dropdown.
     * @param dropdownContent The content area of the dropdown.
     * @param currentLinkOption The "View Current Link" option (for initial focus).
     * @param originalUrl The original URL for logging purposes.
     * @private
     */
    private _setupDropdownEventListeners(
        dropdownArrow: HTMLSpanElement,
        dropdownContent: HTMLDivElement,
        currentLinkOption: HTMLAnchorElement,
        originalUrl: string
    ): void {
        dropdownArrow.onclick = (event) => {
            event.preventDefault();
            event.stopPropagation();

            const isVisible = dropdownContent.classList.toggle('show');
            dropdownArrow.style.transform = isVisible ? 'rotate(180deg)' : 'rotate(0deg)';
            dropdownArrow.setAttribute('aria-expanded', isVisible ? 'true' : 'false');
            this.logDebug(`Dropdown for ${originalUrl} ${isVisible ? 'opened' : 'closed'}.`);
        };

        document.addEventListener('click', (event) => {
            const dropdownWrapper = dropdownArrow.closest('.robust-link-dropdown-wrapper');
            if (dropdownContent.classList.contains('show') && dropdownWrapper && !dropdownWrapper.contains(event.target as Node)) {
                dropdownContent.classList.remove('show');
                dropdownArrow.style.transform = 'rotate(0deg)';
                dropdownArrow.setAttribute('aria-expanded', 'false');
                this.logDebug(`Dropdown for ${originalUrl} closed by outside click.`);
            }
        });

        document.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Escape' && dropdownContent.classList.contains('show')) {
                dropdownContent.classList.remove('show');
                dropdownArrow.style.transform = 'rotate(0deg)';
                dropdownArrow.setAttribute('aria-expanded', 'false');
                this.logDebug(`Dropdown for ${originalUrl} closed by Escape key.`);
                dropdownArrow.focus();
            }
        });

        dropdownArrow.addEventListener('keydown', (event: KeyboardEvent) => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                dropdownArrow.click();
            }
        });

        dropdownContent.addEventListener('keydown', (event: KeyboardEvent) => {
            const focusableItems = Array.from(dropdownContent.querySelectorAll('[role="menuitem"]')) as HTMLElement[];
            const focusedItem = document.activeElement as HTMLElement;
            let newFocusedItem: HTMLElement | null = null;

            if (focusableItems.length === 0) return;

            let focusedItemIndex = focusableItems.indexOf(focusedItem);

            if (focusedItemIndex === -1 || !dropdownContent.contains(focusedItem)) {
                if (event.key === 'ArrowDown') {
                    newFocusedItem = focusableItems[0];
                    event.preventDefault();
                } else if (event.key === 'ArrowUp') {
                    newFocusedItem = focusableItems[focusableItems.length - 1];
                    event.preventDefault();
                }
            } else {
                if (event.key === 'ArrowDown') {
                    event.preventDefault();
                    newFocusedItem = focusableItems[(focusedItemIndex + 1) % focusableItems.length];
                } else if (event.key === 'ArrowUp') {
                    event.preventDefault();
                    newFocusedItem = focusableItems[(focusedItemIndex - 1 + focusableItems.length) % focusableItems.length];
                }
            }

            if (newFocusedItem) {
                newFocusedItem.focus();
                this.logDebug(`[Dropdown Keydown]: Focused:`, newFocusedItem);
            }
        });
    }
}