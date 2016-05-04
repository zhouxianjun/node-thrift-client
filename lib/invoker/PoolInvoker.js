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
const Q = require('q');
const domain = require('domain');
const Pool = require('generic-pool').Pool;
const logger = require('../util/LogUtils').log();
const prop = {
    pool: null,
    service: null,
    address: null
};
function create(name, type, options) {
    let connection = thrift.createConnection(this.host, this.port, options);
    let processor = new thrift.Multiplexer();
    return processor.createClient(name, type, connection);
}
module.exports = class PoolInvoker extends require('./AbstractInvoker') {
    constructor(service, address, interfaceClass, transportClass, protocolClass, maxActive, idleTime) {
        super(address, interfaceClass);
        let self = this;
        prop.service = service;
        prop.address = address;
        prop.pool = new Pool({
            name: 'thrift-client',
            create(callback) {
                callback(null, create.bind(self)(service, interfaceClass, {
                    transport: transportClass,
                    protocol: protocolClass
                }));
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
        let defer = Q.defer();
        prop.pool.acquire((err, client) => {
            if (err) {
                logger.error('get %s:%s pool error', prop.service, prop.address, err);
                return;
            }
            try {
                args.push((err, result) => {
                    let d = domain.create();
                    d.on('error', err => {logger.error('invoker service:%s address:%s method: %s error', prop.service, prop.address, method, err)});
                    if (err) {
                        d.run(() => {defer.reject(err);});
                        return;
                    }
                    d.run(() => {defer.resolve(result);});
                });
                Reflect.apply(client[method], client, args);
            } finally {
                prop.pool.release(client);
            }
        }, 0);
        return defer.promise;
    }
    destroy() {
        prop.pool.drain(() => {prop.pool.destroyAllNow(null);});
    }
};