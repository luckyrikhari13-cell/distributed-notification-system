const timestamp = () => new Date().toISOString();
const log = (level, message, context) => {
  const output = `[${level} ${timestamp()} ${message}]`;

  if (context) {
    console[level.toLowerCase()](output, context);
  } else {
    console[level.toLowerCase()](output);
  }
};

const logger = {
  info: (message, context) => {
    log("INFO" , message , context);
  },
  warn: (message, context) => {
    log("WARN" ,message , context)
  },
  error: (message, context) => {
    log("ERROR",message,context)
  },
};

module.exports = logger;
