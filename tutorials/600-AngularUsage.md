# Angular Usage

`BrainClient` provides a convenient method to provide all events from the client as an [RxJS](https://rxjs-dev.firebaseapp.com/) [Observable](https://rxjs-dev.firebaseapp.com/api/index/class/Observable).

> See [BrainClient.asObservable](./BrainClient.html#asObservable)

The shape of the message emitted by the Observable from this method looks like:
```javascript
const message = {
	event: "",
	...data
}
```
The `event` field above is always and only one of the values from [BrainClient.EVENTS](./BrainClient.html#.EVENTS).
The `data` spread operator above indicates that all other fields from the event (e.g. the args 
that would be passed to your event callback if you used the `on` method to attach callbacks) 
are spread into the `message`, so you receive a single flat-ish object. 


## Example Service

The `asObservable` method alone may make your life easier when integrating with Angular. You may also choose to use the event-based interface as well, if you prefer.

However, a pattern we often use internally when working with BrainClient and Angular is to create an `Injectable` service for your Angular app to consume. Here is a sample implementation of an Angular service that you are welcome to copy and modify to suite your needs.

```javascript
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Rx';
import { BrainClient } from '@kramerav/brain-client';

@Injectable()
export class BrainClientService {
	private _currentConnection: Observable<any>;
	private _client: <BrainClient>;

	constructor() {
		this._client = new BrainClient();
	}

	public connectToBrain(url: string): Observable<any> {
		this._currentConnection = this._client.connectToBrain(url).asObservable();
		
		return this.currentConnection;
	}

	get currentConnection(): Observable<any> {
		return this._currentConnection;
	}

	public closeSocket() {
		this._client.disconnect();
	}
}
```