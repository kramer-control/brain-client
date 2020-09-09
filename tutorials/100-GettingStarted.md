# Getting Started

[BrainClient](./BrainClient.html) can be used on the server or in a browser. The primary requirement is the server/client on which you run [BrainClient](./BrainClient.html) must have direct network access to the Kramer Control Brain you want to control. How you do that is up to you - it could be over your local LAN, over a VPN, or even (but not recommended) via NAT/port-forwarding to a static global IP. The network specifics are left up to you. You simply provide the [BrainClient](./BrainClient.html) with the IP (and optional port) to communicate with.

## Installation

```bash
npm install --save @kramerav/brain-client
```

## Basic Usage

```javascript
const BrainClient = require('@kramerav/brain-client');
// If using <script> tag: const { BrainClient } = window.KramerBrainClient;
// ES6 imports work too:  import { BrainClient } from '@kramerav/brain-client';

async function main() {
	const bc = new BrainClient();
	const brainInfo = await bc.connectToBrain("127.0.0.1:8080");
	console.dir(brainInfo, { depth: 99 })
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
```

## Next Steps

Now that you have the module installed, you should connect to your Brain device:

* See the [Connecting to the Brain Tutorial](./tutorial-200-connecting.html)

## Related API Docs

Jump right into the API:

* Core API: [BrainClient](./BrainClient.html) - Core class, everything starts here
* Device API: [BrainDevice](./BrainDevice.html) - Everything for working with devices
* See [BrainClient.EVENTS](./BrainClient.html#.EVENTS) for events emitted by `BrainClient`.
* See [BrainClient.CONNECTION](BrainClient.html#.CONNECTION) for connection states of the `BrainClient`

## Frameworks

Tutorials on using with popular frameworks:

* [Using with React](./tutorial-500-ReactUsage.html)
* [Using with Angular](./tutorial-600-AngularUsage.html)
* [Using with Vanilla JS](./tutorial-700-VanillaJSUsage.html)

 
## Important Notes

### Async/Await
`BrainClient` is async/await compliant, and uses `Promise`s and `async`/`await` extensively internally to streamline the API and make the communication/control of the Brain as simple and clean as possible.

### Environment-agnostic
`BrainClient` is environment-agnostic - you can use it directly in `Node`, you can bundle it with `React`, `Vue`, or `Angular` application, or use it in a vanilla Javascript application with no bundling. The options are limited only by your imagination.

### Network Access Required

As noted above, the device that runs `BrainClient` must have direct network access to the Brain for control. This usually is done via your local LAN (WiFi/ethernet), but you could use a VPN or other creative network solutions to access the Brain as well. As a rule, if you can open the IP of the brain (with port :8000) in your web browser on the device, then your `BrainClient` will work on that device.

