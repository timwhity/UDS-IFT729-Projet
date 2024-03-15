class ServerLogger {

	LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
	MODES = ['CONSOLE', 'FILE'];

	constructor(level, mode, prefix = "Server") {
		if (!this.LEVELS.includes(level)) {
			throw new Error('Invalid level');
		}
		if (!this.MODES.includes(mode)) {
			throw new Error('Invalid mode');
		}

		if (mode === 'FILE') {
			throw new Error('Not implemented yet');
		}

		this.mode = mode;
		this.level = level;
		this.prefix = prefix;

		this.debug('Logger initialized');
	}

	intern_log(message) {
		switch (this.mode) {
			case 'CONSOLE':
				console.log(message);
				break;
			case 'FILE':
				throw new Error('Not implemented yet');
				break;
		}
	}
	
	log(message, level) {
		if (!this.LEVELS.includes(level)) {
			throw new Error('Invalid level');
		}
		if (this.LEVELS.indexOf(level) < this.LEVELS.indexOf(this.level)) {
			return;
		}
		this.intern_log(level + " " + this.prefix + " » " + message);
	}

	debug(message) {
		this.log(message, 'DEBUG');
	}
	info(message) {
		this.log(message, 'INFO');
	}
	warn(message) {
		this.log(message, 'WARN');
	}
	error(message) {
		this.log(message, 'ERROR');
	}
}

module.exports = ServerLogger;