const chalk = require('chalk');

module.exports = {
    info: (msg) => console.log(chalk.blue('ℹ [INFO] ') + chalk.gray(msg)),
    success: (msg) => console.log(chalk.green('✔ [SUCCESS] ') + chalk.white(msg)),
    error: (msg) => console.log(chalk.red('✖ [ERROR] ') + chalk.red.bold(msg)),
    command: (msg) => console.log(chalk.magenta('❖ [CMD] ') + chalk.whiteBright(msg))
};
