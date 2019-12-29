# Devices

[BrainDevice](../docs/BrainDevice.html) instances ("Devices") represent physical devices connected to the Brain.

Devices are created/configured/setup in the [Kramer Control Builder](https://kramercontrol.com/builder/) and assigned to your space and gateways within that space in the Builder.

Devices may be attached to the Brain via a number of methods - IR, GPIO, RS232, TCP (HTTP, Raw, etc), and more. However, the Brain abstracts away the details of communicating with each of the devices by handling the low-level communication within the Brain itself and by wrapping all communication with each device with a "Device Driver". This Driver describes the states and commands available on each device.

## System Devices

Each Brain has at minimum one device - a "System Device". System Devices are "virtual devices" provided by the Brain. The System Device provides core services, such as time, date, weather, and custom states. 

### Custom States
Custom States are states that are defined by you, the designer of the space, in the [Kramer Control Builder](https://kramercontrol.com/builder/). Custom States are the only states than can be set directly via the Brain Client. You cannot define custom states via the Brain Client.

> To set a custom state, see [BrainDevice.setCustomState](./BrainDevice.html#setCustomState).

# Get a Device Reference

To send a command, watch states, or do anything with a device, you have to use a `BrainDevice` device instance. Grab your handy `BrainClient` reference and call the `getDevices` method (or use the system device by executing `getSystemDevice` on the client.

Example:
```javascript
// Create the client
const bc = new BrainClient();

// Wait for the brain to accept the connection
await bc.connectToBrain(BrainClient.DEFAULT_BRAIN_IP);

// Grab a reference to the device to actually execute the command
const sys = await bc.getSystemDevice();

// Get all devices
const devices = await bc.getDevices();

// In a React app, you could do:
const device = BrainClient.ReactHooks.useDevice("System Device");
```

> For more information on using with React, see: [Using with React](./tutorial-500-ReactUsage.html)

# Using Devices

All devices (including the System Device) have three primary functions for you as a software engineer:

* Device Properties
* Send Commands
* Watch States

## Properties

Properties available on each `BrainDevice` are described in the API docs under the constructor.

> See: [BrainDevice()](./BrainDevice.html#BrainDevice) under "Properties"

## Sending Commands

Working with Device Commands is described in detail in the following related tutorial:

> See: [Basics/Sending Commands](./tutorial-400-SendingCommands.html)

## Watch States

Working with and watching Device States is described in greater detail in the following related tutorial:

> See: [Basics/States](./tutorial-300-States.html)
