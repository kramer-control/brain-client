/**
 * The `BrainClient.CONNECTION_*` properties define the various connection states that the {@link BrainClient}
 * can be in. To get the current connection state, see {@link BrainClient#getConnectionStatus}. You cannot directly
 * set the Brain Client's `connectionStatus`.
 * 
 * **Example usage:**
 * ```javascript
 * const bc = new BrainClient();
 * const state = bc.getConnectionStatus();
 * ```
 * 
 * @typedef BrainClient.CONNECTION
 * @property BrainClient.CONNECTION_CONNECTING    1. Client starts in this state and goes to this state when it's reconnecting
 * @property BrainClient.CONNECTION_FAILURE       2. Client encountered a failure in communication, either on initial connection or lost connection to the Brain
 * @property BrainClient.CONNECTION_DISCONNECTED  3. Client has become disconnected from the Brain, either via {@link BrainClient#disconnect} or due to network issues
 * @property BrainClient.CONNECTION_RECONNECTING  4. Client has become disconnected and now is waiting to try to reconnect. The time the client waits to reconnect can be set by passing the `reconnectWaitTime` option to the {@link BrainClient}'s constructor
 * @property BrainClient.CONNECTION_AUTHORIZING   5. Client has connected to the Brain and is attempting to authorize the connection. **NOTE**: The client will attempt to authorize using an empty passcode first, and that may succeeed. If that succeeds, the client will go to `BrainClient.CONNECTION_ACTIVE`. However, if an empty passcode does not succeed, the client will transition to `CONNECTION_UNAUTHORIZED` and the client will emit the event `BrainClient.EVENTS.PIN_REQUIRED`. In that case, you will need to supply the passcode to the client to use using {@link BrainClient#submitPin}. Once it succeeds, the client will transition to `CONNECTION_ACTIVE`. If the pin submitted fails, the `BrainClient.EVENTS.PIN_REQUIRED` event will be emitted again, but the connection status will not change.
 * @property BrainClient.CONNECTION_UNAUTHORIZED  6. If the client's default empty passcode attempt fails or if the PIN you submit via `submitPin()` fails, the client will transition to `CONNECTION_UNAUTHORIZED` until something else happens.
 * @property BrainClient.CONNECTION_ACTIVE        7. Once the client is online, authorized, and ready to use, it will transition to this state.
 * @property BrainClient.CONNECTION_SYNCHRONIZING 8. When you "Publish" a space via the KC Builder or make changes via the KC Manager, or the Brain synchronizes for some other reason, the client will enter this `CONNECTION_SYNCHRONIZING` state
 */

// Note: This class exists purely for documentation purposes, it is not used internally as a seprate class.

export default {
	CONNECTION_CONNECTING    : 'Connecting ...',
	CONNECTION_FAILURE       : 'Connection Failure',
	CONNECTION_DISCONNECTED  : 'Brain disconnected',
	CONNECTION_RECONNECTING  : 'Reconnecting to brain ...',
	CONNECTION_AUTHORIZING   : 'Authorizing ...',
	CONNECTION_UNAUTHORIZED  : 'Unauthorized Connection',
	CONNECTION_ACTIVE        : 'Connection Active',
	CONNECTION_SYNCHRONIZING : 'Synchronizing ...',
}