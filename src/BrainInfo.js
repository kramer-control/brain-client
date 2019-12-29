
/**
 * `BrainInfo` describes the fields from the 'general' API route for the brain. 
 * 
 * You can access an instance of this class containing the following properties
 * by `await`ing {@link BrainClient#brainInfo}.
 * 
 * You'll never need to create this directly, this is simply included for documentation purposes.
 * 
 * @property {string} brain_id ID of the brain
 * @property {boolean} brain_provisioned True if the brain is provisioned to a space
 * @property {number} brain_reset_data_dir One of: 0 = off, 1 = on
 * @property {string} brain_state String describing the current brain state
 * @property {string} brain_status_color Color code for the status of the brain
 * @property {string} brain_status_reason String describing the reason for the state/color
 * @property {number} brain_sync_on_wan_restore One of: 0=off, 1=always sync on wan restore, 2=sync on wan restore only if timestamps of published space and cached data have changed
 * @property {string} brain_version version of the software running on the physical Brain unit
 * @property {string} hardware_mac MAC address of the Brain hardware
 * @property {string} hardware_model Model number of the Brain hardware
 * @property {string} hardware_serial_number Serial number of the Brain hardware
 * @property {string} hardware_version Version of the Brain hardware
 * @property {string} last_publish_date Date of the last publish for the space provisioned to the Brain
 * @property {string} last_synced_date Date of the last time the brain sync'd it's cache with the cloud
 * @property {string} project_id Project ID of the Kramer Control Project provisioned to this brain
 * @property {string} project_name Project Name of the Kramer Control Project provisioned to this brain
 * @property {string} project_time Project Time of the Kramer Control Project provisioned to this brain
 * @property {string} space_id Space ID of the Kramer Control Space provisioned to this brain
 * @property {string} space_name Space Name of the Kramer Control Space provisioned to this brain
 * @property {Object} sys_state Object containing a summary of the brain state
 */
export default class BrainInfo {
	constructor(info) {
		Object.assign(this, info);
	}
}
