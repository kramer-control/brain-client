# Vanilla JS Usage

You can use BrainClient from Node or even directly from the browser without any transpilation or framework required.

When using via the `<script>` tag in your browser, the classes provided by this package are attached to the `window.KramerBrainClient` object. For example, to get the `BrainClient` class, use `window.KramerBrainClient.BrainClient`.

The BrainClient is available via the UNPKG CDN and Netlify CDN for direct importing without any transpilation or build tools on your end:

```html
<script src="https://unpkg.com/@kramer/brain-client@1.0.0/dist/es5/kramer-brain-client.min.js"></script> <!-- version 1.0.0 (current version), 21KB -->
<script src='https://kramer-brain-client.netlify.com/dist/es5/kramer-brain-client.min.js'></script> <!-- always latest version, 21KB -->
```

For a complete Vanilla JS example, see [examples/vanilla-js-browser](https://github.com/kramer-control/brain-client/blob/master/examples/vanilla-js-browser/index.html). Here is a simplified example:

```html
<!-- kramer-brain-client attaches to window as KramerBrainClient and all classes are available in that object -->
<script src="https://unpkg.com/@kramer/brain-client@1.0.0/dist/es5/kramer-brain-client.min.js"></script>

<!-- We'll use javascript to write to this element -->
<h1 id="seconds"></h1>

<script>
	// Wait for the script and page to load
	document.addEventListener("DOMContentLoaded", () => {
		const { BrainClient, BrainDevice } = window.KramerBrainClient,
			// Our display element above
			displayElm = document.querySelector('#seconds');

		// Get a BrainClient instance for the brain at this IP
		BrainClient.getBrainClient('127.0.0.1:8000')
			// Grab the system device and start listening for changes
			.getSystemDevice()
			.then(device => {

				// Listen for changes to the System device
				// and update the UI when changes received
				device.on(BrainDevice.STATE_CHANGED, ({ id, normalizedValue }) => {
			
					// All state changes receved here, so only show the state we care about
					if(id === 'SECOND_STATE')
						displayElm.innerHTML = normalizedValue;
				});
			});
	});
</script>
```