// Modified from http://lea.verou.me/2016/12/resolve-promises-externally-with-this-one-weird-trick/
export default function defer(cb = () => {}) {
	let res, rej;

	const promise = new Promise((resolve, reject) => {
		res = resolve;
		rej = reject;
		cb(resolve, reject);
	});

	promise.resolve = res;
	promise.reject  = rej;

	return promise;
};

/*
 * Simple async lock
 * 
 * @example
	const guard = new DeferLock();

	// later:
	await guard.lock(); // blocks if already locked
	// ...
	guard.unlock();

	// Elsewhere, for the thing you want to NOT do if guard already locked?
	await guard.lock(); // blocks if already locked
	// ...
	guard.unlock();

*/
export class DeferLock {
	/**
	 * Lock the lock. Blocks if already locked. 
	 */
	async lock(/*fail=false*/) {
		if(this._lock) {
			// if(fail) {
			// 	return false;
			// }
			await this._lock;
			this._lock = null;
		}
		this._lock = defer();
		return true;
	}

	/**
	 * Unlock the lock. Throws error if no lock.
	 * Marked async for easy adding of .catch() instead of having to wrap calls in try/catch
	 */
	async unlock() {
		if(!this._lock) {
			throw new Error("No lock");
		}
		this._lock.resolve();
		this._lock = null;
	}
}
