/**
 * @file robustlinks.types.ts
 * @overview
 * All types and interfaces used by the RobustLinksV2 class and related robust link utilities.
 *
 * This file centralizes type definitions for configuration, robust link data structures,
 * and utility types. Keeping these types in a dedicated file improves maintainability,
 * reusability, and clarity across the codebase.
 *
 * @author Dylan O'Connor
 * @date 2025-07-11
 */

/**
 * Configuration options for the RobustLinksV2 instance.
 *
 * All properties are optional and have sensible defaults in the RobustLinksV2 constructor.
 *
 * @example
 * const config: RobustLinksConfig = {
 *   debug: true,
 *   timeGate: 'https://web.archive.org/',
 *   enableDropdown: true,
 *   dropdownArrowColor: '#0074D9',
 *   autoInit: {
 *     selector: '.content a',
 *     dataProducer: (anchor, idx) => ({
 *       originalUrl: anchor.href,
 *       versionDate: new Date(),
 *     })
 *   }
 * };
 */
export interface RobustLinksConfig {
    /**
     * An optional unique identifier for the RobustLinksV2 instance.
     * Useful for debugging when multiple instances might exist.
     *
     * @default "RobustLinksV2:3.0.0"
     */
    id?: string;

    /**
     * If `true`, enables verbose logging of debug messages to the console.
     *
     * @default false
     */
    debug?: boolean;

    /**
     * The base URL of the Memento TimeGate service used for archive lookups.
     * This URL should typically end with a slash.
     *
     * @default "https://web.archive.org/"
     */
    timeGate?: string;

    /**
     * Controls the automatic discovery and conversion of links into Robust Links
     * when the RobustLinksV2 instance is initialized.
     *
     * - `true`: Enables auto-initialization with default behavior. Links matching
     *   `a:not([data-originalurl])` will be processed using a default data producer.
     * - `false`: Disables auto-initialization.
     * - `object`: Provides fine-grained control over the auto-initialization process.
     *
     * @example
     * autoInit: {
     *   selector: '.main-content a',
     *   dataProducer: (anchor, idx) => ({
     *     originalUrl: anchor.href,
     *     versionDate: new Date()
     *   })
     * }
     */
    autoInit?: boolean | {
        /**
         * A CSS selector string that targets specific <a> elements for auto-initialization.
         *
         * @default 'a:not([data-originalurl])'
         */
        selector?: string;

        /**
         * A custom function that provides the necessary data (originalUrl, versionDate, etc.)
         * to convert a regular HTML <a> element into a Robust Link.
         *
         * @param anchor The HTMLAnchorElement currently being processed.
         * @param index The zero-based index of the anchor within the queried list.
         * @returns An object containing the robust link data, or null/undefined to skip this anchor.
         */
        dataProducer?: (
            anchor: HTMLAnchorElement,
            index: number
        ) => {
            originalUrl: string;
            versionDate: Date;
            versionSnapshots?: RobustLinkSnapshot[];
            newHref?: string;
        } | null | undefined;

        /**
         * The root HTML element within which the selector should search for links.
         *
         * @default document.body
         */
        rootElement?: HTMLElement;
    };

    /**
     * If `true`, a small dropdown arrow will be appended next to Robust Links.
     * Clicking this arrow will reveal a menu (e.g., "Archived Version", "Current Destination").
     *
     * @default false
     */
    enableDropdown?: boolean;

    /**
     * The CSS color value for the dropdown arrow.
     * Examples: "#333", "blue", "rgb(51, 51, 51)".
     *
     * @default "#333"
     */
    dropdownArrowColor?: string;

    /**
     * The CSS font-size value for the dropdown arrow.
     * Examples: '6px', '0.8em', '1rem'.
     * This primarily affects text-based arrows (dropdownArrowHtml).
     *
     * @default '6px'
     */
    dropdownArrowSize?: string;

    /**
     * A custom HTML string to be used for the dropdown arrow icon.
     * Can be a simple character (e.g., '▼'), an SVG icon, or an HTML entity.
     *
     * @default '▼'
     */
    dropdownArrowHtml?: string;
}

/**
 * Options for creating a dropdown menu option for robust links.
 *
 * @property text        The visible label for the dropdown option.
 * @property href        The URL the option should navigate to.
 * @property targetBlank If true, opens the link in a new tab/window.
 *
 * @example
 * const option: DropdownOptionConfig = {
 *   text: 'Archived Version',
 *   href: 'https://web.archive.org/web/20210101/https://example.com',
 *   targetBlank: true
 * };
 */
export interface DropdownOptionConfig {
    text: string;
    href: string;
    targetBlank?: boolean;
}

/**
 * Defines the accepted formats for robust link datetimes.
 *
 * - YYYY-MM-DD (ISO8601 date)
 * - YYYY-MM-DDThh:mm:ssZ (ISO8601 datetime UTC)
 * - YYYYMMDD (Web Archive URI date)
 * - YYYYMMDDhhmmss (Web Archive URI datetime)
 *
 * @example
 * const dt1: RobustLinkDatetimeString = '2023-01-01';
 * const dt2: RobustLinkDatetimeString = '20230101123000';
 */
export type RobustLinkDatetimeString = string;

/**
 * Represents a single snapshot entry within the data-versionurl attribute.
 *
 * @property uri      The URI of the snapshot (must be absolute).
 * @property datetime The datetime the snapshot was created, if provided. Interpreted as noon UTC if date-only.
 *
 * @example
 * const snapshot: RobustLinkSnapshot = {
 *   uri: 'https://web.archive.org/web/20220101000000/https://baz.com',
 *   datetime: '2022-01-01'
 * };
 */
export interface RobustLinkSnapshot {
    uri: string;
    datetime?: RobustLinkDatetimeString;
}

/**
 * Represents the raw HTML data- attributes used for a Robust Link.
 * These are the strings directly read from the DOM.
 *
 * @property href              The href attribute of the <a> element.
 * @property data-originalurl  The data-originalurl attribute, if present.
 * @property data-versiondate  The data-versiondate attribute, if present.
 * @property data-versionurl   The data-versionurl attribute, if present.
 *
 * @example
 * const raw: RobustLinkRawAttributes = {
 *   href: 'https://web.archive.org/web/20210101/https://example.com',
 *   'data-originalurl': 'https://example.com',
 *   'data-versiondate': '2021-01-01',
 *   'data-versionurl': undefined
 * };
 */
export interface RobustLinkRawAttributes {
    href: string;
    'data-originalurl'?: string;
    'data-versiondate'?: string;
    'data-versionurl'?: string;
}

/**
 * A more structured and parsed representation of a Robust Link after validation.
 *
 * @property href             The default link target URI (archive or original).
 * @property originalUrl      The URI of the resource that motivates the Robust Link (always absolute).
 * @property versionDate      The intended linking datetime, parsed into a Date object (UTC).
 * @property versionSnapshots An array of parsed snapshot URIs and their datetimes.
 * @property linkText         The original HTML text content of the <a> tag, if available.
 *
 * @example
 * const parsed: ParsedRobustLink = {
 *   href: 'https://web.archive.org/web/20210101/https://example.com',
 *   originalUrl: 'https://example.com',
 *   versionDate: new Date('2021-01-01T12:00:00Z'),
 *   versionSnapshots: [],
 *   linkText: 'Example'
 * };
 */
export interface ParsedRobustLink {
    href: string;
    originalUrl: string;
    versionDate: Date;
    versionSnapshots: RobustLinkSnapshot[];
    linkText?: string;
}