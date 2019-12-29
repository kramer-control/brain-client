import React from 'react';
import './App.css';

import { BrainClient, ReactHooks } from '@kramer/brain-client';

// Destructure ReactHooks for ease of referencing later in the example
const { useDevice, useDeviceState, useConnectionStatus } = ReactHooks;

function App() {
	const ipAddress = "127.0.0.1:8000";

	// Setting to 'auto' will check querystring 
	// for 'brainIp=<whatever>', and if not found,
	// will use the origin host/port as brain IP
	// const ipAddress = { auto: true };

	// Quiet chatty logging
	BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);

	const bc      = BrainClient.getBrainClient(ipAddress);
	const device  = useDevice(bc, "System Device");
	const status  = useConnectionStatus(bc);

	window.bc= bc;

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