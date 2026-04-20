import puppeteer from "puppeteer";

const PLAYER_PROFILE_URLS = [
	"https://www.iplt20.com/players/virat-kohli/164",
	"https://www.iplt20.com/players/rajat-patidar/5471",
	"https://www.iplt20.com/players/devdutt-padikkal/5430",
	"https://www.iplt20.com/players/phil-salt/5606",
	"https://www.iplt20.com/players/jitesh-sharma/3185",
	"https://www.iplt20.com/players/jordan-cox/23023",
	"https://www.iplt20.com/players/krunal-pandya/3183",
	"https://www.iplt20.com/players/swapnil-singh/3180",
	"https://www.iplt20.com/players/tim-david/4524",
	"https://www.iplt20.com/players/romario-shepherd/20609",
	"https://www.iplt20.com/players/jacob-bethell/22074",
	"https://www.iplt20.com/players/venkatesh-iyer/8540",
	"https://www.iplt20.com/players/satvik-deswal/23036",
	"https://www.iplt20.com/players/mangesh-yadav/23040",
	"https://www.iplt20.com/players/vicky-ostwal/20624",
	"https://www.iplt20.com/players/vihaan-malhotra/23150",
	"https://www.iplt20.com/players/kanishk-chouhan/23168",
	"https://www.iplt20.com/players/josh-hazlewood/857",
	"https://www.iplt20.com/players/rasikh-dar/20577",
	"https://www.iplt20.com/players/suyash-sharma/5668",
	"https://www.iplt20.com/players/bhuvneshwar-kumar/116",
	"https://www.iplt20.com/players/nuwan-thushara/20700",
	"https://www.iplt20.com/players/abhinandan-singh/22136",
	"https://www.iplt20.com/players/jacob-duffy/23003",
	"https://www.iplt20.com/players/yash-dayal/20591",
];

const PROFILE_CACHE_TTL_MS = 60 * 60 * 1000;
let cachedProfiles = null;
let cacheExpiresAt = 0;
let inFlight = null;
let lastFingerprint = null;

const normalizeText = (value) => String(value || "").replace(/\s+/g, " ").trim();

const normalizeNameKey = (value) =>
	String(value || "")
		.toLowerCase()
		.replace(/[^a-z0-9]/g, "");

const toNumberOrNull = (value) => {
	const parsed = Number(String(value || "").replace(/[^0-9.-]/g, ""));
	return Number.isFinite(parsed) ? parsed : null;
};

const profileFingerprint = (profiles) =>
	JSON.stringify(
		(profiles || [])
			.slice()
			.sort((a, b) => String(a?.nameKey || "").localeCompare(String(b?.nameKey || "")))
			.map((profile) => ({
				id: profile?.id,
				nameKey: profile?.nameKey,
				season: profile?.season,
				matches: profile?.matches,
				runs: profile?.runs,
				wickets: profile?.wickets,
				average: profile?.average,
				strikeRate: profile?.strikeRate,
				economy: profile?.economy,
			})),
	);

const launchBrowser = async () =>
	puppeteer.launch({
		headless: true,
		args: ["--no-sandbox", "--disable-setuid-sandbox"],
	});

const configurePage = async (page) => {
	await page.setUserAgent(
		"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
	);
	await page.setExtraHTTPHeaders({
		"accept-language": "en-US,en;q=0.9",
		"upgrade-insecure-requests": "1",
	});
	await page.setViewport({ width: 1366, height: 768 });
};

const parseStatsFromLines = (lines) => {
	const year = String(new Date().getFullYear());
	const overviewIndex = lines.findIndex((line) => /player overview/i.test(line));
	const name = overviewIndex > 1 ? normalizeText(lines[overviewIndex - 2]) : null;
	const nationality = overviewIndex > 0 ? normalizeText(lines[overviewIndex - 1]) : null;

	const specializationIndex = lines.findIndex((line) => /^specialization$/i.test(line));
	const specialization = specializationIndex > 0 ? normalizeText(lines[specializationIndex - 1]) : null;

	const matchesIndex = lines.findIndex((line) => /^matches$/i.test(line));
	const profileMatches = matchesIndex > 0 ? toNumberOrNull(lines[matchesIndex - 1]) : null;

	const battingIndex = lines.findIndex((line) => /batting\s*&\s*fielding\s*stats/i.test(line));
	const bowlingIndex = lines.findIndex((line) => /^bowling$/i.test(line));

	let battingSeason = null;
	let bowlingSeason = null;

	if (battingIndex >= 0) {
		const battingSlice = lines.slice(battingIndex + 1, bowlingIndex > battingIndex ? bowlingIndex : lines.length);
		battingSeason = battingSlice.find((line) => line.startsWith(`${year}\t`)) || null;
	}

	if (bowlingIndex >= 0) {
		const bowlingSlice = lines.slice(bowlingIndex + 1);
		bowlingSeason = bowlingSlice.find((line) => line.startsWith(`${year}\t`)) || null;
	}

	let matches = profileMatches;
	let runs = 0;
	let wickets = 0;
	let average = null;
	let strikeRate = null;
	let economy = null;

	if (battingSeason) {
		const cols = battingSeason.split("\t").map((col) => col.trim());
		matches = toNumberOrNull(cols[1]) ?? matches;
		runs = toNumberOrNull(cols[3]) ?? 0;
		average = toNumberOrNull(cols[5]);
		strikeRate = toNumberOrNull(cols[7]);
	}

	if (bowlingSeason) {
		const cols = bowlingSeason.split("\t").map((col) => col.trim());
		const bowlingMatches = toNumberOrNull(cols[1]);
		wickets = toNumberOrNull(cols[4]) ?? 0;
		economy = toNumberOrNull(cols[7]);
		if ((matches === null || matches === 0) && bowlingMatches !== null) {
			matches = bowlingMatches;
		}
	}

	return {
		name,
		nationality,
		specialization,
		season: year,
		matches: matches ?? 0,
		runs,
		wickets,
		average,
		strikeRate,
		economy,
	};
};

const scrapeOneProfile = async (browser, profileUrl) => {
	const page = await browser.newPage();
	try {
		await configurePage(page);
		await page.goto(profileUrl, { waitUntil: "networkidle2", timeout: 90000 });

		const lines = await page.evaluate(() =>
			(document.body?.innerText || "")
				.split("\n")
				.map((line) => String(line || "").trim())
				.filter(Boolean),
		);

		const parsed = parseStatsFromLines(lines);
		const id = profileUrl.match(/\/(\d+)\/?$/)?.[1] || null;

		return {
			id,
			profileUrl,
			name: parsed.name,
			nameKey: normalizeNameKey(parsed.name),
			role: parsed.specialization,
			season: parsed.season,
			matches: parsed.matches,
			runs: parsed.runs,
			wickets: parsed.wickets,
			average: parsed.average,
			strikeRate: parsed.strikeRate,
			economy: parsed.economy,
			nationality: parsed.nationality,
		};
	} catch {
		return null;
	} finally {
		await page.close();
	}
};

const mapWithConcurrency = async (items, limit, iteratee) => {
	const results = new Array(items.length);
	let index = 0;

	const workers = Array.from({ length: Math.max(1, limit) }, async () => {
		while (index < items.length) {
			const current = index;
			index += 1;
			results[current] = await iteratee(items[current], current);
		}
	});

	await Promise.all(workers);
	return results;
};

export const iplPlayerProfileService = {
	getProvidedUrls() {
		return PLAYER_PROFILE_URLS.slice();
	},

	async getProvidedPlayerProfiles(forceRefresh = false) {
		if (!forceRefresh && cachedProfiles && cacheExpiresAt > Date.now()) {
			return cachedProfiles;
		}

		if (!forceRefresh && inFlight) {
			return inFlight;
		}

		inFlight = (async () => {
			let browser;
			try {
				browser = await launchBrowser();
				const profileResults = await mapWithConcurrency(PLAYER_PROFILE_URLS, 4, (url) =>
					scrapeOneProfile(browser, url),
				);

				const results = profileResults.filter((profile) => profile?.nameKey);
				lastFingerprint = profileFingerprint(results);

				cachedProfiles = results;
				cacheExpiresAt = Date.now() + PROFILE_CACHE_TTL_MS;
				return results;
			} finally {
				if (browser) {
					await browser.close();
				}
				inFlight = null;
			}
		})();

		return inFlight;
	},

	async refreshProvidedPlayerProfiles() {
		const previousFingerprint = lastFingerprint;
		const profiles = await this.getProvidedPlayerProfiles(true);
		const nextFingerprint = profileFingerprint(profiles);
		const changed = previousFingerprint !== null && nextFingerprint !== previousFingerprint;
		lastFingerprint = nextFingerprint;

		return {
			changed,
			count: profiles.length,
		};
	},
};
