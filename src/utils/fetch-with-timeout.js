export const DEFAULT_TIMEOUT = 2500;

export default function fetchWithTimeout(url="", { timeout, ...options } = {
	timeout: DEFAULT_TIMEOUT
}) {
	// Only setup aborting if AbortController defined on window
	const { AbortController } = (typeof window !== 'undefined' && window) || {};
	if(AbortController) {

		// Create the controller and get the signal to patch to fetch, below
		const controller = new AbortController();

		// According to https://developers.google.com/web/updates/2017/09/abortable-fetch:
		// Note: It's ok to call .abort() after the fetch has already completed, fetch simply ignores it.
		setTimeout(() => controller.abort(), timeout || DEFAULT_TIMEOUT);

		// Pass thru all other options to fetch
		return fetch(url, { ...options, signal: controller.signal });
	} 

	// No AbortController? Fake a fetch - fetch COULD still complete,
	// but we will at least stop the external code from waiting for promise completion
	// for an indefinite amount of time with the reject
	return new Promise((resolve, reject) => {
		setTimeout(() => {
			// TBD good fake structure for object?
			reject({ timeout: true });
		}, timeout || DEFAULT_TIMEOUT);

		// Pass thru all other options to fetch
		fetch(url, options)
			.then(resolve)
			.catch(reject);
	});
}