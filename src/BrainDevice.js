import EventEmitter from 'events';
import Logger from './utils/Logger';
import genId from './utils/gen-id';
import defer from './utils/defer';
import SYSTEM_DRIVER_ID from './utils/system-driver-id';

/**
 * Error thrown by {@link BrainDevice#setCustomState} when trying to set a custom state on a device that is not the system device
 * @class BrainDevice.ErrorNotSystemDevice
 */
class ErrorNotSystemDevice extends Error {};

/**
 * Error thrown by {@link BrainDevice#setCustomState} (and others) when trying to set a custom using a key that is not a valid ID or Name
 * @class BrainDevice.ErrorInvalidState
 */
class ErrorInvalidState extends Error {}

/**
 * Error thrown by {@link BrainDevice#sendCommand} when trying to send a command using a key that is not a valid ID or Name
 * @class BrainDevice.ErrorInvalidCommand
 */
class ErrorInvalidCommand extends Error {}

/**
 * Interface for a single device attached to a Brain. See {@link BrainClient#getDevice} on how to
 * get an instance of this class for a single device, or {@link BrainClient#getDevices} to get all
 * devices attached to the connected brain. 
 * 
 * BrainDevices have three main purposes:
 * * Enumerating *properties* about the device, such as `id` and `name` (properties are documented below under <a href='#BrainDevice'>the constructor</a>)
 * * Providing access to *commands* (enumerate and send commands)
 * * Providing access to *states* (enumerate and receive changes and set custom states)
 * 
 * **<h3>Commands</h3>** 
 * See the following methods for more info on working with commands:
 * * Get all the commands available: {@link BrainDevice#getCommands}
 * * Send a command to the device: {@link BrainDevice#sendCommand}
 *
 * Related tutorial: 
 * * See: <a href='./tutorial-400-sendingcommands.html'>Basics/Sending Commands</a>
 * 
 * **<h3>States</h3>**
 * See the following methods for more info on working with states:
 * * Get all the commands available: {@link BrainDevice#getStates} 
 * * Send a custom state (only relevant for [System Devices]{@link BrainDevice#isSystemDevice}): {@link BrainDevice#setCustomState}
 * 
 * Related tutorial: 
 * * See: <a href='./tutorial-500-states.html'>Basics/Watching States</a>
 * 
 * **<h3>Listening for State Changes</h3><a name='statechanges'></a>**
 * State Changes are sent via the `BrainDevice.STATE_CHANGED` event. To listen state changes
 * on the device, just attach an event listener, like this:
 * 
 * ```javascript
 * someDevice.on(BrainDevice.STATE_CHANGED, change => {
 * 	console.log(`Device ${someDevice.id} > State ${change.id} is now "${change.normalizedValue}`);
 * })
 * ```
 *
 * It's important to realize the `BrainDevice.STATE_CHANGED` event fires for ALL states 
 * on the device. You must filter on the `id` property of the payload to see if the event 
 * represents a change of the state you are interested in.
 * 
 * What's in a state change payload? Glad you asked. Here you go:
 * ```javascript
 * const stateChangeExample = {
 * 	id: "SECOND_STATE", // The ID of the state, usually a grokable string like this
 * 	key: undefined, // The State Key - often unused, usually blank/undefined
 * 	name: "Current Second", // Human-readable state name
 * 	value: "58", // The current value of the state as a string
 * 	normalizedValue: "58", // The normalized value of the state (normalized by the Brain), also a string, usually identical to the `value` but not always.
 * }
 * ```
 * 
 * Related tutorial: 
 * * See: <a href='./tutorial-500-states.html'>Basics/Watching States</a>
 * 
 * **<h3>Nota Bene</h3>**
 * *NOTE:* You should never call the constructor directly, devices will be created by 
 * the BrainClient when enumerating devices internally.
 * 
 * *NOTE:* This class is not exported directly, but accessible as `BrainClient.BrainDevice` if you ever need
 * to access it for typechecking, etc.
 * 
 * @property {string} id ID of the device
 * @property {string} name Name of the Device
 * @property {string} description Device description, possibly blank
 * @property {string} created_by User in Kramer Control that created the device in the Space
 * @property {string} created_date Date that this device was added to the Space in Kramer Control
 * @property {object} driver Simplified device driver, for internal use, but feel free to examine if interested. Used by all the state/command methods internally. 
 */
export default class BrainDevice extends EventEmitter {

	// [internal] Create a new BrainDevice. NOTE: You should never call the constructor directly,
	// this will be called by the BrainClient when enumerating devices internally.
	constructor(brainClient, deviceDataWithDriver) {
		super();

		// Store client ref
		this._client = brainClient;

		// Enum commands and states
		this._updateData(deviceDataWithDriver);

		// So we don't call multiple _watchStateChanges when getState/getStates
		this._hasStateChanges = false;
	}

	_updateData(deviceDataWithDriver) {
		// For testing...
		this.revisedDataReceived = true; 

		Object.assign(this, deviceDataWithDriver);

		this._enumCustomStates();
		this._enumDriver();
	}

	_enumCustomStates() {
		this._statesById = {};
		this._statesByName = {};
		
		// For each returning later
		this._customStatesById = {};
		
		if(!this.isSystemDevice()) {
			return;
		}

		this.custom_states.forEach(data => {
			const state = this._normalizeState(data, true);	
			this._statesById[state.id]       = state;
			this._statesByName[state.name]   = state;
			this._customStatesById[state.id] = state;
		});
	}

	_normalizeState({
		name,
		reference_id,
		primitive_type,
		customData,
	}, _isCustomState) {
		const state = {
			name,
			id:   reference_id,
			type: primitive_type,
			value: null,
			normalizedValue: null,
		}
		if(_isCustomState) {
			Object.assign(state, {
				customData,
				_isCustomState,
			});
		}
		return state;
	}

	_enumDriver() {
		this._commandsById = {};
		this._commandsByName = {};

		Object.values(this.driver).forEach(category => {
			const catInfo = {
				name: category.name,
				id: category.reference_id,
			};

			// enum states
			Object.values(category.states).forEach(data => {
				const state = this._normalizeState(data);
				state.category = catInfo;
				this._statesById[state.id]     = state;
				this._statesByName[state.name] = state;
			});

			// enum commands
			Object.values(category.commands).forEach(({
				capability: {
					reference_id: capabilityId,
					name: capabilityName,
				},
				name,
				reference_id: id,
				staticParams,
				dynamicParams,
			}) => {
				const command = {
					category: catInfo,
					capability: {
						id: capabilityId,
						name: capabilityName
					},
					id,
					name,
					params: {},
					states: {},
				};

				// extract state refs from dynamicParams
				(dynamicParams || []).forEach(({
					name,
					state: {
						reference_id: stateId
					}
				}) => {
					const state = this._statesById[stateId];
					command.params[name] = { state };
					command.states[stateId] = state;
				});

				// extract static params
				(staticParams || []).forEach(({
					name,
					constraints,
					parameter_type: type
				}) => {
					command.params[name] = {
						constraints,
						type
					};
				});

				this._commandsById[id]     = command;
				this._commandsByName[name] = command;
			});

		});
	}

	/**
	 * Returns true if this is the system device for this Brain.
	 * 
	 * The **System Device** is a virtual device provided internally by the Brain
	 * and it provides core services such as time, weather, brain status, 
	 * custom states, etc. Only the System Device can have custom states.
	 * 
	 * @returns {boolean} `true` if this is the system device
	 */
	isSystemDevice() {
		return this.device_driver_id === SYSTEM_DRIVER_ID;
	}

	async _ensureStateValues(specificStates=null) {
		if(!this._hasStateChanges) {
			
			if (!this._statePromise)
				this._statePromise = defer();

			this._specificStates = specificStates;
			this._watchStateChanges();
			
			await this._statePromise;
		}
	}

	/**
	 * Get a hash of state IDs => state objects for this device
	 * @returns {object} Object containing keys of state IDs and values being the state info
	 */
	async getStates() {
		await  this._ensureStateValues();
		return this._statesById;
	}

	/**
	 * Returns an object containing only custom states. If this is not the system device, returns null.
	 */
	async getCustomStates() {
		await this._ensureStateValues();
		if(!this.isSystemDevice())
			return null;
		return this._customStatesById;
	}

	/**
	 * Gets information about the state, including current `value` and `normalizedValue`
	 * 
	 * @param {string} key State ID or State Name
	 * @returns {object|null} Object describing the state or `null` if the state doesn't exist
	 */
	async getState(key) {
		await  this._ensureStateValues();
		return this._statesById[key] || this._statesByName[key];
	}

	/**
	 * Get hash of commands with keys being the ID and the values being the info about the command
	 * 
	 * See {@link BrainDevice#getCommand} for documentation on what each command looks like.
	 * 
	 */
	getCommands() {
		return this._commandsById;
	}

	/**
	 * Get an object describing the requested command, or `null` if if the command doesn't exist. This is the same object
	 * as returned from {@link BrainDevice#getCommands} as the value associated with each command ID.
	 * 
	 * An example return value from this method would look like:
	 * ```javascript
	 * {
	 * 	id: "SET_SYSTEM_USE",
	 * 	name: "Set System Use",
	 * 	params: { ... },
	 * 	states: { ... },
	 * 	category: { ... },
	 * 	capability: { ... },
	 * }
	 * ```
	 * The `params` key provides info for you as the programmer to know what params the command expects. See more discussion on this key below. 
	 * The `states`, `category`, and `capability` keys are internal keys that provide internal config information.
	 * 
	 * The `params` object looks like:
	 *
	 * ```javascript
	 * {
	 * 	...
	 * 	POWER: {
	 * 		type: 'boolean',
	 * 		constraints: { ... },
	 * 	},
	 * 	SYSTEM: {
	 * 		state: { ... },
	 * 	},
	 * 	...
	 * }
	 * ```
	 * 
	 * For a params object like the above, you would pass those params to {@link BrainDevice#sendCommand} like this:
	 * ```javascript
	 * device.sendCommand(SOME_COMMAND, {
	 * 	POWER: 'ON',
	 * 	SYSTEM: '50'
	 * })
	 * ```
	 * 
	 * The above `params` object example shows two different types of params:
	 * * Dynamic (state-based)
	 * * Static (not state-based)
	 * 
	 * Dynamic (state-based) params change an associated state, and that state provides type hint info. Whereas static (non state-based) params do not change any states and contain all the type hint info in themselves as shown above.
	 *
	 * See the associated [examples/command-info.js]{@link https://github.com/kramer-control/brain-client/blob/master/examples/command-info.js} for a complete example showing how to get the `params` from the command.
	 * 
	 * @param {string} key Command ID or Name
	 * @returns {object|null} Returns an object describing the command or `null` if the command doesn't exist
	 */
	getCommand(key) {
		return this._commandsById[key] || this._commandsByName[key];
	}

	/**
	 * Set a custom state to a given value
	 * 
	 * **NOTE:** The concept of "Custom States" (and hence, this method) is only relevant on the System Device ({@link BrainDevice#isSystemDevice} must return `true`)
	 * otherwise calling this method will throw an error.
	 * 
	 * @param {string} key State ID or Name - throws {@link BrainDevice.ErrorInvalidState} if the ID/Name is not a defined custom state (must be defined in the KC Builder)
	 * @param {any}    value Any valid value
	 * @throws {BrainDevice.ErrorInvalidState} {@link BrainDevice.ErrorInvalidState} if ID/Name is not a defined custom state value 
	 */
	async setCustomState(key, value) {
		if(!this.isSystemDevice()) {
			throw new ErrorNotSystemDevice("Not a system device");
		}

		const state = key.id ? key : this.getState(key);
		if(!state) {
			throw new ErrorInvalidState("Invalid state key " + key + " - does not match any known custom state Name or ID");
		}

		if(!state._isCustomState) {
			throw new ErrorInvalidState("State " + key + " is not a custom state, you cannot set states directly that are not custom states");
		}

		const macro = { 
			id:      genId(),
			type:    'send_macro_message',
			actions: [{
				type:          "state_change",
				device_id:     this.id,
				capability_id: "CUSTOM_STATES",
				category_id:   "CUSTOM_STATES",
				state_id:      state.id,
				state_name:    state.name,
				static_parameters: [{
					// "New_Value" is the required name for setting custom states.
					// If not found, Brain will not set the state
					"name":  "New_Value",
					"value": (value + ""), // force-stringify since Brain does not handle literal numbers 
				}],
			}],
		};

		const actionMessage = {
			method: 'POST',
			path:   '/api/v1/send-macro',
			body:   macro,
			type:   'ws_message_wrapper'
		};

		// console.log("BrainDevice: Send set state macro: ");
		// console.dir(actionMessage, { depth: 999 });

		// send the macro
		this._client.sendData(actionMessage);

		// wait for next update from brain
		this._hasStateChanges = false;
		await this._ensureStateValues();

		return state;
	}

	/**
	 * Execute command and return any changed states.
	 * 
	 * **Example Usage**
	 * ```javascript
	 * device.sendCommand('SEND_SYSTEM_USE', {
	 *	SYSTEM_STATE: 'ON'
	 * });
	 * ```
	 * 
	 * @param {string|object} key Command ID, command Name, or command object - throws {@link BrainDevice.ErrorInvalidCommand} if given a command ID or name that doesn't exist
	 * @param {object} params Key/value object of params for the command
	 * @throws {BrainDevice.ErrorInvalidCommand} Throws {@link BrainDevice.ErrorInvalidCommand} if given ID/Name not a defined command
	 */
	async sendCommand(key, params={}) {
		const command = key.id ? key : this.getCommand(key);
		if(!command) {
			throw new ErrorInvalidCommand("Invalid command key " + key + " - does not match any known command Name or ID");
		}

		const macro = {
			id:   genId(),
			type: 'send_macro_message',
			actions: [{
				type:               "command",
				capability_id:      command.capability.id,
				category_id:        command.category.id,
				command_id:         command.id,
				command_name:       command.name,
				device_driver_id:   this.device_driver_id,
				device_id:          this.id,
				dynamic_parameters: [],
				gesture:            "",
				static_parameters:  Object.keys(params).map(name => {
					return {
						id:    genId(),
						name:  name.toUpperCase(),
						value: params[name] + "",
					}
				}),
			}]
		}

		let actionMessage = {
			method: 'POST',
			path:   '/api/v1/send-macro',
			body:   macro,
			type:   'ws_message_wrapper'
		};

		// console.log("BrainDevice: Send command macro: ");
		// console.dir({actionMessage, command}, { depth: 999 });
		
		// send the macro
		this._client.sendData(actionMessage);

		// Setup specific hash so flags can be set
		const specificStates = {};
		Object.keys(command.states).forEach(id => specificStates[id] = false);
		
		// wait for next update from brain
		this._hasStateChanges = false;
		await this._ensureStateValues(specificStates);

		const results = {};

		Object.keys(command.states).forEach(id => {
			results[id] = this._statesById[id].value;
		});

		return results;
	}

	

	/**
	 * Attach an event listener to this device. If you pass the `STATE_CHANGED` event
	 * as the event name, the attached {@link BrainClient} will automatically inform the brain
	 * to start sending state changes for this device.
	 * 
	 * Note: The `STATE_CHANGED` event fires for ALL states on the device. You must filter
	 * on the `id` property of the payload to see if the event represents a change of the state
	 * you are interested in.
	 * > Related: See notes at the top of <a href='#statechanges'>this file titled "Listening for State Changes</a>
	 * 
	 * This overrides [EventEmitter]{@link https://nodejs.org/api/events.html#events_class_eventemitter}'s `on` function to intercept the event name,
	 * but still useses `EventEmitter` to handle events, so you can use the 
	 * inheritted `off` from `EventEmitter` to stop listening for changes.
	 * 
	 * @param {string} event Name of the event to watch
	 * @param {function} callback Your event handler callback
	 */
	on(event, callback) {
		super.on(event, callback);

		if(event === BrainDevice.STATE_CHANGED) {
			this._watchStateChanges();
			// console.warn("[Device] listener attached, starting watch for ", this.id, this.name)
		}
	}

	/**
	 * Remove an event listener from this device. If you pass the `STATE_CHANGED` event
	 * as the event name, the attached {@link BrainClient} will automatically 
	 * unsubscribe from state changes for this device if there are no other event listeners
	 * for the `STATE_CHANGED` event.
	 * 
	 * This overrides [EventEmitter]{@link https://nodejs.org/api/events.html#events_class_eventemitter}'s `off` function to intercept the event name,
	 * but still useses `EventEmitter` to handle events, so you can use the 
	 * inheritted `on` from `EventEmitter` to start listening for changes again.
	 * 
	 * @param {string} event Name of the event to stop listening from
	 * @param {function} callback Your event handler callback (must be identical to what you passed to {@link BrainDevice#on})
	 */
	off(event, callback) {
		super.off(event, callback);

		const sc = BrainDevice.STATE_CHANGED;
		if(event === sc) {
			// EventEmitter stores it's listeners in this._events, so we
			// just use that to check for all events disconnected
			if(!this._events[sc] || this._events[sc].length <= 0) {
				// console.error("[Device] ALL listeners removed", this.id, this.name, sc)
				this._unwatchStateChanges();
			}
		}
	}

	// [internal] Manually ask for state changes from the brain. However, you should not need to call this
	// in practice. Just call `<device>.on("STATE_CHANGED", () => {})` and BrainDevice will
	// call this internally.
	_watchStateChanges() {
		if(this._watchStateRequested) {
			return;
		}
		this._watchStateRequested = true;

		this._client.watchStates(this.id);
	}

	_unwatchStateChanges() {
		this._watchStateRequested = false;
		// Final 'true' arg is 'unwatch' - tells the brain to unsubscribe
		// this client from changes to this device
		this._client.watchStates(this.id, [], true);
	}

	_reconnected() {
		if(this._watchStateRequested) {
			// TODO: Add test coverage of this branch/situation
			console.log("[Device] reconnected, reqeusting state watch again for ", this.id, this.name)
			this._client.watchStates(this.id);
		}
	}

	// [internal] Called from BrainClient when receiving a state_change_event
	// with this device's device ID
	processStateChanges(stateChangeList) {
		this._hasStateChanges = true;

		/* Sample:
			[
				{
					category_id: 'VOLUME',
					category_name: 'Volume',
					device_driver_id: 'c2fa61a6-5d45-4a3b-a3e2-60d3899802df',
					device_driver_version: 3,
					device_id: '098793c1-b73e-4dc2-99d4-b7be0308a24a',
					device_name: 'Jay System Clock - Other - TCP_UDP',
					feedback_codes: [Array],
					is_state_changed: false,
					log_changes: true,
					logging_threshold: 0,
					state_id: 'STATE_1',
					state_key: '',
					state_name: 'Volume',
					state_normalized_value: '0.55',
					state_value: '55'
				}
			]
		*/
		stateChangeList.forEach(change => {
			const { 
				state_id: id, 
				state_key: key, 
				state_name: name,
				state_normalized_value: normalizedValue,
				state_value: value
			} = change,
			normalizedChange =  {
				id,
				key,
				name,
				value,
				normalizedValue
			};

			const state = this._statesById[id];
			if (state) {
				state.value = value;
				if(state.type === 'number') {
					state.normalizedValue = parseFloat(normalizedValue);
				} else {
					state.normalizedValue = normalizedValue;
				}

				// console.log(`${Date.now()}: stateChangeInternal: updating state id=${id}:`, state)

			} else {
				// console.log("State ID not found in internal enum:", id, Object.keys(this._statesById));
				Logger.getDefaultLogger().e(BrainDevice.LOG_TAG, "State ID not found in internal enum:", id, Object.keys(this._statesById));
			}

			// if(id !== 'SECOND_STATE')
			// 	console.log(`${Date.now()}: stateChangeInternal: normalizedChange:`, normalizedChange)
			// Logger.getDefaultLogger().d(BrainDevice.LOG_TAG, "Device state changed, normalizedChange=", normalizedChange);


			if (this._statePromise) {
				let completed = true;
				if (this._specificStates && this._specificStates[id] !== undefined) {
					this._specificStates[id] = true;
					// Only completed if all _specificStates set to true indicating all states are received
					const fl = Object.values(this._specificStates).filter(flag => flag);
					completed = fl.length === 0;

					// if(id !== 'SECOND_STATE') {
					// 	console.log("[state change]", { id, s: this._specificStates, completed, value })
					// 	console.log(" ** ", fl);
					// }
				}

				if(completed) {
					this._statePromise.resolve();
					this._statePromise = null;
				}
			}


			this.emit(BrainDevice.STATE_CHANGED, normalizedChange)
		})
	}
}


Object.assign(BrainDevice, {
	ErrorNotSystemDevice,

	/**
	 * @property {string} STATE_CHANGED - Static class property, event name that is emitted when a state on 
	 * this device changes on the Brain. Use like: `BrainDevice.STATE_CHANGED`. See notes at the top of <a href='#statechanges'>this file titled "Listening for State Changes</a>.
	 * @memberof BrainDevice
	 */
	STATE_CHANGED: "STATE_CHANGED",

	// Internal prop used for logging
	LOG_TAG: "BrainDevice",
});