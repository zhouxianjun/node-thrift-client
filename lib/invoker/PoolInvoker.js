/**
 * Created with JetBrains Idea.
 * User: Gary
 * Date: 2016/4/29
 * Time: 16:34
 *                 _ooOoo_
 *                o8888888o
 *                88" . "88
 *                (| -_- |)
 *                O\  =  /O
 *             ____/`---'\____
 *           .'  \\|     |//  `.
 *           /  \\|||  :  |||//  \
 *           /  _||||| -:- |||||-  \
 *           |   | \\\  -  /// |   |
 *           | \_|  ''\---/''  |   |
 *           \  .-\__  `-`  ___/-. /
 *         ___`. .'  /--.--\  `. . __
 *      ."" '<  `.___\_<|>_/___.'  >'"".
 *     | | :  `- \`.;`\ _ /`;.`/ - ` : | |
 *     \  \ `-.   \_ __\ /__ _/   .-` /  /
 *======`-.____`-.___\_____/___.-`____.-'======
 *                   `=---='
 *^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
 *           佛祖保佑       永无BUG
 */
const thrift = require('thrift');
const Pool = require('generic-pool').Pool;
const prop = {
    pool: null
};
module.exports = class PoolInvoker extends require('./AbstractInvoker') {
    constructor(address, interfaceClass, transportClass, protocolClass, maxActive, idleTime) {
        super(address, interfaceClass);

        prop.pool = new Pool({
            name: 'thrift-client',
            create(callback) {

                this.connection = thrift.createConnection(, port, this.options);
                this.connection.on('error', function(err){console.error(err)});
                this.connection.on('reconnecting', function(){self.serviceCache.clear()});
                this.connection.on('close', function(){self.serviceCache.clear()});
                this.connection.on('connect', function(){
                    while (self.serviceJob.length > 0){
                        self.serviceJob.pop()();
                    }
                });
            },
            destroy(client) {

            },
            max: maxActive,
            idleTimeoutMillis: idleTime,
            log: true
        });
    }
    invoker() {

    }
    destroy() {
        prop.pool.drain(function() {
            prop.destroyAllNow();
        });
    }
};