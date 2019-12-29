const { BrainClient } = require('../dist/cjs');

async function main() {
	// Quiet chatty logging
	BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);

	// Create the client
	const bc = new BrainClient();

	// Wait for brain connection
	await bc.connectToBrain(BrainClient.DEFAULT_BRAIN_IP);

	// Get a ref to the sys device for getting/setting states
	const sys = await bc.getSystemDevice();

	// Get hash of custom states - NB: This requires at least one custom state to be created in the KC Builder
	const states = await sys.getCustomStates();

	// Get first state ref
	const firstCustomState = Object.values(states)[0];

	// Pick a random number - this assumes no constraints set on custom state
	const randomNumber = Math.ceil(Math.random() * 65536);

	// Set the custom state and get a ref to the updated data
	const data = await sys.setCustomState(firstCustomState, randomNumber);

	// Print out new state
	console.dir(data, { depth: 99 })
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
