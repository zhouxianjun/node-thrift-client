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
const assert = require('assert');
const Q = require('q');
const Pool = require('generic-pool').Pool;
const prop = {
    pool: null
};
function create(type, options) {
    let connection = thrift.createConnection(this.host, this.port, options);
    return thrift.createClient(type, connection);
}
module.exports = class PoolInvoker extends require('./AbstractInvoker') {
    constructor(address, interfaceClass, transportClass, protocolClass, maxActive, idleTime) {
        super(address, interfaceClass);
        let self = this;
        prop.pool = new Pool({
            name: 'thrift-client',
            create(callback) {
                callback(null, create(interfaceClass, {
                    transport: transportClass,
                    protocol: protocolClass
                }).bind(self));
            },
            destroy(client) {
                client.output && client.output.close();
                client.input && client.input.close();
            },
            max: maxActive,
            idleTimeoutMillis: idleTime,
            log: true
        });
    }
    invoker(method, ...args) {
        let defer = Q.defer;
        prop.pool.acquire(function(err, client) {
            assert.ifError(err);
            try {
                args.push(function(err, result) {
                    if (err) {
                        defer.reject(err);
                        return;
                    }
                    defer.resolve(result);
                });
                Reflect.apply(client[method], client, args);
            } finally {
                prop.pool.release(client);
            }
        }, 0);
        return defer.promise;
    }
    destroy() {
        prop.pool.drain(function() {
            prop.destroyAllNow(null);
        });
    }
};