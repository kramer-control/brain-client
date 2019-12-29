# Connecting to the Brain

In each example below, we assume you have imported the `BrainClient` class/namespace via some method. We also assume you are able to execute `await` functions (i.e. you're running inside a function marked `async`.)

```javascript
const BrainClient = require('@kramer/brain-client');
async function main() {
	// whatever
}
main().catch(e => console.error(e)).finally(x => process.exit(x));
```

## Basic Connection

This is the simplest method of connecting - just use the `connectToBrain` method and give it the IP, then `await` the result. The method will return once the Brain is fully connected and has authorized the connection.

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

## Cached Connection

You can take advantage of automatic built-in caching of the connections to reuse clients. To access or create a cached client, use the `BrainClient.getBrainClient(ip, opts)` static method.

```javascript
const bc = BrainClient.getBrainClient("127.0.0.1:8080");
``` 

You can provide `opts` as the second arg, and they will only be used for new clients if the IP is not already cached. `opts` are the same as the `BrainClient` constructor opts, with one exception - you can also pass a `pin` opt, which functions the same as shown above for the `connectToBrain` method, e.g. either a `string` preconfigured PIN or a `function` for a callback.

Note that successful connections are automatically cached, even if you do not use `getBrainClient` to create the connection. E.g. if you use the `connectToBrain` method shown earlier and it successfully connects the socket, it will automatically cache it's instance so if you use `getBrainClient` later, it will return the cached instance.

Note that the `BrainClient` also automatically removes itself from the cache when the socket disconnects (and re-adds itself automatically if reconnection is successful.) This is to prevent memory leaks and dead references.

## React Usage

We recommend using the [BrainClient.getBrainClient](../docs/BrainClient.html#.getBrainClient) method in React or other functional-based UI environments, since it is guaranteed to return a [BrainClient](docs/BrainClient.html#BrainClient) instance immediately, and always returns the same `BrainClient` for the same IP. 

We also provide a convenient collection of [React Hooks](../docs/BrainClient.ReactHooks.html) for using BrainClient from functional components in React.