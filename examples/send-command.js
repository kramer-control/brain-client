const { BrainClient } = require('../dist/cjs');

async function main() {
	// Quiet chatty logging
	BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);

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
	const expectedResult = currentState === 'OFF' ? 'ON' : 'OFF';

	// Execute the SET_SYSTEM_USE command which accepts the 'SYSTEM_STATE' as a parameter
	const { SYSTEM_STATE: actualResult } = await sys.sendCommand('SET_SYSTEM_USE', {
		SYSTEM_STATE: expectedResult
	});

	// Confirm the change by printing to the console
	console.dir({ currentState, expectedResult, actualResult, _matched_: expectedResult === actualResult });
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
