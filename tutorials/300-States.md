# Device States

Devices provide "States" which represent values on a device. For example, a mixer may provide a "VOLUME" state, and the System Device provides a "SECOND_STATE". 

States are defined by the device driver for all devices except the System Device, which supports Custom States.

States are "live" which mean they can and will be changed by the Brain in response to feedback from the relevant attached device. To receive notification of when a state changes, see "Watching States", below.

## Overview

For a general overview of Devices and information on getting a device instance, see the following related tutorial:

* Related Tutorial: [Working with Devices](./tutorial-201-Devices.html)

## Enumerating States on a Device

Once you have your device reference, use the [BrainDevice.getStates](./BrainDevice.html#getStates) method to list all states on a device. This will return an object with the keys as the IDs of the states, and the values containing objects describing the individual states.

If the device is a system device ([BrainDevice.isSystemDevice](./BrainDevice.html#isSystemDevice) returns true), then you can use [BrainDevice.getCustomStates](./BrainDevice.html#getCustomStates) to get just the custom states.

The objects describing each state have the following shape:
```javascript
const sampleStateInfo = {
	// Human-readable name of the state
	name: "Current Seconds",
	// ID of the state
	id:   "SECOND_STATE",
	// Primitive type of the values
	type: "string",
	// The current value of the state (updated when the state changes)
	value: null,
	// The current value of the state (updated when the state changes)
	// Normalized by the brain
	normalizedValue: null,
	// If this state is a custom state, this field will instead be
	// defined as `true`. If it is not a custom state, this field will
	// not be present in the object,
	_isCustomState: undefined,
	// If this is a custom state (`_isCustomState === true`),
	// then this object will contain arbitrary data describing the state.
	// If it is not a custom state, this field will not be present.
	customData: { /*...*/ },
}
```

## Listening for State Changes
State Changes are sent via the `BrainDevice.STATE_CHANGED` event. To listen state changes
on the device, just attach an event listener, like this:

```javascript
someDevice.on(BrainDevice.STATE_CHANGED, change => {
	console.log(`Device ${someDevice.id} > State ${change.id} is now "${change.normalizedValue}`);
})
```

It's important to realize the `BrainDevice.STATE_CHANGED` event fires for ALL states 
on the device. You must filter on the `id` property of the payload to see if the event 
represents a change of the state you are interested in.

What's in a state change payload? Glad you asked. Here you go:
```javascript
const stateChangeExample = {
	id: "SECOND_STATE", // The ID of the state, usually a grokable string like this
	key: undefined, // The State Key - often unused, usually blank/undefined
	name: "Current Second", // Human-readable state name
	value: "58", // The current value of the state as a string
	normalizedValue: "58", // The normalized value of the state (normalized by the Brain), also a string, usually identical to the `value` but not always.
}
```

## Set Custom State Values

On System Devices, you can set the values of custom states directly. You cannot define custom states from the Brain Client, but you can set the value of the states. To define new custom states, you must use the [Kramer Control Builder](https://kramercontrol.com/builder/).

To set a custom state, pass the name or ID and the new value to the [BrainDevice.setCustomState](./BrainDevice.html#setCustomState). For example:

```javascript
// Set "My Custom State" to a random number between 1 and 10
await systemDevice.setCustomState("My Custom State", Math.ceil(Math.random() * 10));
```

See the following complete example for setting a custom state:
* [examples/set-custom-state.js](https://github.com/kramer-control/brain-client/blob/master/examples/set-custom-state.js)

## Related Tutorial

Once you've mastered working with states, we recommend reading about Sending Commands:

* Related Tutorial: [Sending Commands](./tutorial-400-SendingCommands.html)