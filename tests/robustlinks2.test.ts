import { RobustLinksV2 } from '../robustlinks2';
import * as RobustLinkTypes from '../robustlinks.types';

describe('RobustLinksV2', () => {
    let instance: RobustLinksV2;

    beforeEach(() => {
        instance = new RobustLinksV2({ debug: false });
    });
    

    describe('isValidAbsoluteUrl', () => {
        it('should validate absolute HTTP/HTTPS URLs', () => {
            expect(RobustLinksV2.isValidAbsoluteUrl('https://example.com')).toBe(true);
            expect(RobustLinksV2.isValidAbsoluteUrl('http://example.com')).toBe(true);
            expect(RobustLinksV2.isValidAbsoluteUrl('ftp://example.com')).toBe(false);
            expect(RobustLinksV2.isValidAbsoluteUrl('/relative/path')).toBe(false);
        });
    });

    describe('parseDatetime', () => {
        it('should parse ISO8601 date', () => {
            const date = RobustLinksV2.parseDatetime('2023-07-09');
            expect(date).toBeInstanceOf(Date);
            expect(date?.getUTCFullYear()).toBe(2023);
            expect(date?.getUTCMonth()).toBe(6); // July is 6 (0-indexed)
            expect(date?.getUTCDate()).toBe(9);
        });
        it('should parse Web Archive URI datetime', () => {
            const date = RobustLinksV2.parseDatetime('20230709123456');
            expect(date).toBeInstanceOf(Date);
            expect(date?.getUTCFullYear()).toBe(2023);
            expect(date?.getUTCMonth()).toBe(6);
            expect(date?.getUTCDate()).toBe(9);
            expect(date?.getUTCHours()).toBe(12);
            expect(date?.getUTCMinutes()).toBe(34);
            expect(date?.getUTCSeconds()).toBe(56);
        });
        it('should return null for invalid format', () => {
            expect(RobustLinksV2.parseDatetime('notadate')).toBeNull();
        });
    });

    describe('parseRobustLink', () => {
        it('should parse valid robust link attributes', () => {
            const attrs: RobustLinkTypes.RobustLinkRawAttributes = {
                href: 'https://example.com',
                'data-originalurl': 'https://example.com',
                'data-versiondate': '2023-07-09',
                'data-versionurl': 'https://archive.org 20230709123456'
            };
            const parsed = instance.parseRobustLink(attrs, 'Example');
            expect(parsed.href).toBe('https://example.com');
            expect(parsed.originalUrl).toBe('https://example.com');
            expect(parsed.versionDate).toBeInstanceOf(Date);
            expect(parsed.versionSnapshots.length).toBe(1);
            expect(parsed.linkText).toBe('Example');
        });
        it('should throw if required attributes are missing', () => {
            const attrs: RobustLinkTypes.RobustLinkRawAttributes = {
                href: '',
                'data-originalurl': undefined,
                'data-versiondate': undefined,
                'data-versionurl': undefined
            };
            expect(() => instance.parseRobustLink(attrs)).toThrow();
        });
    });

    describe('createMementoUri', () => {
        it('should create a TimeGate URI if no datetime is given', () => {
            const uri = instance.createMementoUri('https://example.com');
            expect(uri).toContain('https://web.archive.org/https://example.com');
        });
        it('should create a URI-M if datetime is given', () => {
            const date = new Date(Date.UTC(2023, 6, 9, 12, 0, 0));
            const uri = instance.createMementoUri('https://example.com', date);
            expect(uri).toContain('20230709120000');
            expect(uri).toContain('https://example.com');
        });
    });

    describe('createRobustLinkHtml', () => {
        it('should generate a valid <a> tag string', () => {
            const parsed: RobustLinkTypes.ParsedRobustLink = {
                href: 'https://example.com',
                originalUrl: 'https://example.com',
                versionDate: new Date('2023-07-09T12:00:00Z'),
                versionSnapshots: [],
                linkText: 'Example'
            };
            const html = instance.createRobustLinkHtml(parsed);
            expect(html).toContain('href="https://example.com"');
            expect(html).toContain('data-originalurl="https://example.com"');
            expect(html).toContain('data-versiondate="2023-07-09"');
            expect(html).toContain('>Example<');
        });
    });
});
