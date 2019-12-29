const CLIENT_APP_NAME = '@kramer/brain-client',
	GOOGLE_APP_ID = 'UA-243284-44',
	USAGE_CONFIG = [
		GOOGLE_APP_ID, 
		{ 'app_name': CLIENT_APP_NAME, av: '1.0.0' }
	];

export default class UsageStatsClient {
	
	static loadWebSdkAsynchronously() {
		setTimeout(() => {
			((d, s, id) => {
				const element = d.getElementsByTagName(s)[0];
				const fjs = element;
				let js = element;
				if (d.getElementById(id)) { return; }
				js = d.createElement(s); js.id = id;
				js.src = `https://www.googletagmanager.com/gtag/js?id=${GOOGLE_APP_ID}`;
				fjs.parentNode.insertBefore(js, fjs);
			})(document, 'script', 'google-analytics');
		}, 1);

		window.dataLayer = window.dataLayer || [];
		function gtag(){
			window.dataLayer.push(arguments);
		}
		gtag('js', new Date());

		gtag('config', ...USAGE_CONFIG );

		return gtag;
	}

	static init() {

		// Don't track if not production
		if(process.env.NODE_ENV !== 'production') {
			return () => {};
		}

		if(typeof window !== 'undefined' && window) {
			this._web = this.loadWebSdkAsynchronously();
		} else {
			// const UsageStats = require('usage-stats');
			// this._server = new UsageStats(...USAGE_CONFIG);
		}
	}

	static track(method, args) {

		if(this._web) {
			const gtag = this._web;
			gtag('event', 'screen_view', { 
				screen_name: 'BrainClient'
			})
			gtag('event', method, {
				event_category: 'engagement',
				// event_label: '',
			});
		}

		if (this._server) {
			this._server.screenView('BrainClient')
			this._server.event('engagement', method, args)
			this._server.send()
		}
	}
}

UsageStatsClient.init();