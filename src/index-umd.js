
import BrainClient from './BrainClient';
import BrainDevice from './BrainDevice';
import Logger from './utils/Logger';
import defer from './utils/defer';
import ReactHooks from './ReactHooks';

BrainClient.Logger = Logger;
BrainClient.defer = defer;
BrainClient.BrainDevice = BrainDevice;

export {
	BrainClient,
	BrainDevice,
	ReactHooks,
	Logger
};
