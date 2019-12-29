// Note: must be in order from least loggable to most loggable
// infers from < inequality
export const LogLevel = {
    None: 0,
    Fatal: 1,
    Error: 2,
    Warn: 3,
    Info: 4,
    Debug: 5
}

// Simple stub for later updating
export default class Logger {
	static getDefaultLogger() {
		return (this._impl || (this._impl = new LoggerImpl()))
	}

	static setLogLevel(level) {
        Logger.GlobalLogLevel = level;
        this.getDefaultLogger().logLevel = level;
    }		
}

Logger.LogLevel = LogLevel;

export function enumToStringArray(e) {
    let names = [];
    for (let p in e) {
        if (typeof e[p] === 'number') {
            names.push(p);
        }
    }
    return names;
}

export function enumValueToString(value, e) {
    let names = enumToStringArray(e);
    if (value > -1 && value < names.length) {
        return names[value];
    }
    return '';
}


class LoggerImpl {
	constructor() {
		this.logLevel = LogLevel.Debug;
		this.enumValueToString = enumValueToString;
	}

	log(level=LogLevel.None, tag="", ...args) {
		if(this.logCallback) {
			if(this.logCallback(level, tag, ...args)) {
				return;
			}
		}
		if(level <= this.logLevel) {
			console.log.apply(console, [ '[' + enumValueToString(level, LogLevel).toUpperCase() + ']', tag ].concat(args));
		}
	}

	f(tag, ...args) {
		this.log.apply(this, [ LogLevel.Fatal ].concat(Array.prototype.splice.call(arguments, 0)));
	}

	e(tag, ...args) {
		this.log.apply(this, [ LogLevel.Error ].concat(Array.prototype.splice.call(arguments, 0)));
	}

	w(tag, ...args) {
		this.log.apply(this, [ LogLevel.Warn ].concat(Array.prototype.splice.call(arguments, 0)));
	}

	i(tag, ...args) {
		this.log.apply(this, [ LogLevel.Info ].concat(Array.prototype.splice.call(arguments, 0)));
	}

	d(tag, ...args) {
		this.log.apply(this, [ LogLevel.Debug ].concat(Array.prototype.splice.call(arguments, 0)));
	}

}

