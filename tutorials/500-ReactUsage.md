# React Usage

Integrating with React is simplified thanks to a convenient prepacked collection of [Hooks](https://reactjs.org/docs/hooks-intro.html) that we provide to do several common tasks with the Brain. See our [ReactHooks class documentation](../docs/BrainClient.ReactHooks.html) for API docs on the hooks we provide.

Note: To use React Hooks, you will need to be using React version >=16.8 in your project.

`BrainClient` has a peer dependancy on React, which means you must ensure React is installed in your project, we do not install it automatically for you. In most projects, this is not something you would even have to worry about, as it is probably already installed by the time you even consider using `BrainClient`.

## Getting a Client Handle

We recommend using the [BrainClient.getBrainClient](../docs/BrainClient.html#.getBrainClient) method to get the [BrainClient](docs/BrainClient.html#BrainClient) handle, since it is guaranteed to return a [BrainClient](docs/BrainClient.html#BrainClient) instance immediately, and always returns the same `BrainClient` for the same IP. 

## Complete Example

For contrast, a vanilla JS example is included in [examples/vanilla-js-browser](https://github.com/kramer-control/brain-client/blob/master/examples/vanilla-js-browser/index.html). However, we're discussing React here, so read on.

For a complete working and tested example, see [examples/react-system-seconds](https://github.com/kramer-control/brain-client/blob/master/examples/react-system-seconds). 

Important notes about that example:

* It builds with relative URLs (see it's `package.json` and the `homepage` field)
* You can modify it (change the `ipAddress` variable in `App.js` to `{ auto: true }`) to support automatic brain discovery - either via the `brainIp` query param or from the origin host/IP
* This example can be built (`npm build`) and zipped into a bundle that can be uploaded to the Brain's *custom asset* storage hosted on the Brain (`SL-240`, `SL-240C`, and `SL-280` models currently), which can then be served by the Brain at `http://<brain ip>:8000/bundle/index.html`, suitable for embedding in a `Web URL` widget in the Builder or simple self-hosting of the UI bundle. 

Note: Make sure you build with relative URLs and `{ auto: true }` for the `ipAddress` if hosting in the `custom asset` storage on the Brain.

Other than those toolchain-related notes, the example itself is straight-forward. All the interesting Brain-related code is in the `App.js` file - go forth, read, and enjoy.

## Example Component

Here's a simple example functional React component that uses hooks to access the "Current Second" state on the Brain's system device:

```javascript
import React from 'react';
import ReactDOM from 'react-dom';
import BrainClient from '@kramer/brain-client';

function BrainSecondTicker({ ipAddress }) {
	// getBrainClient does not need a hook because it is not async and always
	// returns same client for the same ipAddress
	const bc          = BrainClient.getBrainClient(ipAddress);
	const sysDevice   = BrainClient.ReactHooks.useDevice(bc, 'System Device');
	const secondState = BrainClient.ReactHooks.useDeviceState(sysDevice, 'SECOND_STATE');

	// Render the state as JSX
	// This will automatically re-render whenever
	// the Brain sends a new value for the state
	return (<>
		Current Seconds on {ipAddress}: <b>{secondState.normalizedValue}</b>
	</>);
}

ReactDOM.render(<BrainSecondTicker ipAddress="127.0.0.1"/>, document.getElementById('root'));

```