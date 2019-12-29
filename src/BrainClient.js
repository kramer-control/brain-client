import EventEmitter from 'events';
import WebSocket from 'isomorphic-ws';
import { Subject } from 'rxjs';
import HttpClient from './utils/http-client';
import promiseMap from './utils/promise-map';
import defer from './utils/defer';
import Logger from './utils/Logger';
import BrainDevice from './BrainDevice';
import ClientEvents from './ClientEvents';
import ConnectionStates from './ConnectionStates';
import BrainInfo from './BrainInfo';
import UsageStatsClient from './utils/usage';
import SYSTEM_DRIVER_ID from './utils/system-driver-id';

export const DEFAULT_BRAIN_PORT = 8000;
export const DEFAULT_REQUEST_TIMEOUT = 1000; // mocha times tests out at 2000
export const DEFAULT_BRAIN_IP = '127.0.0.1:8000';
export const CONNECTION_TIMEOUT_MS = 5000;
export const PING_INTERVAL = 30 * 1000;


const STATUS_SUCCESS = 'success';

// https://developer.mozilla.org/en-US/docs/Web/API/WebSocket#Ready_state_constants
// const WS_CONNECTING = 0;
// const WS_OPEN = 1;
// const WS_CLOSING = 2;
const WS_CLOSED = 3;

// Borrowed from https://davidwalsh.name/query-string-javascript
function getUrlParameter(name) {
	name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]'); // eslint-disable-line no-useless-escape
	var regex = new RegExp('[\\?&]' + name + '=([^&#]*)');
	var results = regex.exec(window.location.search);
	return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
};

/**
 * Error thrown by {@link BrainClient#setupConnection} when brain is not provisioned.
 * @class BrainClient.ErrorNotProvisioned
 */
class ErrorNotProvisioned extends Error {}

/**
 * Error thrown by {@link BrainClient#setupConnection} when brain does not have Express Mode enabled in the KC Manager
 * @class BrainClient.ErrorExpressModeDisabled
 */
class ErrorExpressModeDisabled extends Error {}

/**
 * Thrown by {@link BrainClient} methods if {@link BrainClient#prepareConnection} or {@link BrainClient#connectToBrain} not called before calling the method that throws this error.
 * @class BrainClient.ErrorClientNotInitalized
 */
class ErrorClientNotInitalized extends Error {
	constructor(message, ...args) {
		super(
			message || "BrainClient not initalized - call connectToBrain or at least prepareConnection before calling this method",
			...args
		);
	}
}

/**
 * Internal watchdog to keep states flowing.
 * I've found that sometimes when a brain restarts, syncs, or publishes,
 * it decides to stop sending state changes. However, sending the /api/v1/restart
 * command "restarts" the flow of changes. So this just implements a simple
 * deadman timer using the System Device's SECOND_STATE to make sure it's always
 * getting state changes.
 * @private
 */
class ConnectionWatchdog {
	constructor(client) {
		this.client = client;
	}

	async enable() {
		if(this._enabled)
			return;
		this._enabled = true;

		const sys = this.sys = await this.client.getDevice('System Device');
		if(sys) {
			// Subscribe to state changes on System Device
			// System Device should emit a state chnage every 1000ms due to the
			// SECOND_STATE changing. So we just restart the timer every 
			// state change, and if we stop restarting the timer for more than
			// WATCHDOG_DEADMAN_TIMER_MS, then we send the /api/v1/restart
			// command to the brain - we've found this will cause state changes
			// to start transmitting again
			sys.on(BrainDevice.STATE_CHANGED, () => {
				this.restartDeadmanTimer();
			});
		} else {
			console.warn(`[ConnectionWatchdog] unable to get System device, watchdog not active`);
		}
	}

	restartDeadmanTimer() {
		// console.log(`[ConnectionWatchdog] + Received state change, restarting timer`);

		clearTimeout(this.deadmanTimer);
		this.deadmanTimer = setTimeout(() => {
			
			// Simple debugging
			console.warn(`[ConnectionWatchdog] no state changes received in ${ConnectionWatchdog.WATCHDOG_DEADMAN_TIMER_MS/1000} seconds, requesting a restart of the connected brain`);

			// Actual command to restart the brain
			// Note that this just restarts the state machine, not the actual process
			this.client.http.post('restart');

			// Restart our timer
			this.restartDeadmanTimer();

		}, ConnectionWatchdog.WATCHDOG_DEADMAN_TIMER_MS);
	}
}

ConnectionWatchdog.WATCHDOG_DEADMAN_TIMER_MS = 15 * 1000;

/**
 * Event-based async client for [Kramer Control Brains]{@link https://www.kramerav.com/us/products/control-and-management/control-processors?groupId=3&subgroupId=284}.
 * 
 * Please see these other documentation resources related to this class:
 * * See {@link BrainClient.EVENTS} for events emitted by `BrainClient`.
 * * See {@link BrainClient.CONNECTION} for connection states used in {@link BrainClient#getConnectionStatus}
 * * See {@link BrainDevice} for the device API to control devices (send commands and receive state changes)
 * 
 */
export default class BrainClient extends EventEmitter {
	// static LOG_TAG = "BrainClient";

	// // Internal private cache of client instances by IP
	// static _cachedBrainClients = {};

	/**
	 * [INTERNAL]
	 * Helper function for `getBrainClient` to automatically get IP if needed.
	 * 
	 * @param {string} ipAddress IP and optional port to connect to. Example: `10.0.1.123:8000`. Note: If you pass an object like `{ auto: true, default: 'something' }`, BrainClient will check the window querystring for 'brainIp=<whatever>', and if not found, will use the `default` param or origin host/port as brain IP if no `default` param given. You can also specify `param: "someOtherParam"` instead of `auto: true` to use a different query string param other than "brainIp".
	 * @private
	 */
	static _tryAutoIpAddress(ipAddress) {
		if(ipAddress && (ipAddress.auto || ipAddress.param)) {
			const ipOverride = getUrlParameter(ipAddress.param || 'brainIp');
			if(!ipOverride) {
				ipAddress = ipAddress.default || window.location.host;
			} else {
				ipAddress = ipOverride;
			}
		}
		return ipAddress;
	}
	
	/**
	 * Static method to retrieve/create a `BrainClient` instance. The `ipAddress` is used as the cache key - if no client exists for that IP, 
	 * then a new one will be created and initalized. However, if an existing client is found, that client will be returned as-is.
	 * 
	 * The client is initalized using the {@link BrainClient#connectToBrain} method.
	 * 
	 * **Auto** mode: 
	 * * If you pass an object like `{ auto: true }` as the `ipAddress`, BrainClient will check the window query string for `brainIp=<whatever>`, and if not found, will use the origin host/port as brain IP. 
	 * * If you pass an object like `{ auto: true, default: "some.host:8000" }`, BrainClient will still check the query string, but it will fallback to "some.host:8000" instead of the origin.
	 * * If you pass an object like `{ param: "someParam", default: "some.host:8000" }`, BrainClient will check for `someParam=<whatever>` instead of "brainIp", and fallback to the value given in "default" if not found. 
	 * * In all cases, default is optional. If "auto" or "param" given and "default" not specified, it will fallback to the window origin (e.g. the host/port that the page using BrainClient was served from.) This "origin" mode is only really useful if you are taking advantage of the "bundle upload" mode in the Kramer UI of the SL brains to serve your custom javascript from the Brain's built-in webserver at the /bundle/ URL.
	 * 
	 * Note that this static method is intentionally designed to NOT be async - in otherwords, it is guaranteed to return 
	 * a {@link BrainClient} instance right away. The {@link BrainClient#connectToBrain} method is NOT called right away 
	 * (on a new instance) - it is delayed until the next clock tick. This is done so that callers can attach event listeners,
	 * for example, to cach communication failures on connection.
	 * 
	 * **Example**
	 * ```javascript
	 * const bc1 = BrainClient.getBrainClient('127.0.0.1:8000');
	 * const bc2 = BrainClient.getBrainClient('127.0.0.1:8000');
	 * console.log("Caching worked? ", (bc1 === bc2) ? true : false);
	 * ```
	 * 
	 * @param {string} ipAddress IP and optional port to connect to. Example: `10.0.1.123:8000`. Note: If you pass an object like `{ auto: true, default: 'something' }`, BrainClient will check the window querystring for 'brainIp=<whatever>', and if not found, will use the `default` param or origin host/port as brain IP if no `default` param given. You can also specify `param: "someOtherParam"` instead of `auto: true` to use a different query string param other than "brainIp".
	 * @param {object} opts Options to pass to the {@link BrainClient} constructor. See the constructor for all options honored. However, one option the constructor doesn't consume is the `pin` option, below.
	 * @param {string|function} opts.pin PIN string or callback function to get PIN. Callback will only be executed if the Brain indicates a PIN is required. See {@link BrainClient#setupConnection} for more notes on the callback. 
	 */
	static getBrainClient(ipAddress, opts={}) {
		ipAddress = this._tryAutoIpAddress(ipAddress)

		if(this._cachedBrainClients[ipAddress]) {
			return this._cachedBrainClients[ipAddress];
		}

		const bc = this._cachedBrainClients[ipAddress] = new BrainClient(opts);
		
		// Start connection to Brain on next tick
		// so that the caller can attach event listeners in case of CONNECTION_FAILURE, etc
		setTimeout(() => {
			bc.connectToBrain(ipAddress, (opts || {}).pin);
		}, 0);

		return bc;
	}

	/**
	 * Create a new BrainClient.
	 * Note this does not initate connection to the brain. Use {@link BrainClient#connectToBrain} to connect 
	 * (`await` the promise, of course). 
	 * 
	 * For more customization of the setup, you can use {@link BrainClient#prepareConnection} 
	 * in order to bypass the setup in {@link BrainClient#setupConnection} and do your own setup.
	 * 
	 * **Example**
	 * ```javascript
	 * const bc1 = new BrainClient(); // default opts
	 * const bc2 = new BrainClient({
	 * 	reconnectWaitTime: 500 // change reconnect wait time to 500ms
	 * });
	 * ```
	 * 
	 * @property BrainClient.DEFAULT_BRAIN_PORT {number} Default port for Brain (`8000`)
	 * 
	 * @param opts {object} Options for configuring the client, all optional, documented below
	 * @param opts.reconnectWaitTime {number} Time to wait to try to reconnect a socket on disconnect or error in milliseconds (default to `1000` milliseconds)
	 * @param opts.httpRequestTimeout {number} Timeout value for HTTP requests internally to the Brain. If the Brain takes longer than this parameter, the request will fail with a timeout. Defaults to `1000` milliseconds.
	 * @param opts.disableAnalytics {boolean} Set to true to disable analytics collection via Google Analytics (defaults to `false`)
	 * 
 	 */
	constructor(opts={}) {
		super(); // required, obviously

		this._ipAddressPromise = defer();

		Object.assign(this.opts = {}, {
			reconnectWaitTime:  1000,
			httpRequestTimeout: 1000,
			disableAnalytics:   false,
		}, opts || {});

		this.usage = this.opts.disableAnalytics ? {
			track: () => {}
		} : UsageStatsClient;
	}

	/**
	 * Connect the client to the brain. `await` this function to ensure the connection is setup 
	 * before calling other methods. See {@link BrainClient#setupConnection} for further notes
	 * on connection setup if this method is too opaque for your needs.
	 * 
	 * **Example usage:**
	 * ```javascript
	 * const bc = new BrainClient();
	 * await bc.connectToBrain("127.0.0.1");
	 * ```
	 * 
	 * @param {string} ip IP address of Brain to connect to, with optional port, like "127.0.0.1:8000" - port defaults to 8000 if not specified
	 * @param {string|function} pin PIN string or callback function to get PIN. Callback will only be executed if the Brain indicates a PIN is required. See {@link BrainClient#setupConnection} for more notes on the callback.
	 * @throws {Error} May throw errors from {@link BrainClient#setupConnection} - see that method for Errors that could be thrown.
	 */
	async connectToBrain(ip, pin) {
		this.usage.track('connectToBrain', { ip });

		await this.prepareConnection(ip);

		// Bail out if failure
		if(this.getConnectionStatus() === BrainClient.CONNECTION_FAILURE) {
			return BrainClient.CONNECTION_FAILURE;
		}

		await this.setupConnection(pin);

		// Return status
		return this.getConnectionStatus();
	}

	/**
	 * This method `promise`s to return only when the client is completely 
	 * setup and free of any obvious error states, such is not being
	 * provisioned or not having express mode enabled.
	 * 
	 * It's important to note that consumers of BrainClient can implement
	 * all the checks/steps of this setup routine themselves - for example,
	 * to prompt for a PIN code interactively.
	 * 
	 * However, note that you CAN supply a function as the `pin` argument,
	 * which will be used as a callback if the brain requires a non-blank 
	 * PIN. This function will be `await`ed. That means you could use still
	 * this method in a UI and simply provide a callback arg to pop up a
	 * dialog, for example.
	 * 
	 * A creative user of `BrainClient` could decide to not use `setupConnection`
	 * at all, and instead implement each of the steps that `setupConnection` does
	 * in their own code. 
	 * 
	 * `setupConnection` does not use any private data,
	 * it just reuses accessors from `BrainClient` and packages them
	 * in the form of an easy-to-use and simple `await`able method. `setupConnection`
	 * will work for the majority of users that use `BrainClient` as-is.
	 * 
	 * However, if you find yourself needing more control over the init process
	 * of the connection, just call {@link BrainClient#prepareConnection} after constructing your
	 * `BrainClient` instance and then setup the connection however you would like.
	 * 
	 * @param {string|function} pin Express mode PIN code, only needed if not left blank in KC Manager. NOTE: an `async` function can be supplied for the `pin` instead of a string, which will only be called if the pin is actually required for connection.
	 * 
	 * @return {BrainInfo} An object describing the current brain. See {@link BrainInfo} for fields. 
	 * 
	 * @throws {Error} Throws {@link BrainClient.ErrorNotProvisioned}, {@link BrainClient.ErrorExpressModeDisabled}, or {@link BrainClient.ErrorClientNotInitalized}.
	 */
	async setupConnection(pin="") {
		this.usage.track('setupConnection');

		await this._auditConnection(true);
	
		// isLoginNeeded returns true if the default "empty" pin doesn't work
		if(await this.isLoginNeeded()) {
			// TODO: Test coverage
			if(typeof(pin) === 'function') {
				pin = await pin();
			}
			this.submitPin(pin)
		}
	
		// Wait for a final authorization to talk to the brain
		await this.isAuthorized();

		// Return status
		return this._brainGeneralInfo;
	}

	/**
	 * [PRIVATE]
	 * 
	 * Audits the connection:
	 *   * Checks for `this.ipAddress` - if not set, throws {@link BrainClient.ErrorClientNotInitalized} or returns false if `throwErrors`is false
	 *   * Checks for `this.isProvisioned()` - if false or null, throws {@link BrainClient.ErrorNotProvisioned} or returns false if `throwErrors`is false
	 *   * Checks for `this.isExpressModeEnabled()` - if false or null, throws {@link BrainClient.ErrorExpressModeDisabled} or returns false if `throwErrors`is false
	 * 
	 * @param {boolean} throwErrors Default false, set to true to enable throwing errors
	 * @throws {Error} Multiple errors may be thrown - see above. Set `throwErrors` to false to return false instead of throwing errors
	 * 
	 * @private
	 */
	async _auditConnection(throwErrors=false) {
		if(!this.ipAddress) {
			// TODO: Test coverage
			if(!throwErrors) {
				// TODO: Test coverage
				return false;
			}

			// TODO: Test coverage
			throw new ErrorClientNotInitalized()
		}
		
		const brainId = await this.brainId();

		if(!await this.isProvisioned()) {
			if(!throwErrors) {
				// TODO: Test coverage
				return false;
			}

			// TODO: Test coverage
			throw new ErrorNotProvisioned("Brain " + brainId + " is NOT provisioned on brain " + this.ipAddress + " - BrainClient will not work");
		}
	
		if(!await this.isExpressModeEnabled()) {
			if(!throwErrors) {
				// TODO: Test coverage
				return false;
			}
			// TODO: Test coverage
			throw new ErrorExpressModeDisabled("Express mode NOT enabled on " + this.ipAddress + " (brain id " + brainId + ") - BrainClient will not work");
		}

		return true;
	}

	/**
	 * [INTERNAL]
	 * 
	 * Sets the current `_connectionStatus` to the status given, and emits the `CONNECTION_STATUS_CHANGED` changed event.
	 * 
	 * @param {string} status  One of the possible states enumerated in {@link BrainClient.CONNECTION}
	 * @private
	 */
	_setConnectionStatus(status) {
		this._connectionStatus = status;
		this.emit(BrainClient.EVENTS.CONNECTION_STATUS_CHANGED, { status });

		if(status === BrainClient.CONNECTION_ACTIVE &&
			this.isReconnecting) {
			this.isReconnecting = false;

			// Notify devices of reconnection
			Object.values(this.devices).forEach(device => device._reconnected())
		}

		// console.log("[BrainClient._setConnectionStatus] (" + this.ipAddress + ")", status);
	}

	/**
	 * Get the current connection status of the Brain Client. For possible states, please see {@link BrainClient.CONNECTION}.
	 * When the connection status of the client changes, the event `BrainClient.EVENTS.CONNECTION_STATUS_CHANGED` will be emitted by the client as well.
	 * @returns {string} One of the possible states enumerated in {@link BrainClient.CONNECTION}
	 */
	getConnectionStatus() {
		return this._connectionStatus;
	}

	/**
	 * Exposed as secondary method just for testing
	 * 
	 * @param {string} ipAddress 
	 * @private
	 */
	_checkPort(ipAddress) {
		// Normalize IP with default port if none specified
		if (ipAddress.indexOf(':') < 0) {
			ipAddress += ':' + DEFAULT_BRAIN_PORT;
		}

		return ipAddress;
	}

	/**
	 * Prepare the `BrainClient` to connect to a brain by setting up REST client and WebSocket connections.
	 * 
	 * You usually will not need to call this. Instead, we recommend `await`ing {@link BrainClient#connectToBrain} instead. However, if you wish to reimplement {@link BrainClient#setupConnection} (which `connectToBrain` uses internally to bootstrap the client), then you should NOT call `connectToBrain`. Instead, create your client and call `prepareConnection` then implement whatever connection steps you want to use.
	 * 
	 * NOTE: You can/should `await` this method if you call it to ensure the Brain connection works. This method WILL throw an `Error` of undetermined type if there is a problem connecting with the Brain.
	 * 
	 * **Example usage:**
	 * ```javascript
	 * const bc = new BrainClient();
	 * await bc.prepareConnection("10.0.1.138:8000");
	 * if(await bc.isLoginNeeded()) {
	 *	const pin = prompt("Please enter your PIN to connect to the Brain")
	 *	bc.submitPin(pin);
	 * }
	 * await bc.isAuthorized();
	 * const sys = bc.getSystemDevice();
	 * // ...
	 * ```
	 * 
	 * @param {string} ipAddress IP with optional port specified
	 * @returns {Promise} Promise that will resolve once the WebSocket is connected
	 * @throws {Error} Error if trouble connecting to Brain specified
	 */
	async prepareConnection(ipAddress) {
		this.usage.track('prepareConnection');

		this.ipAddress = this._checkPort(ipAddress);

		// Release any waiting listeners
		this._ipAddressPromise.resolve();

		// Update connection status
		this._setConnectionStatus(BrainClient.CONNECTION_CONNECTING);

		// Set below when express_mode_flag_msg received via socket
		this.authRequired = false;
		this.expressModeEnabled = false;
		this.isAuthenticated = false;

		// Cache devices by ID
		this.devices = {};
		this._devicesEnumerated = false;

		// Setup promises of events
		this._isProvisionedPromise = defer();
		this._connectionPromise = defer();
		this._expressModePromise = defer();
		this._loginNeededPromise = defer();
		this._authPromise = defer();
		
		// Setup REST API
		this._connectHttp();

		// Test connection
		try {
			await this.brainInfo();
		} catch(ex) {
			
			// Bail out of prepareConnection with failure
			return this._setConnectionStatus(BrainClient.CONNECTION_FAILURE);

			// throw new Error("Error connecting to brain at " + ipAddress + ": "+ ex);
		}

		// Set flags
		this._manuallyDisconnected = false;
		this.isReconnecting = false;

		// Assuming success, setup WebSocket connection
		this._connectSocket();

		// Add a watchdog to make sure we're getting states
		// Note: We only enable the watchdog if a device 
		// actually calls .watchStates()
		this.watchdog = new ConnectionWatchdog(this);
		// window.client = this; // JUST FOR TESTING

		// Return promise of connection
		return this._connectionPromise;
	}

	/**
	 * [PRIVATE]
	 * Create the HTTP client for making REST calls to the Brain
	 * NOTE: Most of the API communication for states/events/commands uses the WebSocket
	 * instead of REST because of the way the Brain is structured internally - the REST
	 * API is good for info and some basic config, but the WebSocket is better/more flexible
	 * for detailed interaction with the space.
	 * @private
	 */
	_connectHttp() {
		this.http = new HttpClient({
			baseURL: 'http://' + this.ipAddress + '/api/v1/',
			timeout: this.opts.httpRequestTimeout || DEFAULT_REQUEST_TIMEOUT
		});
	}

	/**
	 * Get the brain information (the "general" API route)
	 * @returns {BrainInfo} A {@link BrainInfo} object describing the currently connected brain
	 * @throws {Error} Throws an error if there is a problem talking to the brain
	 */
	async brainInfo() {
		const res = await this.http.get('general');
		if(res.timeout) {
			throw new Error("brainInfo request timeout");
		}
		this._brainGeneralInfo = res.result;

		if (this._isProvisionedPromise) {
			this._isProvisionedPromise.resolve(this._brainGeneralInfo.brain_provisioned);
			this._isProvisionedPromise = null;
		}

		return this._brainGeneralInfo;
	}

	/**
	 * Retrieve the ID of the connected brain. Promise returned will not resolve until brain is connected in some fashion.
	 * 
	 * @returns {string|null} Promise of a brainId or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async brainId() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}
		await this.isProvisioned();
		return this._brainGeneralInfo.brain_id;
	}

	/**
	 * Returns a flag indicating if authentication is required for this space.
	 * 
	 * Use {@link BrainClient#submitPin} to send PIN to the Brain, then `await` {@link BrainClient#isAuthorized} to be notified when `BrainClient` ready for use. You can also listen for `BrainClient.EVENTS.AUTHORIZED` instead of `await`ing `isAuthorized`.
	 * 
	 * NOTE: You can also be notified of the need for a PIN by listening for the `BrainClient.EVENTS.PIN_REQUIRED` event. See {@link BrainClient.EVENTS} for discussion of that event.
	 * 
	 * @returns {boolean} Promised `true`/`false` indicating if the Brain requires a PIN or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async isLoginNeeded() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}
		if(this.isAuthenticated) {
			return false;
		}

		return await this._loginNeededPromise;
	}

	/**
	 * Returns a flag indicating if the client has cleanly authorized with the Brain in order to communicate with this space.
	 * 
	 * @returns {boolean} Promised `true`/`false` indicating if the client has completed authorization or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async isAuthorized() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}
		if(this.isAuthenticated) {
			return true;
		}
		return await this._authPromise;
	}

	/**
	 * Returns a flag indicating if express mode has been enabled in the Manager for the space provisioned to this Brain. 
	 * 
	 * NOTE: Without Express Mode enabled, the client will not be able to control this space via the WebSocket. However, some basic REST APIs will still work to retrieve information about the space.
	 * 
	 * @returns {boolean} Promised `true`/`false` indicating if express mode has been enabled or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async isExpressModeEnabled() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}
		if (this.expressModeEnabled) {
			return true;
		}

		return await this._expressModePromise;
	}

	/**
	 * Returns a flag indicating if any space has been provisioned to the brain. Without a space provisioned to the brain, there is nothing to control.
	 * 
	 * @returns {boolean} Promised `true`/`false` indicating if the Brain has been provisioned or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async isProvisioned() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}
		if (this._brainGeneralInfo) {
			return this._brainGeneralInfo.brain_provisioned;
		}

		return await this._isProvisionedPromise;
	}
	
	/**
	 * Find and return the `BrainDevice` instance for this Brain's System Device, which will provide states and commands for things like time, weather, and custom states created in the KC Builder.
	 * 
	 * @returns {BrainDevice|null} {@link BrainDevice} instance for the System device on the Brain, or `null` if not found or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async getSystemDevice() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}

		if(!this.isConnected) {
			await this._connectionPromise;
		}

		// JIT enumeration
		if(!this._devicesEnumerated) {
			// Ensure devices enumerated
			await this._enumDevices();
			this._devicesEnumerated = true;
		}

		return Object.values(this.devices)
			.find(d => d.device_driver_id === SYSTEM_DRIVER_ID)		
	}

	/**
	 * Return a hash of `deviceId` => `BrainDevice` instances for this Brain's devices, allowing you to retrieve/watch states 
	 * and execute commands.
	 * 
	 * @returns {object|null} Returns hash with keys being `deviceId`s and values being {@link BrainDevice} instances, or `null` if {@link BrainClient#connectToBrain} or {@link BrainClient#prepareConnection} not called yet.
	 */
	async getDevices() {
		if(!this.ipAddress) {
			await this._ipAddressPromise;
		}

		if(!this.isConnected) {
			await this._connectionPromise;
		}

		// JIT enumeration
		if(!this._devicesEnumerated) {
			// Ensure devices enumerated
			await this._enumDevices();
			this._devicesEnumerated = true;
		}

		return this.devices;
	}

	/**
	 * Retrieve a {@link BrainDevice} based on name or ID of the device
	 * @param {sring} deviceNameOrId - Name or ID of the device to retrieve
	 */
	async getDevice(deviceNameOrId) {
		const deviceLookup = await this.getDevices();
		if(deviceLookup) {
			const foundDevice = 
				deviceLookup[deviceNameOrId] || 
				Object.values(deviceLookup).find(dev => dev.name === deviceNameOrId);
			return foundDevice;
		} else {
			// TODO do we need to test this branch?
			console.warn("[getDevice] device call worked, but `deviceLookup` was falsey");
			return null;
		};
	}

	/**
	 * [PRIVATE]
	 * Retrieves a simplified driver structure enumerating the preconfigured states and commands for the given driver.
	 * Note that this is downloading the cached driver from the Brain, not directly from the cloud API.
	 * 
	 * @param {string} driverId - Driver ID (global UUID for the driver, NOT the deviceId)
	 * @param {string} versionNum - Verion #, NB: **REQUIRED**, Must match cached driver on Brain
	 * @private
	 */
	async _getSimpleDriver(driverId, versionNum=0) {
		const data = await this.http.get('device-drivers/' + driverId + "?version=" + versionNum);
		if(data.status === STATUS_SUCCESS) {
			const { categories } = data.result;

			const _enumCommands = (capabilities, statesHash) => {
				let result = [];
				
				capabilities.forEach(({ name, reference_id, commands }) => {
					const capability = { name, reference_id };
					commands.forEach(({ name, reference_id, codes }) => {

						const dynamicParams = [];
						const staticParams  = [];

						codes.forEach(( { state_references, parameters } ) => {
							state_references.forEach(({ name, state_id, state_key /*, state_name */ }) => {
								dynamicParams.push({
									name,
									state_key,
									state: statesHash[state_id],
								})
							});

							parameters.forEach(({ constraints, name, parameter_type }) => {
								staticParams.push({
									constraints,
									name,
									parameter_type
								})
							})
						});

						result.push({ capability, name, reference_id, staticParams, dynamicParams });
					});
				});

				return result;
			};

			// Simplify a driver for easy reuse
			const simple = {};
			categories.forEach(({
				name, reference_id, capabilities, states, macros 
			}) => {
				const stateList = states.map(({ name, reference_id, primitive_type }) => {
					return { name, reference_id, primitive_type }
				});

				const statesHash = {};
				stateList.forEach(state => {
					statesHash[state.reference_id] = state;
				})

				simple[reference_id] = {
					name,
					reference_id,
					commands: _enumCommands(capabilities, statesHash),
					states: statesHash,
					// Not used right now...
					// macros: macros.map(({ name, reference_id }) => {
					// 	return { name, reference_id }
					// }),
				}
			});


			// console.dir(simple, { depth: 100 });
			return simple;
		}

		return null;

	}

	/**
	 * [PRIVATE]
	 * Enumerates list of devices configured for this space currently provisioned for the brain.
	 *   * Downloads device list
	 *   * Downloads driver for each device
	 *   * Creates/updates {@link BrainDevice} instances for each device
	 * @private
	 */
	async _enumDevices() {
		if(this._enumPromise)
			return this._enumPromise;
		this._enumPromise = defer();

		const res = await this.http.get('devices');

		if (res.status === STATUS_SUCCESS) {
			const devices = res.result.devices;

			await promiseMap(devices, async device => {
				device.driver = await this._getSimpleDriver(
					device.device_driver_id,
					device.device_driver_version
				).catch(ex => {
					console.error("Error downloading driver id " + device.device_driver_id + ": " + ex);
					device.driver = {
						error: ex
					}
				});

				// Create the actual object
				if (this.devices[device.id]) {
					this.devices[device.id]._updateData(device);
				} else {
					this.devices[device.id] = new BrainDevice(this, device);
				}
			});

			// console.dir(devices, { depth: 100 })
			this._enumPromise.resolve(this.devices);
			this._enumPromise = null;
		} else {
			this._enumPromise.reject(res);
			throw new Error("Error enumerating devices: " + res);
		}
	}

	/**
	 * Connect the WebSocket to the Brain
	 * @private
	 */
	_connectSocket() {
		if (!this.ws || this.ws.readyState === WS_CLOSED) {

			/**
			 * Event handler for WebSocket 'onopen' event
			 * @private 
			 */
			const _wsOpen = () => {
				this.isConnected = true;
				this._manuallyDisconnected = false;
				this._connectionPromise.resolve();
				this.emit(BrainClient.EVENTS.WS_CONNECTED);
				
				if(this.opts.remoteAuthorization) {
					this.sendRemoteAuthorization(this.opts.remoteAuthorization);
					setTimeout(() => {
						if(!this.isAuthenticated) {
							this.disconnect();
							this._reconnectNeeded();
						}
					}, CONNECTION_TIMEOUT_MS);
				} else {
					// this.queryExpressModeEnabled();
					this.queryProvisionedInfo();
				}
			},

			/**
			 * Event handler for WebSocket 'onclose' event
			 * @private 
			 */
			_wsClose = () => {
				this.emit(BrainClient.EVENTS.WS_CLOSED);
				this._setConnectionStatus(BrainClient.CONNECTION_DISCONNECTED);
				this._disconnect();

				if(!this._manuallyDisconnected) {
					// TODO: Test automatic reconnect - killing branch? test coverage
					this._reconnectNeeded();
				}
			},

			/**
			 * Event handler for WebSocket 'onerror' event
			 * @private 
			 */
			_wsError = event => {
				// TODO: test coverage of this branch
				Logger.getDefaultLogger().e(BrainClient.LOG_TAG, 'Socket error: ' + event.data);
				this._reconnectNeeded();
			},

			/**
			 * Event handler for WebSocket 'onmessage' event
			 * Note: This is the core handlder for incomming messages to the brain,
			 * it just decodes the JSON then passes it to {@link BrainClient#_incomingBrainEvent} for actual processing.
			 * @private 
			 */
			_wsMessage = event => {
				try {
					const data = JSON.parse(event.data);
					this._incomingBrainEvent(data);
				} catch(error) {
					Logger.getDefaultLogger().e(BrainClient.LOG_TAG, 'Error parsing json: ' + event.data);
				}
			};

			const { ipAddress } = this;
			const ws = this.ws = new WebSocket('ws://' + ipAddress + '/client');
			ws.onopen    = _wsOpen;
			ws.onclose   = _wsClose;
			ws.onmessage = _wsMessage;
			ws.onerror   = _wsError;

			// Cache this client for future access via `getBrainClient`
			if(!BrainClient._cachedBrainClients[ipAddress]) {
				BrainClient._cachedBrainClients[ipAddress] = this;
			}
			
		}
	}

	/**
	 * Disconnect the WebSocket, if connected, closing all communication with the brain.
	 */
	disconnect() {
		this.devices = {};
		this._devicesEnumerated = false;
		this._manuallyDisconnected = true;
		this._disconnect();
	}

	/**
	 * Disconnect without clearing device cache, used by reconnection code and manual {@link BrainClient#disconnect} calls.
	 * @private
	 */
	_disconnect() {
		this.isConnected = false;
		this.isAuthenticated = false;
		this._authPromise = defer();

		if (this.ws && this.ws.readyState !== WS_CLOSED) {
			this.ws.close();
		}

		// Clear cache on disconnect
		// delete BrainClient._cachedBrainClients[this.ipAddress];
	}
	
	/**
	 * Send the string or object over the WebSocket to the brain as-is, no checking/changes.
	 * @param {string|Object} data String or JSON object to send to the Brain
	 */
	sendData(data) {
		if( this.ws && this.isConnected ) {
			this.ws.send(typeof data === 'string' ? data : JSON.stringify(data));
		}

		// For test coverage
		this._lastDataSent = data;
	}

	/** 
	 * Start reconnection timer
	 * @private
	 */
	_reconnectNeeded() {
		this.isReconnecting = true;
		this._disconnect();
		this._setConnectionStatus(BrainClient.CONNECTION_RECONNECTING);

		if(this._reconnectTid) {
			// TODO: Test coverage - debouncing
			clearTimeout(this._reconnectTid);
		}
		
		this._reconnectTid = setTimeout(() => {
			this._connectSocket();
			delete this._reconnectTid;
		}, this.opts.reconnectWaitTime || 1000);
	}

	/**
	 * Get an [RxJS]{@link https://rxjs-dev.firebaseapp.com/} [Observable]{@link https://rxjs-dev.firebaseapp.com/api/index/class/Observable} object. This method is provided to simplify integration of `BrainClient` into Angluar applications.
	 * 
	 * This observable is created using a [Subject]{@link https://rxjs-dev.firebaseapp.com/api/index/class/Subject} object, allowing the same event from this client to be multicast to any observers attached.
	 * 
	 * This observable will contain every event emitted by this client. For example, using event listeners, you might do:
	 * ```javascript
	 * bc.on(BrainClient.EVENTS.CONNECTION_STATUS_CHANGED, ({status}) => console.log("Status:", status));
	 * bc.on(BrainClient.PIN_REQUIRED, () => bc.submitPin(prompt("PIN?")));
	 * ```
	 * Using the `Observable` returned from this method, you can instead do:
	 * ```javascript
	 * bc.asObservable().subscribe(({ event, ...data }) => {
	 * 	switch(event) {
	 * 		case BrainClient.EVENTS.CONNECTION_STATUS_CHANGED:
	 * 			console.log("Status:", data.status);
	 * 			break;
	 * 		case BrainClient.EVENTS.PIN_REQUIRED:
	 * 			bc.submitPin(prompt("PIN?"));
	 * 			break;
	 * 		default:
	 * 			break;
	 * 	}
	 * })
	 * ```
	 *
	 * The shape of the message emitted by the Observable from this method looks like:
	 * ```javascript
	 * const message = {
	 * 	event: "",
	 * 	...data
	 * }
	 * ```
	 * The `event` field above is always and only one of the values from {@link BrainClient.EVENTS}. 
	 * The `data` spread operator above indicates that all other fields from the event (e.g. the args 
	 * that would be passed to your event callback if you used the `on` method to attach callbacks) 
	 * are spread into the `message`, so you receive a single flat-ish object. 
	 * 
	 * That means that the `message` you would receive from the observable for the `CONNECTION_STATUS_CHANGED` event would look like:
	 * ```javascript
	 * const message = {
	 * 	event:  BrainClient.EVENTS.CONNECTION_STATUS_CHANGED,
	 * 	status: BrainClient.CONNECTION_ACTIVE // for example...
	 * }
	 * ```
	 * 
	 * It is useful to note that you can listen for `BrainClient.EVENTS.WS_MESSAGE` to receive ALL events (WebSocket messages) from the brain, unfiltered and unprocessed by the `BrainClient`. 
	 * 
	 * You can also listen for just `BrainClient.EVENTS.BRAIN_EVENT` to listen only for events from the brain that are not handled internally by logic inside the `BrainClient`.
	 * 
	 * @returns {Observable} RxJS Observable object - see [RxJS Observable docs]{@link https://rxjs-dev.firebaseapp.com/api/index/class/Observable} for API docs.
	 */
	asObservable() {
		if(!this._rxSubject || this._rxSubject.isStopped) {
			// const { Subject } = require('rxjs/Rx');
			this._rxSubject = new Subject();
		}

		return this._rxSubject.asObservable(); 
	}

	/**
	 * [INTERNAL]
	 * Emit the given event, and also updates the RX Subject Observable if anyone has 
	 * asked for the observable via `asObservable()`.
	 * 
	 * @param {string} event 
	 * @param {any} data 
	 * @private
	 */
	emit(event, data) {
		super.emit(event, data);
		
		// Only send event via the _rxSubject if previously requested
		// by someone calling `asObservable`
		if (this._rxSubject && !this._rxSubject.isStopped) {
			this._rxSubject.next({
				event,
				...data,
			})
		}
	}

	/**
	 * [PRIVATE]
	 * 
	 * Core handler for incoming messages from the Brain.
	 * 
	 * Based largerly on the `nebula`/`angluar-components`/`BrainSocketAdapterService` class, rewritten for BrainClient.
	 * 
	 * @param {object} data Data from the brain 
	 * @private
	 */	
	async _incomingBrainEvent({ type, ...data }) {

		// Allow interested parties to receive all messages from the brain
		this.emit(BrainClient.EVENTS.WS_MESSAGE, data);

		let eventConsumed = false;
		switch(type) {
			case("brain_status_message"): {
				eventConsumed = true;

				const { brain_provisioned: isProvisioned } = data;
				Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Brain status message - provisioned: ', isProvisioned); 
				this.emit(BrainClient.EVENTS.STATUS_MESSAGE, data);

				if(isProvisioned) {
					if(!this.opts.remoteAuthorization) {
						this.queryExpressModeEnabled();
					} else {
						// TODO: Do we need to set any flags for remote mode here?
					}
				} else {
					// TODO: How should we handle this?
				}
			} break;
			
			case("brain_status_color_msg"): {
				eventConsumed = true;
				this.emit(BrainClient.EVENTS.COLOR_MESSAGE, data);
			} break;

			case("express_mode_flag_msg"): {
				eventConsumed = true;

				const expressModeEnabled = 
					(data['express_mode_enabled'] !== undefined) ? 
					 data['express_mode_enabled'] : false;

				if(expressModeEnabled) {
					this.authRequired       = true;
					this.expressModeEnabled = true;
					this.isAuthenticated    = false;

					this._setConnectionStatus(BrainClient.CONNECTION_AUTHORIZING);

					this._expressModePromise.resolve(true);

					this.emit(BrainClient.EVENTS.EXPRESS_MODE, true);

					// Try default empty PIN first
					this._attemptDefaultPinLogin();
				} else {
					// TODO: Test coverage of this branch
					this.authRequired       = false;
					this.expressModeEnabled = false;
					this.isAuthenticated    = false;

					this._expressModePromise.resolve(false);

					this.emit(BrainClient.EVENTS.EXPRESS_MODE, false);
				}
			} break;

			case("unauthorized_message"): {
				eventConsumed = true;

				// TODO: Test coverage of this branch
				this.emit(BrainClient.EVENTS.PIN_REQUIRED);

				this._loginNeededPromise.resolve(true);

				this._setConnectionStatus(BrainClient.CONNECTION_UNAUTHORIZED);
			} break;

			case("authorized_message"): {
				eventConsumed = true;

				// data example:
				// { brain_id: "aaa57e1a-7c0c-11e9-9b5c-001d5603bbbb", 
				//   session_id: "435920f0-203c-11ea-8173-001d5603cb63", 
				//   token: "..." }
				this.authorization   = data;
				this.isAuthenticated = true;

				this.emit(BrainClient.EVENTS.AUTHORIZED);
				this._loginNeededPromise.resolve(false);
				this._authPromise.resolve();

				this._setConnectionStatus(BrainClient.CONNECTION_ACTIVE);
			} break;

			case("state_change_message"): {
				eventConsumed = true;

				const { device_id, state_changes } = data,
					device = (this.devices || {})[device_id];

				if(device) {
					device.processStateChanges(state_changes);
				} else {
					// TODO: Do we need test coverage of this branch?
					Logger.getDefaultLogger().e(BrainClient.LOG_TAG, "Received state_change_message for unknown device id ", device_id);
				}

			} break;

			case('system_state_message'): {
				let systemState = data['sys_state'];
				let brainState = systemState['state'];
				Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Brain in state: ' + brainState);

				if (brainState === 'active_online' || 
					brainState === 'active_offline') {
					if (this.syncFlag) {
						this.syncFlag = false;

						if(this._devicesEnumerated) {
							// Ensure devices enumerated again before going active
							await this._enumDevices();
						}
				
						this._setConnectionStatus(BrainClient.CONNECTION_ACTIVE);
					}
				} else
				if (brainState === 'brain_sync'
				 || brainState === 'space_sync'
				 || brainState === 'parse_space'
				 || brainState === 'upgrading'
			 	 || brainState === 'resources_sync'
				 || brainState === 'activating'
				 || brainState === 'activating'
				 || brainState === 'initializing') {
					this.syncFlag = true;
					this._setConnectionStatus(BrainClient.CONNECTION_SYNCHRONIZING);
				} else
				if (brainState === 'inactive'
				 || brainState === 'error') {
					// TODO: Test coverage of this branch
					this._setConnectionStatus(BrainClient.CONNECTION_FAILURE);
				}
			} break;

			default: {
				// 
			} break;
		}

		if(!eventConsumed) {
			const genericEvent = 
				type.startsWith("handset_") ?
					BrainClient.EVENTS.HANDSET_MESSAGE :
					BrainClient.EVENTS.BRAIN_EVENT;

			this.emit(genericEvent, {
				type,
				...data
			})
		}
	}

	/**
	 * Just does what it says
	 * @private
	 */
	_attemptDefaultPinLogin() {
		this.submitPin('')
	}

	// The following methods (for the most part)
	// emulate the API offered by BrainSocketAdapterService in the angular-components repo

	/**
	 * Send the PIN to the brain
	 * 
	 * Once you submit the pin, you can `await` {@link BrainClient#isAuthorized} or listen for `BrainClient.EVENTS.AUTHORIZED` to be notified when the authorization succeeeds.
	 * 
	 * NOTE: Response returned as a separate event via the WebSocket
	 * 
	 * @param {string} pin 
	 */
	submitPin(pin) {
		let pinMessage = {
		  type: 'passcode_auth_msg',
		  token: pin
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Submitting pin to brain for authentication');
		this.sendData(pinMessage);
	}

	/**
	 * Request the brain's provisioning status.
	 * 
	 * For more a user-friendly interface to this information, see {@link BrainClient#isProvisioned}.
	 * 
	 * NOTE: Response to this query is returned as a separate event via the WebSocket
	 */
	queryProvisionedInfo() {
		let provisionedMessage = {
			type: 'get_brain_stat_message'
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Querying brain\'s provisioning status');
		this.sendData(provisionedMessage);
	}

	/**
	 * Query to see if express mode is enabled.
	 * 
	 * For more a user-friendly interface to this information, see {@link BrainClient#isExpressModeEnabled}.
	 * 
	 * NOTE: Response to this query is returned as a separate event via the WebSocket
	 */
	queryExpressModeEnabled() {
		let expressModeMessage = {
			type: 'get_express_mode_flag_msg'
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Querying if express mode is enabled');
		this.sendData(expressModeMessage);
	}

	/**
	 * Request the brain's gateway status.
	 * 
	 * For more a user-friendly interface to similar information, see {@link BrainClient#brainInfo} and {@link BrainInfo}.
	 * 
	 * NOTE: Response to this query is returned as a separate event via the WebSocket
	 */
	queryStatus() {
		let queryStatusMessage = {
			method: 'GET',
			path: '/api/v1/status',
			type: 'ws_message_wrapper'
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Querying brain status');
		this.sendData(queryStatusMessage);
	}

	/**
	 * Query handsets from the brain
	 * 
	 * NOTE: Response to this query is returned as a separate event via the WebSocket
	 */
	queryHandsets() {
		let queryHandsetsMessage = {
			method: 'GET',
			path: '/api/v1/space/query-handsets',
			type: 'ws_message_wrapper'
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Querying handsets from brain');
		this.sendData(queryHandsetsMessage);
	}

	/**
	 * Get the layout for a specific handset from the brain and notify the Brain of the selected handset.
	 * 
	 * NOTE: Response to this query is returned as a separate event via the WebSocket
	 * 
	 * @param {string} handsetId ID of the handset to requeset
	 */
	getHandsetLayout(handsetId) {
		let getHandsetMessage = {
			method: 'GET',
			path: '/api/v1/space/layout/' + handsetId,
			type: 'ws_message_wrapper'
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Getting handset from brain');
		this.sendData(getHandsetMessage);

		let setHandsetMessage = {
			method: 'POST',
			path: '/api/v1/set-handset',
			body: {
				handset_id: handsetId,
				watch: true,
				type: 'set_handset_message'
			},
			type: 'ws_message_wrapper'
		};
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Setting handset with brain');
		this.sendData(setHandsetMessage);
	}

	/**
	 * Send a UI action from the handset layout to the Brain. This 
	 * function deals with prebuilt layouts from the Builder.
	 * 
	 * NOTE: To send actions/commands from specific devices, see {@link BrainDevice}. 
	 */
	sendAction(view_id, gesture, values, parameters=[]) { //?: Array<Object>) {
		let actionMessage = {
			method: 'POST',
			path: '/api/v1/event',
			body: {
				view_id: view_id,
				gesture: gesture,
				values: values,
				params: parameters,
				type: 'ui_message'
			},
			type: 'ws_message_wrapper'
		};
		this.sendData(actionMessage);
	}

	/**
	 * Send a prebuilt authorization structure to the Brain
	 * @param {object} auth
	 */
	sendRemoteAuthorization(auth) {
		Logger.getDefaultLogger().d(BrainClient.LOG_TAG, 'Sending remote authorization for authentication with brain');
		this.sendData(auth);
	}
	
	/**
	 * Inform the Brain that this client wants to receive notifications of changes to a 
	 * device's states via the WebSocket.
	 * 
	 * NOTE: This function is not designed for direct user access, although you can call 
	 * if it desired, no ill side effects. 
	 * 
	 * However, a more user-friendly way of watching
	 * for state changes would be to get the `BrainDevice` instance you want to work with
	 * and calling `<device>.on(BrainDevice.STATE_CHANGE, myCallback)`. Internally,
	 * `BrainDevice` will automatically notify the Brain to send state changes when you
	 * attach the event handler for the `BrainDevice.STATE_CHANGE` event to that device.
	 * 
	 * @param {string} device_id Required, device ID of the device on the Brain to watch
	 * @param {Array} states Optional array of states, currently unused in the latest Brain software versions
	 * @param {boolean} unwatch [unwatch=false] Defaults to false. If true, client will tell the brain to unsubscribe this client from state changes for the given device.
	 */
	watchStates(device_id, states=[], unwatch=false) {
		if(!device_id) {
			throw new Error("device_id required");
		}

		// Only enable watchdog if a device is ACTUALLY watching for states
		this.watchdog.enable();

		// From what I can tell on the brain,
		// there is no actual filtering of events based on states changed.
		// Only the device_id is actually used. In other words,
		// the `states` param is ignored, even though it's
		// called for in the respective structures in the brain codebase.
		// You either get all state changes for the device or none.
		// - JB 20191219

		const watchStatesMessage = {
			device_id,
			watched_states: states || [],
			watch: unwatch ? false : true,
			type: 'watch_states_message'
		};
		
		const actionMessage = {
			method: 'POST',
			path: '/api/v1/watch-states',
			body: watchStatesMessage,
			type: 'ws_message_wrapper'
		};

		// console.log("[BrainClient.watchStates] ", watchStatesMessage);

		this.sendData(actionMessage);
	}

	/**
	 * Attach listeners to events. Inherited from the core node module [EventEmitter]{@link https://nodejs.org/api/events.html#events_class_eventemitter} - see that class for more complete `on`/`off` documentation. Included here for documentation purposes and to link to {@link BrainClient.EVENTS} for event names. 
	 * 
	 * Remove event listeners with {@link BrainClient#off}
	 * 
	 * @param {string} event Name of the event to listen to. See {@link BrainClient.EVENTS} for defined event names availale on `BrainClient`
	 * @param {function} callback Your callback to call when the event is triggered
	 */
	on(event, callback) {
		super.on(event, callback);
	}

	/** 
	 * Remove an event attached with {@link BrainClient#on}. Inherited from the core node module [EventEmitter]{@link https://nodejs.org/api/events.html#events_class_eventemitter} - see that class for more complete `on`/`off` documentation. Included here for documentation purposes and to link to {@link BrainClient.EVENTS} for event names. 
	 * 
	 * @param {string} event Name of the event to disconnect from. See {@link BrainClient.EVENTS} for defined event names availale on `BrainClient`
	 * @param {function} callback previously-attached callback
	 */
	off(event, callback) {
		super.off(event, callback);
	}
}

// Attach to class because even tho exported in ES6, 
// bable transpile doesn't always allow import via require
Object.assign(BrainClient, {
	LOG_TAG: "BrainClient",
	// Internal private cache of client instances by IP
	_cachedBrainClients: {},
	SYSTEM_DRIVER_ID,
	DEFAULT_BRAIN_PORT,
	DEFAULT_BRAIN_IP,
	BrainInfo,
	BrainDevice,
	EVENTS: ClientEvents,
	...ConnectionStates,
	CONNECTION: ConnectionStates,
	ErrorClientNotInitalized,
	ErrorExpressModeDisabled,
	ErrorNotProvisioned,
	Logger,
	defer,
	Logger,
	defer
});