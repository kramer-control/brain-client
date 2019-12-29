import React from 'react';
import './App.css';

import { BrainClient, ReactHooks } from '@kramer/brain-client';

// Destructure ReactHooks for ease of referencing later in the example
const { useDevice, useDeviceState, useConnectionStatus } = ReactHooks;

function App() {
	// See notes on the "auto" mode for BrainClient.getBrainClient for details on how this works
	// Link: https://kramer-brain-client.netlify.com/brainclient#.getBrainClient
	const ipAddress = { auto: true, default: "127.0.0.1:8000" };

	// Quiet chatty logging
	BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);

	// Grab our client reference
	const bc      = BrainClient.getBrainClient(ipAddress);

	// Ggrab a state variable containing a BrainDevice instance for the "System" device
	const device  = useDevice(bc, "System Device");
	// Grab a state variable containing the live connection status
	// See: https://kramer-brain-client.netlify.com/brainclient#.CONNECTION
	// for details on the possible connection states
	const status  = useConnectionStatus(bc);

	const WatchState = ({state}) => {
		const sv = useDeviceState(device, state);
		// We're using just the hour/min/sec states, so pad with a zero as needed
		const num = parseFloat(sv ? sv.normalizedValue : 0);
		return (<>{isNaN(num) ? "00" : ((num < 10 ? "0" : "") + num)}</>)
	};

	return (
		<div className="App">
			<header className="App-header">
				<h1>
						<WatchState state="HOUR_STATE"/>:
						<WatchState state="MINUTE_STATE"/>:
						<WatchState state="SECOND_STATE"/>
				</h1>
				<p>
					<i>{status}</i>
				</p>
			</header>
		</div>
	);
}

export default App;