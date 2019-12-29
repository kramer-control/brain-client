export default async function promiseMap(list=null, next = (d, idx) => {}, debug=null) {
	const all = list || [],
		total = all.length,
		done  = [];

	let p = Promise.resolve();
	all.forEach((d, idx) => {
		p = p.then(() => next(d, idx)).then(result => {
			done.push(result);
			debug && console.log(`[_batchAll:${debug}] Done ${done.length} / ${total}`);
		});
	});
	await p;
	return done;
}

