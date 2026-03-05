import { RobustLinksV2 } from '../robustlinks2';
describe('RobustLinksV2 Advanced Robust Link Parsing (auto-build href)', () => {
    const rl = new RobustLinksV2({ debug: false });
    const testCases = [
        {
            desc: 'Internet Archive (Wayback Machine) with ISO date',
            input: {
                'data-originalurl': 'https://example.com',
                'data-versiondate': '2021-01-01',
            },
            expected: {
                originalUrl: 'https://example.com',
                versionDate: new Date(Date.UTC(2021, 0, 1, 12, 0, 0)),
            }
        },
        {
            desc: 'UK Web Archive with ISO datetime',
            input: {
                'data-originalurl': 'http://bbc.co.uk',
                'data-versiondate': '2019-05-01T12:34:56Z',
            },
            expected: {
                originalUrl: 'http://bbc.co.uk',
                versionDate: new Date(Date.UTC(2019, 4, 1, 12, 34, 56)),
            }
        },
        {
            desc: 'Portuguese Web Archive with Web Archive URI date',
            input: {
                'data-originalurl': 'http://publico.pt',
                'data-versiondate': '20180101',
            },
            expected: {
                originalUrl: 'http://publico.pt',
                versionDate: new Date(Date.UTC(2018, 0, 1, 12, 0, 0)),
            }
        },
        {
            desc: 'Perma.cc with ISO date',
            input: {
                'data-originalurl': 'https://example.edu/page',
                'data-versiondate': '2022-12-31',
            },
            expected: {
                originalUrl: 'https://example.edu/page',
                versionDate: new Date(Date.UTC(2022, 11, 31, 12, 0, 0)),
            }
        },
        {
            desc: 'Archive-It with Web Archive URI datetime',
            input: {
                'data-originalurl': 'http://nytimes.com',
                'data-versiondate': '20170315083045',
            },
            expected: {
                originalUrl: 'http://nytimes.com',
                versionDate: new Date(Date.UTC(2017, 2, 15, 8, 30, 45)),
            }
        },
        {
            desc: 'Edge case: href and data-originalurl mismatch',
            input: {
                'data-originalurl': 'https://bar.com',
                'data-versiondate': '2020-01-01',
            },
            expected: {
                originalUrl: 'https://bar.com',
                versionDate: new Date(Date.UTC(2020, 0, 1, 12, 0, 0)),
            }
        },
        {
            desc: 'Edge case: missing data-versionurl',
            input: {
                'data-originalurl': 'https://baz.com',
                'data-versiondate': '2022-01-01',
            },
            expected: {
                originalUrl: 'https://baz.com',
                versionDate: new Date(Date.UTC(2022, 0, 1, 12, 0, 0)),
            }
        },
        {
            desc: 'Edge case: data-versionurl with multiple snapshots',
            input: {
                'data-originalurl': 'https://baz.com',
                'data-versiondate': '2022-01-01',
                'data-versionurl': 'https://web.archive.org/web/20220101000000/https://baz.com 2022-01-01 https://web.archive.org/web/20220102000000/https://baz.com 2022-01-02'
            },
            expected: {
                originalUrl: 'https://baz.com',
                versionDate: new Date(Date.UTC(2022, 0, 1, 12, 0, 0)),
                versionSnapshots: [
                    { uri: 'https://web.archive.org/web/20220101000000/https://baz.com', datetime: '2022-01-01' },
                    { uri: 'https://web.archive.org/web/20220102000000/https://baz.com', datetime: '2022-01-02' }
                ]
            }
        }
    ];
    beforeEach(() => {
        document.body.innerHTML = '';
    });
    test.each(testCases)('parses and builds href: $desc', ({ input, expected }) => {
        // Build a minimal anchor element with only the required data attributes
        const anchor = document.createElement('a');
        anchor.setAttribute('data-originalurl', input['data-originalurl']);
        anchor.setAttribute('data-versiondate', input['data-versiondate']);
        if (input['data-versionurl']) {
            anchor.setAttribute('data-versionurl', input['data-versionurl']);
        }
        // The href is not set; the library should build it
        document.body.appendChild(anchor);
        const rawAttrs = {
            href: rl.createMementoUri(input['data-originalurl'], RobustLinksV2.parseDatetime(input['data-versiondate'])),
            'data-originalurl': input['data-originalurl'],
            'data-versiondate': input['data-versiondate'],
            'data-versionurl': input['data-versionurl'] || undefined
        };
        const parsed = rl.parseRobustLink(rawAttrs, anchor.textContent || undefined);
        // The href should match what createMementoUri produces
        expect(parsed.href).toBe(rl.createMementoUri(expected.originalUrl, expected.versionDate));
        expect(parsed.originalUrl).toBe(expected.originalUrl);
        expect(parsed.versionDate.getTime()).toBe(expected.versionDate.getTime());
        if (expected.versionSnapshots) {
            expect(parsed.versionSnapshots).toEqual(expected.versionSnapshots);
        }
        else {
            expect(parsed.versionSnapshots.length).toBe(0);
        }
    });
    test('generates valid Memento URIs for all test cases', () => {
        testCases.forEach(({ expected }) => {
            const uri = rl.createMementoUri(expected.originalUrl, expected.versionDate);
            expect(typeof uri).toBe('string');
            expect(uri).toMatch(/^https?:\/\//);
        });
    });
    test('print all generated robust link hrefs for manual verification', () => {
        testCases.forEach(({ input, expected }) => {
            const href = rl.createMementoUri(expected.originalUrl, expected.versionDate);
            // eslint-disable-next-line no-console
            console.log(`desc: ${expected.originalUrl} @ ${input['data-versiondate']} => href: ${href}`);
        });
    });
});
