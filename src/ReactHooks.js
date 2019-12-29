// import React from 'react';
import BrainDevice from './BrainDevice';
import BrainClient from './BrainClient';

// class SimpleObjectCache {
// 	_find(...arrayOfValues) {
// 		if(!this._list) {
// 			this._list = [];
// 		}
// 		let hasRecord = null;
// 		this._list.forEach(record => {
// 			hasRecord = record;
// 			let found = true;
// 			record.forEach(value => {
// 				if(!arrayOfValues.includes(value)) {
// 					found = false;
// 				}
// 			});

// 			if(!found) {
// 				hasRecord = null;
// 			}
// 		});
// 		return hasRecord;
// 	}

// 	get(...arrayOfValues) {
// 		return this._find(arrayOfValues);
// 	}

// 	delete(...arrayOfValues) {
// 		const record = this._find(arrayOfValues);
// 		this._list = this._list.filter(r => r !== record);
// 	}

// 	add(...arrayOfValues) {
// 		if(!this.get(...arrayOfValues)) {
// 			this._list.push(arrayOfValues);
// 		}
// 	}
// }


// function useAsync(createPromiseCallback = () => {}, depedantList=[], onEffect = () => {}, offEffect = () => {}) {
// 	const [ asyncData, setAsyncData ] = React.useState(null);
	
// 	const key = [ createPromiseCallback, ...(depedantList || []) ];
// 	if(!useAsync.__flags.get(key)) {
// 		useAsync.__flags.add(key);

// 		if (asyncData) {
// 			if(!asyncData[useAsync.LoadStarted]) {
// 				asyncData[useAsync.LoadStarted] = true;
// 				setAsyncData(asyncData);
// 			}
// 		} else {
// 			setAsyncData({ [useAsync.LoadStarted]: true })
// 		}

// 		createPromiseCallback(asyncData, setAsyncData)
// 		.then(response => {
// 			if(response) {
// 				response[useAsync.LoadDone] = true;
// 			} else {
// 				response = { 
// 					[useAsync.LoadDone]: true, 
// 					[useAsync.EmptyResult]: true
// 				};
// 			}
// 			useAsync.__flags.delete(key);
// 			setAsyncData(response);
// 		})
// 		.catch(error => {
// 			useAsync.__flags.delete(key);
// 			setAsyncData({
// 				[useAsync.LoadDone]: true,
// 				error
// 			})
// 		});
// 	}

// 	React.useEffect(() => {
// 		onEffect(asyncData, setAsyncData);
// 		return () => offEffect(asyncData, setAsyncData);
// 	}, [ asyncData, setAsyncData ]);

// 	return asyncData;
// }

// useAsync.LoadStarted = '__loadStarted__';
// useAsync.LoadDone    = '__loadDone__';
// useAsync.EmptyResult = '__emptyResult__';
// useAsync.__flags     = new SimpleObjectCache();

/**
 * The `BrainClient.ReactHooks` namespace has several utility hooks that make integrating
 * {@link BrainClient} into React apps easy without requiring you to attach event listeners
 * or handle async responses directly in your functional rendering component.
 *  
 * **Example usage:**
 * ```javascript
 * function BrainSecondTicker({ ipAddress }) {
 * 	// getBrainClient does not need a hook because it is not async and always
 *	// returns same client for the same ipAddress
 * 	const bc          = BrainClient.getBrainClient(ipAddress);
 * 	const sysDevice   = BrainClient.ReactHooks.useDevice(bc, 'System Device');
 *	const secondState = BrainClient.ReactHooks.useDeviceState(sysDevice, 'SECOND_STATE');
 * 
 * 	// Render the state as JSX
 *	// This will automatically re-render whenever
 *	// the Brain sends a new value for the state
 *	return (<>
 *		Current Seconds on {ipAddress}: <b>{secondState.normalizedValue}</b>
 *	</>);
 * }
 * ```
 *
 * @class BrainClient.ReactHooks
 */

	// /**
	//  * Utility hook used by the other hooks here to return the result of an async promise
	//  * while guarding against multiple invocations while promise is executing and catching any errors.
	//  * 
	//  * `useAsync` adds a `__loadStarted__` key to the return value when the promise starts, set to `true`.
	//  * When the promise resolves (with error or with data), that key is removed and the `__loadDone__` key is added
	//  * and set to true. If there is an error caught, it will be put in the `error` key on the result.
	//  * 
	//  * Note that even with those keys added, the type of the original data is unchanged **IF** the data from 
	//  * the promise is a truthy value.
	//  * Otherwise, the object will be set to an `object` containing just the relevant `__loadStarted__`/`__loadDone__` and error keys.
	//  * 
	//  * @param {function} createPromiseCallback - Function that returns a thenable/error promise
	//  * @param {array} depedantList - List of depednants that make this promise unique, used to uniquely guard against multiple invocations
	//  * @param {function} onEffect (optional) Effect to run when component mounted
	//  * @param {function} offEffect (optional) Effect to run when component unmounted
	//  * @returns {object} Object decorated with `__loadStarted__`, `__loadDone__`, and possibly `error` keys as needed, as well as the original data returned from the promise
	//  * @memberof BrainClient.ReactHooks
	//  */
	// export function useAsync(createPromiseCallback, depedantList, onEffect, offEffect) {
	// 	return useAsync(createPromiseCallback, depedantList, onEffect, offEffect);
	// }

	/**
	 * Provides a React Hook to retrieve a device from the Brain given the device Name or ID
	 * @param {BrainClient} client - Client to use to access devices
	 * @param {sring} deviceNameOrId - Name or ID of the device to retrieve
	 * @returns {BrainDevice} Returned value will eventually be set to {@link BrainDevice} object
	 * @memberof BrainClient.ReactHooks
	 */
	export function useDevice(client, deviceNameOrId) {
		// Dynamically require react so that people don't have to have React
		// installed just to use BrainClient because index.js requires ReactHooks
		// for re-export
		const React = require('react');
		const [ device, setDevice ] = React.useState();

		// If client is a string, assume the user gave IP or Host and resolve 
		// that to a client instance before continuing
		if(typeof(client) === "string") {
			client = BrainClient.getBrainClient(client);
		}
	
		if(client) {
			client.getDevice(deviceNameOrId).then(foundDevice => {
				// console.log("[ReactHooks.useDevice] got foundDevice ", foundDevice, "for deviceNameOrId=", deviceNameOrId);
				setDevice(foundDevice);
			});
		} else {
			console.warn("[ReactHooks.useDevice] no client given, cannot get devices");
		}

		return device;
	}

	//
	// Disable these until we can test these out further:
	//
	// /**
	//  * Get the list of commands a device supports. See {@link BrainDevice#getCommands} for more documentation on this result.
	//  * @param {BrainDevice} device Device to get the commands from
	//  * @returns {object} Object of command IDs > command Info objects, see {@link BrainDevice#getCommands} for more documentation on this result.
	//  * @memberof BrainClient.ReactHooks
	//  */
	// static useDeviceCommands(device) {
	// 	return useAsync(async () => {
	// 		if(!device)
	// 			return {};
	// 		return device.getCommands();
	// 	}, [ device ])
	// }
	
	// /**
	//  * Get the list of states and their current values. See {@link BrainDevice#getStates} for more documentation on this result.
	//  * @param {BrainDevice} device Device to get the states from
	//  * @returns {object} Object of state IDs > state Info objects, see {@link BrainDevice#getStates} for more documentation on this result.
	//  * @memberof BrainClient.ReactHooks
	//  */
	// static useDeviceStates(device) {
	// 	return useAsync(async () => {
	// 		if(!device)
	// 			return {};
	// 		device.getStates();
	// 	}, [ device ]);
	// }
	
	/**
	 * Get a specific state from the device. This method will automatically attach a listener to the `BrainDevice.STATE_CHANGED`
	 * event and automatically update the returned value whenever a new state value is received from the brain.
	 * 
	 * Uses `React.useEffect` internally to attach/remove event listener for that event so event listener is removed when 
	 * component unmounts.
	 * 
	 * See {@link BrainDevice#getState} for more documentation on this result.
	 * 
	 * @param {BrainDevice} device Device to get the commands from
	 * @param {string} stateNameOrId Name or ID of state to retrieve and watch
	 * @returns {object} State information object, see {@link BrainDevice#getState} for more documentation on this result.
	 * @memberof BrainClient.ReactHooks
	 */
	export function useDeviceState(device, stateNameOrId) {
		// Dynamically require react so that people don't have to have React
		// installed just to use BrainClient because index.js requires ReactHooks
		// for re-export
		const React = require('react');
		const [state, setState] = React.useState(null);

		(async () => {
			if (!device) 
				return null;
			setState(await device.getState(stateNameOrId));
		})();
		
		React.useEffect(() => {
			if(!useDeviceState._listenerCache) {
				useDeviceState._listenerCache = {};
			}

			const onStateChange = useDeviceState._listenerCache[stateNameOrId] = async newData => {
				// We will receive all state changes on the device,
				// so ignore states we don't want
				if(newData.id !== stateNameOrId) {
					return;
				}
				// Use the `getState` method so the data is the same shape as 
				// the original data returned from this hook
				const originalState = await device.getState(stateNameOrId);
				setState(Object.assign({}, originalState, newData));
			};
		
			if (device instanceof BrainDevice)
				device.on(BrainDevice.STATE_CHANGED, onStateChange);
		
			// Stop listening for changes on unmount
			return  () => {
				const onStateChange = useDeviceState._listenerCache[stateNameOrId];
				if (device instanceof BrainDevice)
					device.off(BrainDevice.STATE_CHANGED, onStateChange);
			};
		}, [ device, stateNameOrId ]);

		return state;
	}

	/**
	 * Get a React state variable containing current state value from {@link BrainClient.CONNECTION} for 
	 * the given {@link BrainClient}. 
	 * 
	 * Event listeners are attached in a `React.useEffect` hook to automatically attach/unattach
	 * from the `BrainClient.EVENTS.CONNECTION_STATUS_CHANGED` event and automatically update the
	 * variable returned from this hook with the new status whenever the status changes.
	 * 
	 * Related: See {@link BrainClient#getConnectionStatus} and {@link BrainClient.CONNECTION} for documentation on the 
	 * various possible connection states.
	 * 
	 * @param {BrainClient} brainClient Brain client from which to get connection status
	 * @returns {string} One of the connection state strings described in {@link BrainClient.CONNECTION} indicating the current connection state of the given {@link BrainClient}. Related, see {@link BrainClient#getConnectionStatus}.
	 * @memberof BrainClient.ReactHooks
	 */
	export function useConnectionStatus(brainClient) {
		// Dynamically require react so that people don't have to have React
		// installed just to use BrainClient because index.js requires ReactHooks
		// for re-export
		const React = require('react');
		const [ connectionStatus, setConnectionStatus ] = React.useState(
			brainClient ?
			brainClient.getConnectionStatus() :
			null
		);
		
		React.useEffect(() => {

			if (brainClient) {
				brainClient.on(
					BrainClient.EVENTS.CONNECTION_STATUS_CHANGED,
					data => setConnectionStatus(data.status)
				);

				setConnectionStatus(brainClient.getConnectionStatus());
			}

			return () => {
				if (brainClient) {
					brainClient.off(
						BrainClient.EVENTS.CONNECTION_STATUS_CHANGED,
						data => setConnectionStatus(data.status)
					)
				}
			}

		}, [ brainClient ]);
		
		return connectionStatus;
	}


export default {
	useDevice,
	useDeviceState,
	useConnectionStatus
}