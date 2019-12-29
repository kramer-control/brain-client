import 'isomorphic-fetch';
import retry from 'async-retry';
import fetchWithTimeout from './fetch-with-timeout';
import Logger from './Logger';

// Simple wrapper around `fetch` to make it easier to use.
class HttpClient {

	// /**
	//  * Creates an instance of HtpClient.
	//  * @param {string} urlRoot - URL root to use for all requests by this object
	//  * @memberof HtpClient
	//  */
	constructor({ baseURL: urlRoot, timeout } = {}) {
		// if(process.env.NODE_ENV !== 'production')
			// console.log("[HtpClient] Using API server at ", urlRoot);

		this.urlRoot = urlRoot || '';
		this.timeout = timeout || 2500;
	}

	/**
	 * Set/clear the token. If set, passed as the Authorization header on every request
	 * 
	 * @param {string} token
	 * @memberof HtpClient
	 */
	setToken(token) {
		this.token = token;
	}

	/**
	 * Set/clear the pending callback. If set, when a request starts, pendingCallback will be called with `true`. When request finishes, it will be called with `false`
	 *
	 * @param {Function|null} cb
	 * @memberof HtpClient
	 */
	setPendingCallback(cb) {
		this.pendingCallback = cb;
	}

	/**
	 * Call HTTP GET on `endpoint`, with optional args passed in the query string, returning Promise of {Object} - results from server
	 *
	 * @param {string} endpoint - URL on server to call
	 * @param {object} [arg={}]
	 * @returns {Promise} Resolves when server returns with result
	 * @memberof HtpClient
	 */
	get(endpoint, arg={}, opts={}) {
		return this.call(endpoint, arg, { ...opts, method: 'GET' })
	}

	/**
	 * Call HTTP POST on `endpoint`, with optional args passed in the body of request, returning Promise of {Object} - results from server
	 *
	 * @param {string} endpoint - URL on server to call
	 * @param {object} [arg={}]
	 * @returns {Promise} Resolves when server returns with result
	 * @memberof HtpClient
	 */
	post(endpoint, arg={}, opts={}) {
		return this.call(endpoint, arg, { ...opts, method: 'POST' })
	}

	/**
	 * Call HTTP PATCH on `endpoint`, with optional args passed in the body of request, returning Promise of {Object} - results from server
	 *
	 * @param {string} endpoint - URL on server to call
	 * @param {object} [arg={}]
	 * @returns {Promise} Resolves when server returns with result
	 * @memberof HtpClient
	 */
	patch(endpoint, arg={}, opts={}) {
		return this.call(endpoint, arg, { ...opts, method: 'PATCH' })
	}

	/**
	 * Call HTTP DELETE on `endpoint`, with optional args passed in the body of request, returning Promise of {Object} - results from server
	 *
	 * @param {string} endpoint - URL on server to call
	 * @param {object} [arg={}]
	 * @returns {Promise} Resolves when server returns with result
	 * @memberof HtpClient
	 */
	delete(endpoint, arg={}, opts={}) {
		return this.call(endpoint, arg, { ...opts, method: 'DELETE' })
	}

	/**
	 * Internal use only
	 *
	 * @param {*} httpData
	 * @memberof HtpClient
	 * @private
	 */
	_encodeFields(httpData) {
		if(!httpData)
			return [];

		const fields = [];
		Object.keys(httpData).forEach(key => {
			const val = httpData[key];
			if(Array.isArray(val)) {
				val.forEach((v,x) => {
					fields.push(encodeURIComponent(key+'[' + x + ']')+'='+encodeURIComponent(v));
				});
			} else
			if(val && typeof(val) === 'object') {
				Object.keys(val).forEach(vk => {
					fields.push(encodeURIComponent(key+'['+vk+']')+'='+encodeURIComponent(JSON.stringify(val[vk])));
				});
			} else {
				fields.push(encodeURIComponent(key)+'='+encodeURIComponent(httpData[key]));
			}
		});
		return fields;
	}

	/**
	 * Call HTTP POST (by default) on `endpoint`, with optional args passed in the body of request, returning Promise of {Object} - results from server
	 * If `options.method=='GET'`, then `args` will be passed by query string instead.
	 *
	 * @param {string} endpoint - URL on server to call
	 * @param {object} [arg={}] Args for the call
	 * @param {object} [options={method:'POST'}] Only .method is supported at the moment, defining the HTTP method to use
	 * @param {string} options.method [method=POST] HTTP method to use
	 * @param {boolean|object} options.autoRetry [autoRetry=false] If true, auto-retries Request. Can provide object like `autoRetry: {retries: 10}` to specify number of retries, defaults to 10
	 * @returns {Promise} Resolves when server returns with result
	 * @memberof HtpClient
	 */
	async call(endpoint, args={}, options={method:'POST'}) {
		options = Object.assign({}, {
			method: 'POST'
		}, options || {});

		// Allow {{pending-indicator}} to render a progress bar
		if (this.pendingCallback)
			this.pendingCallback(true);

		const token = this.token; //this.get('feathers.authToken'); // required to authenticate request to the endpoint
		const urlBase = this.urlRoot + endpoint; //config.feathers.socketUrl + endpoint;
		const httpData = args; // token ? Object.assign( {}, args,  { token }) : args;

		let fetchUrl = urlBase;
		if(options.method === 'GET') {
			const fields = this._encodeFields(httpData);

			if(fields.length)
				fetchUrl += '?' + fields.join('&');
		}

		// fetch() doesn't support keepalive and CORS Preflight at the same time,
		// so we will use sendBeacon if keepalive is set
		if(options.keepalive) {

			// // Encode the data as a blob so we can set the content-type header as json
			// const data = new Blob([ this._encodeFields(httpData).join('&') ], { type: 'application/x-www-form-urlencoded;charset=UTF-8' });
			// const data = new Blob([ JSON.stringify(httpData) ], { type : 'application/json' });
			//
			// Send the beacon
			// navigator.sendBeacon(fetchUrl, data);

			// Resorting to sync XHR if keepalive set.
			// Why?
			// - sendBeacon won't allow application/json content type
			// - encoding data as application/x-www-form-urlencoded looses second-level objects for JSON objects
			// - fetch doesn't support keepalive and CORS preflight
			const client = new XMLHttpRequest();
			client.open("POST", fetchUrl, false); // third parameter indicates sync xhr
			client.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
			client.setRequestHeader("Authorization", token);
			client.send(JSON.stringify(httpData));

			// sendBeacon doesn't return anything, so just resolve incase anyone expects a promise here
			return Promise.resolve();
		}

		const authHeader = {};
		if(token)
			authHeader.Authorization = token;

		const autoRetry = options.autoRetry;
		if(autoRetry)
			delete options.autoRetry;

		const retryArgs = {
			// Allow autoRetry:true || autoRetry: { retries: Number }
			retries: autoRetry ? (
				autoRetry.retries ? autoRetry.retries : 10
			) : 0
		};

		const errorCatcher = (err, bail) => {
			// Allow a UI to render a progress bar
			if (this.pendingCallback)
				this.pendingCallback(false);

			// Errors from server are propogated in success() as res.error,
			// so we should never get this error() handler here
			// console.error("[HttpClient/catch]", { endpoint, httpData, options, token }, " failure: ", err && err.statusText ? { reason: err.statusText, error: err } : err ); // eslint-disable-line no-console

			Logger.getDefaultLogger().e(HttpClient.LOG_TAG, 'Http Error: ', { endpoint, httpData, options, token }, " failure: ", err && err.statusText ? { reason: err.statusText, error: err } : err);
		
			// bail && bail("Caught something...check console");
			return err;
			// throw err;
		};

		// console.log("[DEBUG:HtpClient] autoRetry:", autoRetry," for ", fetchUrl, retryArgs);
		
		const body = options.method === 'GET' ? undefined : JSON.stringify(httpData);

		// console.log("[HtpClient]", options.method, fetchUrl, ":", body);

		let retryCount = 0;
		return await retry(async bail => {
			retryCount ++;
			if(retryCount > 1) {
				// console.warn("[HtpClient] autoRetry #", retryCount,": ", fetchUrl);
				Logger.getDefaultLogger().w(HttpClient.LOG_TAG, "autoRetry #", retryCount,": ", fetchUrl);
			}

			const res = await fetchWithTimeout(fetchUrl, {
				// Spread options hash instead of cherry-picking
				// so we can pass in arbitrary options. Right now,
				// this is used for {keepalive:true} in ServerStore.postMetrics
				...options,
				// data:   httpData,
				mode: "cors", // no-cors, cors, *same-origin
				cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
				credentials: "same-origin", // include, same-origin, *omit
				headers: options.method === 'GET' ? { } : {
					"Content-Type": "application/json; charset=utf-8",
				// 	...authHeader
				// 	// "Content-Type": "application/x-www-form-urlencoded",
				},
				redirect: "follow", // manual, *follow, error
				referrerPolicy: "no-referrer", // no-referrer, *client
				body, // body data type must match "Content-Type" header
				timeout: this.timeout,
			});//.catch(err => errorCatcher);

			// Add auto-retry for >501 and <600 (e.g. don't retry 501, bit other 5xx can retry)
			if(res.status >= 500 && res.status <= 599) {
				if(autoRetry) {
					// Per https://github.com/zeit/async-retry#usage,
					// anything throws, we retry
					throw new Error("Retry, pretty please.");
				} else {
					// console.error("[ERROR RESULT FROM SERVER]", res, await res.json());
					let json; try {
						json = await res.json();
					} catch(e) {};
					bail(new Error(json && json.message ? json.message : "Error Status " + res.status +" from server"));
					return res;
				}
			} else
			// // Return 501's right to the client
			// if(res.status === 500) {
			// 	bail(new Error("Internal Server Error"));
			// 	return res;
			// } else
			// Return 403's right to the client
			if(res.status === 403) {
				bail(new Error("Unauthorized"));
				return res;
			}

			// Got here? Good, should be able to parse and return data
			const json = await res.json();

			// Allow {{pending-indicator}} to render a progress bar
			if (this.pendingCallback)
				this.pendingCallback(false);

			if(json && json.error) {
				// console.error("[HttpClient/json]", { endpoint, httpData, options, token }, " failure: ", json.error ); // eslint-disable-line

				Logger.getDefaultLogger().e(HttpClient.LOG_TAG, "JSON error received: ", { endpoint, httpData, options, token }, " failure: ", json.error );
			}
			
			return json;

		}, retryArgs).catch(errorCatcher);
	}
}

HttpClient.LOG_TAG = "HttpClient";

export default HttpClient;