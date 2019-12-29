const { BrainClient } = require('../dist/cjs');

async function main() {
	// Quiet chatty logging
	BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);

	const bc = new BrainClient();

	await bc.connectToBrain(BrainClient.DEFAULT_BRAIN_IP);

	const brainInfo = await bc.brainInfo();

	console.dir(brainInfo, { depth: 99 })
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
