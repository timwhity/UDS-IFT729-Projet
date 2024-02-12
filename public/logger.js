class Logger {

	/* Console : log uniquement dans la console, Alert : log console + alerte en cas de warn ou error */
	LEVELS = ['DEBUG', 'INFO', 'WARN', 'ERROR'];
	MODES = ['CONSOLE', 'FILE', 'ALERT'];


	constructor(level, mode) {
		if (!this.LEVELS.includes(level)) {
			throw new Error('Invalid level');
		}
		if (!this.MODES.includes(mode)) {
			throw new Error('Invalid mode');
		}

		this.mode = mode;
		this.level = level;

		this.debug('Logger initialized');
	}

	intern_log(message, level) {
		switch (this.mode) {
			case 'ALERT':
				if (level === 'ERROR' || level === 'WARN') {
					alert(message);
				}
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
		this.intern_log(level + " » " + message, level);
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