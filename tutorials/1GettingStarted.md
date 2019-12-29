# Getting Started

`BrainClient` can be used on the server or in a browser. The primary requirement is the server/client on which you run `BrainClient` must have direct network access to the Kramer Control Brain you want to control. How you do that is up to you - it could be over your local LAN, over a VPN, or even (but not recommended) via NAT/port-forwarding to a static global IP. The network specifics are left up to you. You simply provide the `BrainClient` with the IP (and optional port) to communicate with.

## Installation

`npm install --save @kramer/brain-client`

## Basic Usage

```javascript
const BrainClient = require('@kramer/brain-client');

async function main() {
	const bc = new BrainClient();
	const brainInfo = await bc.connectToBrain("127.0.0.1:8080");
	console.dir(brainInfo, { depth: 99 })
}

main().catch(e => console.error(e)).finally(x => process.exit(x));
```

## Important Notes

### Async/Await
`BrainClient` is async/await compliant, and uses `Promise`s and `async`/`await` extensively internally to streamline the API and make the communication/control of the Brain as simple and clean as possible.

### Environment-agnostic
`BrainClient` is environment-agnostic - you can use it directly in `Node`, you can bundle it with `React`, `Vue`, or `Angular` application, or use it in a vanilla Javascript application with no bundling. The options are limited only by your imagination.

### Network Access Required

As noted above, the device that runs `BrainClient` must have direct network access to the Brain for control. This usually is done via your local LAN (WiFi/ethernet), but you could use a VPN or other creative network solutions to access the Brain as well. As a rule, if you can open the IP of the brain (with port :8000) in your web browser on the device, then your `BrainClient` will work on that device.

