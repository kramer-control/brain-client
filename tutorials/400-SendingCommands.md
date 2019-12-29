# Sending Commands

Commands are defined in the device drivers for devices. Commands are automatically enumerated when connecting to the Brain. To execute a command, you first have to get a `BrainDevice` reference then call the `sendCommand` method on that device. For detailed information on sending commands, continue reading below.

## Overview

For a general overview of Devices and information on getting a device instance, see the following related tutorial:

> Related Tutorial: [Working with Devices](./tutorial-201-Devices.html)

## Find out Commands a Device Supports

After you get the reference, you can execute the `getCommands` method, which will return a hash of command IDs and associated command info objects. The command info object will look like:

```javascript
{
	id: "SET_SYSTEM_USE",
	name: "Set System Use",
	params: { /* ... */ },
	states: { /* ... */ },
	category: { /* ... */ },
	capability: { /* ... */ },
}
```

You can either pass the command info argument to the `sendCommand` method or just the id or name as the first arg.

The `params` key provides info for you as the programmer to know what params the command expects. See more discussion on this key below. 

The `states`, `category`, and `capability` keys are internal keys that provide internal config information.

## Sending a Command

To send a command, use the `sendCommand` method on the `BrainDevice` reference you retrieved earlier. This method accepts two positional parameters:

* Command `Name` (name or command reference)
* Command `Paramters` (key/value hash)

Example:
```javascript
device.sendCommand('SEND_SYSTEM_USE', {
	SYSTEM_STATE: 'ON'
});
```

The `Name` paramter (the first param) can be either the string of the command ID or a reference to the command. You can get a reference to command using the `getCommands()` above, and the result from that method is keyed by command ID.

The `Paramters` paramter (the second param) is expected to be a key/value object, with the key being the name of the parameter and the value is the value to pass for that param.

### Parmaters Supported by the Command

To discover the values supported by a given command, examine the command reference you get from the `getCommands()` method and check out the `params` key.

You'll see a `params` key with an object that looks like:

```javascript
{
	POWER: {
		type: 'boolean',
		constraints: { /*...*/ },
	},
	SYSTEM: {
		state: { /*...*/ },
	}
}
```

This object shows two different types of params:
* Dynamic (state-based)
* Static (not state-based)

Dynamic (state-based) params change an associated state, and that state provides type hint info. Whereas static (non state-based) params do not change any states and contain all the type hint info in themselves as shown above.

See the associated [examples/command-info.js](https://github.com/kramer-control/brain-client/blob/master/examples/command-info.js) for a complete example showing how to get the `params` from the command.

## Complete Example

See [examples/send-command.js](https://github.com/kramer-control/brain-client/blob/master/examples/send-command.js) to illustrate sending a command, which basically is the following

```javascript
// Create the client
const bc = new BrainClient();

// Wait for the brain to accept the connection
await bc.connectToBrain(BrainClient.DEFAULT_BRAIN_IP);

// Grab a reference to the device to actually execute the command
const sys = await bc.getSystemDevice();

// Get the current value of the 'SYSTEM_USE' state by executing
// the 'QUERY_SYSTEM_USE' command. Because the system driver 
// also encodes a reference to the 'SYSTEM_STATE' state,
// the sendCommand() method automatically returns the new value
// of the state after executing the command 
const { SYSTEM_STATE: currentState } = await sys.sendCommand('QUERY_SYSTEM_USE');

// Flip the boolean value of the system state to the other side
const newStateParam = currentState === 'OFF' ? 'ON' : 'OFF';

// Execute the SET_SYSTEM_USE command which accepts the 'SYSTEM_STATE' as a parameter
const { SYSTEM_STATE } = await sys.sendCommand('SET_SYSTEM_USE', {
	SYSTEM_STATE: newStateParam
});

// Confirm the change by printing to the console
console.dir({ currentState, newStateParam, SYSTEM_STATE, expectedResult: newStateParam === SYSTEM_STATE });
```