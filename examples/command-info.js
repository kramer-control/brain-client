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

	// Get the specific command
	const command = await sys.getCommand('SET_SYSTEM_USE');

	// Output some info
	console.dir(command, { depth: 99 })
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
