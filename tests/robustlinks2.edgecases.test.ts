import 'jest-fetch-mock';
import { RobustLinksV2 } from '../robustlinks2';

const fetchMock = fetch as unknown as jest.MockedFunction<typeof fetch> & {
  resetMocks: () => void;
  mockResponseOnce: (body: string) => void;
};

describe('RobustLinksV2 Edge Case Handling', () => {
    let rl: RobustLinksV2;
    beforeEach(() => {
        fetchMock.resetMocks();
        rl = new RobustLinksV2({ debug: false });
    });


    test('throws on missing href', () => {
        expect(() => rl.parseRobustLink({ href: '' })).toThrow(/href/);
    });

    test('throws on missing data-versiondate', () => {
        expect(() => rl.parseRobustLink({ href: 'https://web.archive.org/web/20210101/https://example.com', 'data-originalurl': 'https://example.com' })).toThrow(/versiondate/);
    });

    test('throws on invalid href', () => {
        expect(() => rl.parseRobustLink({ href: 'not-a-url', 'data-originalurl': 'https://example.com', 'data-versiondate': '2021-01-01' })).toThrow(/Invalid href/);
    });

    test('throws on invalid data-originalurl', () => {
        expect(() => rl.parseRobustLink({ href: 'https://web.archive.org/web/20210101/https://example.com', 'data-originalurl': 'not-a-url', 'data-versiondate': '2021-01-01' })).toThrow(/Invalid data-originalurl/);
    });

    test('throws on invalid data-versiondate', () => {
        expect(() => rl.parseRobustLink({ href: 'https://web.archive.org/web/20210101/https://example.com', 'data-originalurl': 'https://example.com', 'data-versiondate': 'not-a-date' })).toThrow(/Invalid data-versiondate/);
    });

    test('parses with only href and data-versiondate (defaults originalUrl to href)', () => {
        const href = 'https://web.archive.org/web/20210101/https://example.com';
        const versionDate = '2021-01-01';
        const parsed = rl.parseRobustLink({ href, 'data-versiondate': versionDate });
        expect(parsed.href).toBe(href);
        expect(parsed.originalUrl).toBe(href);
        expect(parsed.versionDate).toBeInstanceOf(Date);
    });

    test('handles data-versionurl with invalid URIs gracefully', () => {
        const href = 'https://web.archive.org/web/20210101/https://example.com';
        const rawAttrs = {
            href,
            'data-originalurl': 'https://example.com',
            'data-versiondate': '2021-01-01',
            'data-versionurl': 'not-a-url 20210101 https://web.archive.org/web/20210101/https://example.com 20210101'
        };
        const parsed = rl.parseRobustLink(rawAttrs);
        expect(parsed.versionSnapshots.length).toBe(1);
        expect(parsed.versionSnapshots[0].uri).toMatch(/^https?:\/\//);
    });

    test('parses ISO8601 and Web Archive datetime formats', () => {
        const cases = [
            '2021-01-01',
            '2021-01-01T12:00:00Z',
            '20210101',
            '20210101120000'
        ];
        cases.forEach(dt => {
            const parsed = RobustLinksV2.parseDatetime(dt);
            expect(parsed).toBeInstanceOf(Date);
        });
    });

    test('returns null for invalid datetime string', () => {
        expect(RobustLinksV2.parseDatetime('not-a-date')).toBeNull();
    });

    test('isArchiveUrl returns false for non-archive URLs', () => {
        expect(rl.isArchiveUrl('https://example.com')).toBe(false);
    });
});
