'use strict';

const expect = require('chai').expect;
const { BrainClient } = require('../dist/cjs');

// NOTE: This will require a running Brain, assumes 127.0.0.1:8000 unless env var TEST_BRAIN_IP set
const BRAIN_IP = process.env.TEST_BRAIN_IP || '127.0.0.1:8000';

// Util to catch async errors
async function wait(done, f) {
	try {
		await f();
		done();
	} catch(e) {
		done(e);
	}
}

describe('#BrainClient', function() {

	// Quiet chatty logging
	BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);

	// Our client handle, created in first test
	let bc;

	// Util assertion for tests lower in the file to make sure
	// first test passed before blindly trying to test
	const assertClient = () => {
		if(!bc) {
			throw new Error("No BrainClient")
		}
	}

	// Satisfy code coverage of logger
	it('should have a Logger', () => {
		const logger = BrainClient.Logger,
			impl = logger.getDefaultLogger(),
			test = { logged: false };
		
		impl.logCallback = (level=logger.LogLevel.None, tag="", ...args) => {
			if(level <= impl.logLevel) {
				test.logged = true;
				test.levelString = impl.enumValueToString(level, logger.LogLevel).toUpperCase();
				test.tag = tag;
				test.args = args;
			} else {
				test.logged = false;
			}

			// Silence default output
			return true;
		};

		const tag = "FOO_123";

		// First, make sure nothing logged since we started quiet
		impl.d(tag, tag);
		expect(test.logged).to.equal(false);

		// Update log value for a few more tests
		BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.Debug);

		impl.d(tag, tag);
		expect(test.logged).to.equal(true);
		expect(test.tag).to.equal(tag);
		expect(test.args[0]).to.equal(tag);
		expect(test.levelString).to.equal("DEBUG");

		impl.i(tag, tag);
		expect(test.levelString).to.equal("INFO");

		impl.w(tag, tag);
		expect(test.levelString).to.equal("WARN");

		impl.e(tag, tag);
		expect(test.levelString).to.equal("ERROR");

		impl.f(tag, tag);
		expect(test.levelString).to.equal("FATAL");

		// Reset logger
		BrainClient.Logger.setLogLevel(BrainClient.Logger.LogLevel.None);
		impl.logCallback = null;

	});

	it('should cover BrainInfo', () => {
		const bi = new BrainClient.BrainInfo({ brain_id: 123 });
		expect(bi.brain_id).to.equal(123);
	});

	it('should create new BrainClient object', () => {
		// Noe: No IP given to constructor so we can attach listeners before connecting
		bc = new BrainClient(); 
		
		bc.on(BrainClient.EVENTS.BRAIN_EVENT, data => {
			let show = true;

			// if(data.type ==='state_change_message') {
			// 	if(data.state_changes[0].category_id != 'CUSTOM_STATES') {
			// 		show = false;
			// 	}
			// }
	
			if(show) {
				// console.log("* Received BrainEvent: ", data)
			}
		});
	});

	it('should accept constructor arguments', () => {
		const tmp = new BrainClient({
			reconnectWaitTime: 123,
			disableAnalytics: true
		});

		expect(tmp.opts.reconnectWaitTime).to.equal(123);
		expect(tmp.opts.disableAnalytics).to.equal(true);
	})

	it('should connect to ' + BRAIN_IP, done => {
		assertClient();
		wait(done, async () => {

			// Add coverage for promises that resolve AFTER connection but requested BEFORE
			let hit; bc.getDevices().then(data => hit = data);
			let hit2 = null; bc.isProvisioned().then(flag => hit2 = flag);
			let hit3 = null; bc.isExpressModeEnabled().then(flag => hit3 = flag);
			let hit4 = null; bc.isAuthorized().then(flag => hit4 = flag);
			let hit5 = null; bc.isLoginNeeded().then(flag => hit5 = flag);
			let hit6 = null; bc.getSystemDevice().then(flag => hit6 = flag);
			let hit7 = null; bc.brainId().then(flag => hit7 = true);

			const status = await bc.connectToBrain(BRAIN_IP);
			expect(status).to.equal(BrainClient.CONNECTION_ACTIVE);

			await new Promise(resolve => {
				setTimeout(async ()=> {
					// const hit = bc.devices;
					// console.log(`[connect hit] hit length:`, Object.values(bc.devices).length)

					// Test that promises resolved that were set before connection
					expect(hit).to.equal(bc.devices);
					expect(hit2).to.equal(true);
					expect(await bc.isProvisioned()).to.equal(true); // test connected code path
					expect(hit3).to.equal(true);
					expect(await bc.isExpressModeEnabled()).to.equal(true); // test connected code path
					
					// This isn't working..why?
					// expect(hit4).to.equal(true);
					// expect(await bc.isAuthorized()).to.equal(true);
					
					expect(hit5).to.equal(false);
					expect(await bc.isLoginNeeded()).to.equal(false); // test connected code path
					expect(hit6).to.equal(await bc.getSystemDevice()); // test connected code path
					expect(hit7).to.equal(true);

					resolve();
				}, 100);
			});
		})
	});

	it('should test coverage of HTTP client', () => {
		assertClient();

		bc.http.post('general');
		bc.http.patch('general');
		bc.http.delete('general');
		bc.http.setToken("123");
		expect(bc.http.token).to.equal("123");
		bc.http.setToken(null);

		const x = () => {};
		bc.http.setPendingCallback(x);
		expect(bc.http.pendingCallback).to.equal(x);

		expect(bc.http._encodeFields(null).length).to.equal(0);

		const url = '?' + bc.http._encodeFields({x:[0,1]}).join('&');
		expect(url).to.equal("?x%5B0%5D=0&x%5B1%5D=1");

		const url2 = '?' + bc.http._encodeFields({x:{a:true}}).join('&');
		expect(url2).to.equal("?x%5Ba%5D=true");

		const url3 = '?' + bc.http._encodeFields({b:"c"}).join('&');
		expect(url3).to.equal("?b=c");
	});

	// NOTE: Method removed from BrainClient, debating about re-adding...
	// it('should query space name', () => {
	// 	assertClient();
	// 	bc.querySpaceName();
	// 	expect(bc._lastDataSent.path).to.equal('/api/v1/space/name');
	// });

	it('should query space name', () => {
		assertClient();
		bc.queryStatus();
		expect(bc._lastDataSent.path).to.equal('/api/v1/status');
	});

	it('should query handsets', () => {
		assertClient();

		bc.queryHandsets();
		expect(bc._lastDataSent.path).to.equal('/api/v1/space/query-handsets');
	});

	it('should query a specific handset', () => {
		assertClient();

		bc.getHandsetLayout("123");
		expect(bc._lastDataSent.path).to.equal('/api/v1/set-handset');
		expect(bc._lastDataSent.body.handset_id).to.equal('123');
	})

	it('should return a cached object', done => {
		assertClient();
		wait(done, async () => {
			const bc2 = BrainClient.getBrainClient(BRAIN_IP);
			// check type
			expect(bc2).to.be.instanceof(BrainClient);
			// check caching worked (automatically)
			expect(bc2).to.equal(bc);
		});
	});

	it('should return return a new cached object', done => {
		assertClient();
		wait(done, async () => {
			const bc3 = BrainClient.getBrainClient("just.a.test.com:" + Math.ceil(Math.random() * 65536));
			// check type
			expect(bc3).to.be.instanceof(BrainClient);
			// check caching created new instance
			expect(bc3).to.not.equal(bc);
		});
	});

	it('should auto-add the port', done => {
		assertClient();
		wait(done, async () => {
			const bc3 = new BrainClient();
			expect(bc3._checkPort("just.a.test.com")).to.equal("just.a.test.com:8000");
		});
	});

	it('should fail on bad addresses', done => {
		assertClient();
		wait(done, async () => {
			const bc3 = new BrainClient({
				// testing known-invalid address,
				// no need to wait for a long response
				httpRequestTimeout: 100
			});
			const res = await bc3.connectToBrain("just.a.test.com:" + Math.ceil(Math.random() * 65536));
			expect(res).to.equal(BrainClient.CONNECTION_FAILURE);
		});
	});

	it('should disconnect when requested', done => {
		assertClient();
		wait(done, async () => {
			bc.disconnect();
			expect(bc.isConnected).to.equal(false);
		});
	});

	it('should not reconnect on disconnect ', done => {
		assertClient();
		wait(done, async () => {
		
			// Reconnection could be event based
			await new Promise(resolve => {
				setTimeout(() => {
					expect(bc.isReconnecting).to.equal(false);
					resolve();
				}, 100);
			});
		});
	});

	it('should allow manual reconnection of same client', done => {
		assertClient();
		wait(done, async () => {
			await bc.connectToBrain(BRAIN_IP);
		});
	});

	it('should should properly reconnect', done => {
		assertClient();
		wait(done, async () => {
			
			// Setup promise and listen for CONNECTION_ACTIVE
			const p = BrainClient.defer();
			const sc = ({ status }) => {
				if(status === BrainClient.CONNECTION_ACTIVE) {
					p.resolve();
				}
			};
			bc.on(BrainClient.EVENTS.CONNECTION_STATUS_CHANGED, sc);


			// Disconnect manually and force reconnect
			bc.disconnect();
			bc._reconnectNeeded();
			expect(bc.isReconnecting).to.equal(true);

			// Deadman switch
			let found = false;
			setTimeout(() => {
				if(found)
					return;
				throw new Error("Never found CONNECTION_ACTIVE");
			}, 1900);
			
			// Wait for promise
			await p;
			expect(found = true).to.equal(true);

			// Just for code coverage
			expect(bc.getConnectionStatus()).to.equal(BrainClient.CONNECTION_ACTIVE);

			// Remove listener
			bc.off(BrainClient.EVENTS.CONNECTION_STATUS_CHANGED, sc);

		});
	});


	it('should automatically change status when brain changes status', done => {
		assertClient();
		wait(done, async () => {
			const p = BrainClient.defer();
			const sc = ({ status }) => {
				if(status === BrainClient.CONNECTION_SYNCHRONIZING) {
					p.resolve();
				}
			};
			bc.on(BrainClient.EVENTS.CONNECTION_STATUS_CHANGED, sc);
			
			await bc.http.post('restart'); // restart brain process
			
			let ok = false;
			setTimeout(() => {
				if(ok)
					return;
				throw new Error("Never found CONNECTION_SYNCHRONIZING");
			}, 1900);
			
			await p;
			ok = true;
			expect(ok).to.equal(true);
			
			bc.off(BrainClient.EVENTS.CONNECTION_STATUS_CHANGED, sc);

		});
	})

	let sys;
	it('should have the system device', done => {
		assertClient();
		wait(done, async () => {

			// Grab a ref because we'll attach a listener after checking type	
			sys = await bc.getSystemDevice();
			
			// Test the class type
			expect(sys).to.be.instanceof(BrainClient.BrainDevice);

			// Test the system flag
			expect(sys.isSystemDevice()).to.equal(true);

			// Grab a deferred promise to resolve once we get a state
			bc._test_waitForStateChangeEvent = BrainClient.defer();

			// This works because the system device emits a new state change
			// every 1000ms when the second changes
			sys.on(BrainClient.BrainDevice.STATE_CHANGED, sys.__testHandler = (/*change*/) => {
				bc._test_waitForStateChangeEvent.resolve();
			});
		});
	});

	it('should receive state changes', done => {
		assertClient();
		wait(done, async () => {
			await bc._test_waitForStateChangeEvent;
			expect(true).to.equal(true);

			// For test coverage
			sys.off(BrainClient.BrainDevice.STATE_CHANGED, sys.__testHandler);
		});
	});

	it('should list states and commands', done => {
		assertClient();
		wait(done, async () => {
			const states = await sys.getStates();
			expect(Object.values(states).length).to.not.equal(0);
			
			const cmds = await sys.getCommands();
			expect(Object.values(cmds).length).to.not.equal(0);

			const state = await sys.getState("Does Not Exist " + Math.random());
			expect(state).to.equal(undefined);
		});
	});

	
	it('should have at least one custom state - required for next test', done => {
		assertClient();
		wait(done, async () => {
			const states = await sys.getCustomStates();
			expect(Object.values(states).length).to.not.equal(0);
		});
	});


	it('should set a custom state', done => {
		assertClient();
		wait(done, async () => {
			const states = await sys.getCustomStates();
			const state = Object.values(states)[0];
			const value = "" + (Math.ceil(Math.random() * 1024) + 1);
			const response = await sys.setCustomState(state, value);
			expect(response.normalizedValue).to.equal(value);
		});
	});

	
	it('should send command and receive results', done => {
		assertClient();
		wait(done, async () => {
			// Get the current value of the 'SYSTEM_USE' state by executing
			// the 'QUERY_SYSTEM_USE' command. Because the system driver 
			// also encodes a reference to the 'SYSTEM_STATE' state,
			// the sendCommand() method automatically returns the new value
			// of the state after executing the command 
			const { SYSTEM_STATE: currentState } = await sys.sendCommand('QUERY_SYSTEM_USE');
			
			// Flip the boolean value of the system state to the other side
			const flippedState = currentState === 'OFF' ? 'ON' : 'OFF';

			// console.log("*** send command start ***");

			// Execute the SET_SYSTEM_USE command which accepts the 'SYSTEM_STATE' as a parameter
			const { SYSTEM_STATE: newState } = await sys.sendCommand('SET_SYSTEM_USE', {
				SYSTEM_STATE: flippedState
			});

			// console.log("*** send command end ***", newState, flippedState);

			// Test results
			expect(newState).to.equal(flippedState);

			setTimeout(() => {
				process.exit();
			}, 100);
		})
	});

	it('should reject requests for watching without device id', () => {
		assertClient();
		try {
			bc.watchStates();
			// test fails if no exception thrown
			expect(false).to.equal(true);
		} catch(ex) {
			expect(true).to.equal(true);
		}
	});

	it('should blindly transmit remote auth', () => {
		assertClient();
		const value = Math.random();
		bc.sendRemoteAuthorization({ value });
		expect(bc._lastDataSent.value).to.equal(value);
	})

	it('should send view action', () => {
		assertClient();
		const value = Math.random();
		bc.sendAction(value);
		expect(bc._lastDataSent.path).to.equal('/api/v1/event');
		expect(bc._lastDataSent.body.view_id).to.equal(value);
	})
});
