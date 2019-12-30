# brain-js-client

Stand-alone javascript client for [Kramer Control's Brains](https://www.kramerav.com/us/products/control-and-management/control-processors?groupId=3&subgroupId=284), also known as "processors" or "room controllers".

## API Documentation

Latest API documentation is available at **[https://kramer-brain-client.netlify.com/](https://kramer-brain-client.netlify.com/)**

## Getting Started

* See the [Getting Started Tutorial](https://kramer-brain-client.netlify.com/tutorial-100-GettingStarted.html)
* API: [BrainClient](https://kramer-brain-client.netlify.com/BrainClient.html) - Core class, everything starts here
* API: [BrainDevice](https://kramer-brain-client.netlify.com/BrainDevice.html) - Everything for working with devices
* [Using with React](https://kramer-brain-client.netlify.com/tutorial-500-ReactUsage.html)
* [Using with Angular](https://kramer-brain-client.netlify.com/tutorial-600-AngularUsage.html)
* [Using with Vanilla JS](https://kramer-brain-client.netlify.com/tutorial-700-VanillaJSUsage.html)

## Install via NPM

```shell
$ npm install --save @kramer/brain-client
```

```javascript
// ES6, Modules, React, Angular
import { BrainClient } from '@kramer/brain-client';

// For Node 8+
const { BrainClient } = require('@kramer/brain-client');

// Vanilla Javascript via the <script> tag
const { BrainClient } = window.KramerBrainClient;

```

## CDN Usage
The IIFE build is also available on unpkg (all versions) or Netlify (only the latest):

```html
<script src="https://unpkg.com/@kramer/brain-client@1.0.0/dist/kramer-brain-client.min.js"></script> <!-- version 1.0.0 (current version), 21KB -->
<script src='https://kramer-brain-client.netlify.com/dist/es5/kramer-brain-client.min.js'></script> <!-- always latest version, 21KB -->
```

## Example Connection

```javascript
const BrainClient = require('@kramer/brain-client');
// If using <script> tag: const { BrainClient } = window.KramerBrainClient;
// ES6 imports work too:  import { BrainClient } from '@kramer/brain-client';

async function main() {
	const bc = new BrainClient();
	const brainInfo = await bc.connectToBrain("127.0.0.1:8080");
	console.dir(brainInfo, { depth: 99 })
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
```

Note: The above code expects you have a brain running locally. Change the IP as needed.

## More Examples

See all examples on GitHub at [https://github.com/kramer-control/brain-client/tree/master/examples](https://github.com/kramer-control/brain-client/tree/master/examples):

* [examples/connect.js](https://github.com/kramer-control/brain-client/blob/master/examples/connect.js) - Basic connection, similar to the usage shown above
* [examples/command-info.js](https://github.com/kramer-control/brain-client/blob/master/examples/command-info.js) - Illustrates getting information about commands on a specific device
* [examples/set-custom-state.js](https://github.com/kramer-control/brain-client/blob/master/examples/set-custom-state.js) - Set the first custom state it finds to a random number
* [examples/send-command.js](https://github.com/kramer-control/brain-client/blob/master/examples/send-command.js) - Send the `System Device`'s `SET_SYSTEM_USE` command to set the system use to the opposite of what it currently is as retrieved by the `QUERY_SYSTEM_USE` command on that device
* [examples/react-system-seconds](https://github.com/kramer-control/brain-client/tree/master/examples/react-system-seconds) - React usage example, shows the current time on the Brain, updated automatically every second, illustrates using `ReactHooks` package
* [examples/vanilla-js-browser/index.html](https://github.com/kramer-control/brain-client/blob/master/examples/vanilla-js-browser/index.html) - Shows an example of using `BrainClient` from a browser with no transpiling or 3rd-party libraries, just vanilla javascript

## About Brain Client

### Async/Await
`BrainClient` is async/await compliant, and uses `Promise`s and `async`/`await` extensively internally to streamline the API and make the communication/control of the Brain as simple and clean as possible.

### Environment-agnostic
`BrainClient` is environment-agnostic - you can use it directly in `Node`, you can bundle it with `React`, `Vue`, or `Angular` application, or use it in a vanilla Javascript application with no bundling. The options are limited only by your imagination.

### Network Access Required
As noted above, the device that runs `BrainClient` must have direct network access to the Brain for control. This usually is done via your local LAN (WiFi/ethernet), but you could use a VPN or other creative network solutions to access the Brain as well. As a rule, if you can open the IP of the brain (with port :8000) in your web browser on the device, then your `BrainClient` will work on that device.

## Building

To develop locally:

* Clone the repo, `cd` into the repo
* `npm install`
* `npm run build`

The build command (`npm run build`) will build the CommonJS files for Node and the IIFE bundles for the browser. It also builds the docs into `docs/` and run the test suite.

## Testing

To *actually* run the tests, the following requirements must be met:
* You must have a brain running locally (127.0.0.1:8000) **or** you can set the env var `TEST_BRAIN_IP` before running `npm test` to the IP of a provisioned brain
* The brain you use be provisioned and the space you have provisioned must have the following attributes:
* ... Express Mode must be enabled
* ... Blank PIN / no Express PIN code required 
* ... System Device must have at least one custom state with no constraints (one of the tests WILL fail if it cannot find at least one custom state for testing the `setCustomState` method)

TODO(testing): Detect if the brain used is running on SL hardware. If running on SL hardware, we can take advantage of the `/api/v1/clear-logs` route, which shells out to the watchdog, which in turn executes `service brain restart`, which will then cause the actual Brain software to disconnect from our `BrainClient`. If we can force this disconnection, this will allow us to test code branches for things like auto-reconnect and connection failure branches.

TODO(testing): Add/detect/test if there is a second non-system device on the test space, and if so, run thru branches that test the `!isSystemDevice()` in the `BrainDevice` class.