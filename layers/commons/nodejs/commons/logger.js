class Logger {
    constructor(logLevel) {
        // 4 levels 
        //1. DEBUG, 2.INFO, 3.ERROR, 4.OFF
        if(logLevel == 'DEBUG')
            this.level = 1;
        else if(logLevel == 'INFO')
            this.level = 2;
        else if(logLevel == 'ERROR')
            this.level = 3;
        else if(logLevel == 'OFF')
            this.level = 4;
        else
            this.level = 2;
    }
    debug(text) {
        if(this.level <= 1)
            console.log.apply(null,arguments);
    }
    info(text) {
        if(this.level <= 2)
            console.log.apply(null,arguments);
    }
    error(text) {
        if(this.level <= 3)
            console.error.apply(null,arguments);
    }
}

exports.Logger = Logger;