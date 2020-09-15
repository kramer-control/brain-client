# Connecting to the Brain

A number of examples for connecting to the Brain are provided below.

In each of the below examples, we assume you have imported the `BrainClient` class/namespace via some method. We also assume you are able to execute `await` functions (i.e. you're running inside a function marked `async`.)

```javascript
const { BrainClient } = require('@kramerav/brain-client');
// If using <script> tag: const { BrainClient } = window.KramerBrainClient;
// ES6 imports work too:  import { BrainClient } from '@kramerav/brain-client';
async function main() {
	// whatever
}
main().catch(e => console.error(e)).finally(x => process.exit(x));
```

## Basic Connection

Before you can call any of the `connectToBrain` examples below, you must first create a client object using the [BrainClient constructor](./BrainClient.html#BrainClient). For example:

```javascript
const bc = new BrainClient();
```

See the API docs for optional parameters for the constructor:

* [BrainClient constructor API Docs](./BrainClient.html#BrainClient)

## `connectToBrain` - Direct Connection

This is the simplest method of connecting - just use the [connectToBrain](./BrainClient.html#connectToBrain) method and give it the IP, then `await` the result. The method will return once the Brain is fully connected and has authorized the connection.

```javascript
await bc.connectToBrain("127.0.0.1:8080");
```

If you need to provide a PIN, or if you're not sure if the brain needs a PIN, you can either pass a pre-configured PIN as a string, or use a callback to prompt the user for a PIN.

```javascript
// Preconfigured PIN
await bc.connectToBrain("127.0.0.1:8080", "123456");

// Pass a callback - return the PIN as a string.
await bc.connectToBrain("127.0.0.1:8080", () => {
	return window.prompt("Please enter a PIN for this Brain:", "")
});
```

Note that the callback is only executed when the Brain informs the client that it must provide a non-empty string as a PIN. If the Brain accepts the default empty-string PIN, the callback you provide will not be executed at all.

## `getBrainClient` - Cached Connection

You can take advantage of automatic built-in caching of the connections to reuse clients. To access or create a cached client, use the [BrainClient.getBrainClient(ipAddress, opts)](./BrainClient.html#.getBrainClient) static method.

```javascript
const bc = BrainClient.getBrainClient("127.0.0.1:8080");
``` 

You can provide `opts` as the second arg, and they will only be used for new clients if the IP is not already cached. `opts` are the same as the `BrainClient` constructor opts, with one exception - you can also pass a `pin` opt, which functions the same as shown above for the `connectToBrain` method, e.g. either a `string` preconfigured PIN or a `function` for a callback.

Note that successful connections are automatically cached, even if you do not use `getBrainClient` to create the connection. E.g. if you use the `connectToBrain` method shown earlier and it successfully connects the socket, it will automatically cache it's instance so if you use `getBrainClient` later, it will return the cached instance.

## Next Tutorial

Once you've decided how to connect to the Brain, we recommend reading the Devices tutorial and then read about sending commands and working with device states:

* Next Tutorial: [Working With Devices](./tutorial-201-devices.html)
* [Sending Commands](./tutorial-400-SendingCommands.html)
* [Device States](./tutorial-300-States.html)

## React Usage

We recommend using the [BrainClient.getBrainClient](./BrainClient.html#.getBrainClient) method in React or other functional-based UI environments, since it is guaranteed to return a [BrainClient](./BrainClient.html#BrainClient) instance immediately, and always returns the same `BrainClient` for the same IP. 

We also provide a convenient collection of [React Hooks](./BrainClient.ReactHooks.html) for using BrainClient from functional components in React.

* Related tutorial: [Using With React](./tutorial-500-ReactUsage.html)

## Angular Usage

We recommend using the [BrainClient.asObservable](./BrainClient.html#asObservable) method when using with Angular for ease of interopability with RxJS. You should use [BrainClient.getBrainClient](./BrainClient.html#.getBrainClient) to get the reference to the Brain Client. 

You can wrap the `getBrainClient` call in an `@Injectable` Angular service for clean integration into your Angular app. And a sample `@Injectable` service is provided in the following related tutorial:

* Related tutorial: [Using With Angular](./tutorial-600-AngularUsage.html)

## Vanilla JS Usage

You can import this library via a `<script>` tag from one of the following CDNs:

```html
<script src="https://unpkg.com/@kramerav/brain-client@1.1.1/dist/es5/kramer-brain-client.min.js"></script> <!-- version 1.1.1 (current version) -->
<script src='https://kramer-brain-client.netlify.com/dist/es5/kramer-brain-client.min.js'></script> <!-- always latest version -->
```

When using via the `<script>` tag in your browser, the classes provided by this package are attached to the `window.KramerBrainClient` object. For example, to get the `BrainClient` class, use `window.KramerBrainClient.BrainClient`.

* Related tutorial: [Using With Vanilla JS](./tutorial-700-VanillaJSUsage.html)
