
import BrainClient from './BrainClient';
import BrainDevice from './BrainDevice';
import Logger from './utils/Logger';
import defer from './utils/defer';
import ReactHooks from './ReactHooks';

// console.log(`[debug vanilla error] `, BrainClient);

// BrainClient.Logger = Logger;
// BrainClient.defer = defer;
// BrainClient.BrainDevice = BrainDevice;

// module.exports = BrainClient;


export {
	BrainClient,
	BrainDevice,
	ReactHooks,
	Logger
};
