# Device States

Devices provide "States" which represent values on a device. For example, a mixer may provide a "VOLUME" state, and the System Device provides a "SECOND_STATE". 

States are defined by the device driver for all devices except the System Device, which supports Custom States.

States are "live" which mean they can and will be changed by the Brain in response to feedback from the relevant attached device. To receive notification of when a state changes, see "Watching States", below.

## Overview

For a general overview of Devices and information on getting a device instance, see the following related tutorial:

> Related Tutorial: [Working with Devices](./tutorial-201-Devices.html)


## TODO

TODO: Finish writing this tutorial