/**
 * The `BrainClient.EVENTS` object holds keys that function as the event names
 * for various events emitted by the {@link BrainClient}. 
 * 
 * It's important to note
 * that {@link BrainDevice} also emits it's own events when states change. See: {@link BrainDevice} and `STATE_CHANGED` property.
 * 
 * Use these properties below in conjunction with {@link BrainClient#on} to attach listeners.
 * 
 * **Example usage:**
 * ```javascript
 * const bc = new BrainClient();
 * bc.on(BrainClient.EVENTS.STATUS_MESSAGE, data => console.log(data));
 * ```
 * @typedef BrainClient.EVENTS 
 * @property BrainClient.EVENTS.WS_CONNECTED    {string} Emitted when the Brain's WebSocket connects
 * @property BrainClient.EVENTS.WS_CLOSED       {string} Emitted when the Brain's WebSocket is closed
 * @property BrainClient.EVENTS.RECONNECTING    {string} Emitted when reconnecting timer is started, indicating the client will soon attempt to automatically reconnect
 * @property BrainClient.EVENTS.PIN_REQUIRED    {string} Emitted when the {@link BrainClient} is informed by the Brain that a PIN is required. The {@link BrainClient} will have already tried the default "empty" PIN (`""`) when this event is emitted. Use {@link BrainClient#submitPin} to submit the PIN to the Brain. You can then `await` {@link BrainClient#isAuthorized} (or listen for the `AUTHORIZED` event). An alternative to listening for the `PIN_REQUIRED` event is to `await` {@link BrainClient#isLoginNeeded} and then call {@link BrainClient#submitPin} if `isLoginNeeded` resolves to `true`.
 * @property BrainClient.EVENTS.EXPRESS_MODE    {string} Emitted when the client receives the response from the Brain indicating if express mode is enabled or not. The payload provided an object with a single boolean key, `enabled`. A value of `true` for `enabled` indicates that express mode IS enabled, and `false`, of course, indicating that express mode is disabled on the provisioned space.
 * @property BrainClient.EVENTS.AUTHORIZED      {string} Emitted when {@link BrainClient} is completely authorized and ready to be used.
 * @property BrainClient.EVENTS.CONNECTION_STATUS_CHANGED {string} Emitted when the Brain's connection status changed. The current connection state will be included in the event payload as an object with a single key `status`, like: `{ status: "" }`. The current connection status can retrieved from the client via {@link BrainClient#getConnectionStatus}. See {@link BrainClient.CONNECTION} for documentation on the connection states possible - these are the values that will be used for the `status` field of the event payload mentioned previously.
 * @property BrainClient.EVENTS.HANDSET_MESSAGE  {string} Emitted when any of the `handset_*` events are received from the Brain, for example, in response to {@link BrainClient#queryHandsets} or {@link BrainClient#getHandsetLayout}.
 * @property BrainClient.EVENTS.BRAIN_EVENT     {string} Emitted when an event is received by the brain that is NOT handled internally by the {@link BrainClient}. This is ONLY emitted for events NOT covered elsewhere in this list.
 * @property BrainClient.EVENTS.WS_MESSAGE      {string} Emitted when a new WebSocket message is received from the brain with the contents of the message as the payload. Note that this event is emitted for EVERY WebSocket message containing the raw message, making this a good generic event if you want to handle ALL interaction with the brain directly.
 * @property BrainClient.EVENTS.STATUS_MESSAGE  {string} Emitted when a new status message is received from the Brain
 * @property BrainClient.EVENTS.COLOR_MESSAGE   {string} Emitted when a Brain color message is received
 */
export default {
	WS_CONNECTED    : 'WS_CONNECTED',
	WS_CLOSED       : 'WS_CLOSED',
	BRAIN_EVENT     : 'BRAIN_EVENT',
	EXPRESS_MODE    : 'EXPRESS_MODE',
	PIN_REQUIRED    : 'PIN_REQUIRED',
	AUTHORIZED      : 'AUTHORIZED',
	STATUS_MESSAGE  : 'STATUS_MESSAGE',
	WS_MESSAGE      : 'WS_MESSAGE',
	COLOR_MESSAGE   : 'COLOR_MESSAGE',
	HANDSET_MESSAGE : 'HANDSET_MESSAGE',
	CONNECTION_STATUS_CHANGED : 'CONNECTION_STATUS_CHANGED',
}